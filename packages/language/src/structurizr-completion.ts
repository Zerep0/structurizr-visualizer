import {
    UriUtils,
    type AstNodeDescription,
    type FileSystemProvider,
    type LangiumDocument,
    type ReferenceInfo
} from 'langium';
import {
    DefaultCompletionProvider,
    type CompletionContext,
    type CompletionValueItem
} from 'langium/lsp';
import { isFragment } from './generated/ast.js';
import type { StructurizrServices } from './structurizr-module.js';
import type { StructurizrScopeProvider } from './structurizr-scope.js';
import type { StructurizrWorkspaceResolver } from './structurizr-workspace.js';

type StructurizrCompletionResult = Awaited<
    ReturnType<DefaultCompletionProvider['getCompletion']>
>;

/**
 * Adds Structurizr-specific reference completion on top of Langium's grammar
 * completion. In particular, fragments can begin with the source of a
 * relationship and hierarchical identifiers are completed one segment at a
 * time after `.`.
 */
export class StructurizrCompletionProvider extends DefaultCompletionProvider {
    override readonly completionOptions = {
        triggerCharacters: ['.', '/', '\\']
    };

    private readonly structurizrScopeProvider: StructurizrScopeProvider;
    private readonly workspaceResolver: StructurizrWorkspaceResolver;
    private readonly fileSystem: FileSystemProvider;

    constructor(services: StructurizrServices) {
        super(services);
        this.structurizrScopeProvider = services.references.ScopeProvider as StructurizrScopeProvider;
        this.workspaceResolver = services.workspace.StructurizrWorkspaceResolver;
        this.fileSystem = services.shared.workspace.FileSystemProvider;
    }

    override async getCompletion(
        document: Parameters<DefaultCompletionProvider['getCompletion']>[0],
        params: Parameters<DefaultCompletionProvider['getCompletion']>[1],
        cancelToken?: Parameters<DefaultCompletionProvider['getCompletion']>[2]
    ): Promise<StructurizrCompletionResult> {
        const completion = await super.getCompletion(document, params, cancelToken);
        const items = [...(completion?.items ?? [])];
        const existing = new Set(items.map(item => item.label));
        this.addPathCompletions(document, params.position, items, existing);
        this.addStyleValueCompletions(document, params.position, items, existing);

        if (this.isFragmentDocument(document)) {
            const source = this.getRelationshipSourcePrefix(document, params.position);
            if (source) {
                for (const description of this.structurizrScopeProvider
                    .getElementDescriptions(document.parseResult.value)) {
                    if (
                        existing.has(description.name)
                        || !description.name.toLowerCase().startsWith(source.partial.toLowerCase())
                    ) {
                        continue;
                    }
                    existing.add(description.name);
                    items.push({
                        label: description.name,
                        detail: description.type,
                        sortText: '0',
                        textEdit: {
                            newText: description.name,
                            range: {
                                start: document.textDocument.positionAt(source.startOffset),
                                end: params.position
                            }
                        }
                    });
                }
            }

            const operatorOffset = this.getRelationshipOperatorOffset(document, params.position);
            if (operatorOffset !== undefined) {
                for (const operator of ['->', '-/>']) {
                    if (existing.has(operator)) {
                        continue;
                    }
                    existing.add(operator);
                    items.push({
                        label: operator,
                        detail: 'Relationship operator',
                        sortText: '0',
                        textEdit: {
                            newText: operator,
                            range: {
                                start: document.textDocument.positionAt(operatorOffset),
                                end: params.position
                            }
                        }
                    });
                }
            }
        }

        return {
            isIncomplete: completion?.isIncomplete ?? false,
            items
        };
    }

    protected override createReferenceCompletionItem(
        description: AstNodeDescription,
        referenceInfo: ReferenceInfo,
        context: CompletionContext
    ): CompletionValueItem {
        const item = super.createReferenceCompletionItem(description, referenceInfo, context);
        const qualified = getQualifiedCompletion(context);
        if (!qualified || !description.name.startsWith(`${qualified.owner}.`)) {
            return item;
        }

        const remainder = description.name.slice(qualified.owner.length + 1);
        const label = remainder.split('.')[0];
        return {
            ...item,
            label,
            insertText: label,
            filterText: label,
            textEdit: {
                newText: label,
                range: {
                    start: context.textDocument.positionAt(
                        context.offset - qualified.partial.length
                    ),
                    end: context.position
                }
            }
        };
    }

    private isFragmentDocument(document: LangiumDocument): boolean {
        const root = document.parseResult.value;
        return isFragment(root) || this.workspaceResolver.getIncomingIncludes(root).length > 0;
    }

    private addPathCompletions(
        document: LangiumDocument,
        position: Parameters<DefaultCompletionProvider['getCompletion']>[1]['position'],
        items: NonNullable<StructurizrCompletionResult>['items'],
        existing: Set<string>
    ): void {
        const context = getPathCompletionContext(document, position);
        if (!context || /^https?:\/\//i.test(context.path)) {
            return;
        }

        const separator = Math.max(
            context.path.lastIndexOf('/'),
            context.path.lastIndexOf('\\')
        );
        const directoryPart = separator >= 0 ? context.path.slice(0, separator + 1) : '';
        const partial = separator >= 0 ? context.path.slice(separator + 1) : context.path;
        const baseUri = UriUtils.dirname(document.uri);
        const directoryUri = directoryPart.length > 0
            ? UriUtils.resolvePath(baseUri, directoryPart.replace(/\\/g, '/'))
            : baseUri;

        let entries;
        try {
            entries = this.fileSystem.readDirectorySync(directoryUri);
        } catch {
            return;
        }

        entries
            .filter(entry => isPathCandidate(entry, context.kind))
            .map(entry => ({
                entry,
                name: `${UriUtils.basename(entry.uri)}${entry.isDirectory ? '/' : ''}`
            }))
            .filter(candidate =>
                candidate.name.toLowerCase().startsWith(partial.toLowerCase())
                && (context.quoted || !/\s/.test(candidate.name))
            )
            .sort((left, right) => {
                if (left.entry.isDirectory !== right.entry.isDirectory) {
                    return left.entry.isDirectory ? -1 : 1;
                }
                return left.name.localeCompare(right.name);
            })
            .forEach(candidate => {
                if (existing.has(candidate.name)) {
                    return;
                }
                existing.add(candidate.name);
                items.push({
                    label: candidate.name,
                    detail: candidate.entry.isDirectory ? 'Directory' : pathDetail(context.kind),
                    sortText: candidate.entry.isDirectory ? '0' : '1',
                    filterText: candidate.name,
                    textEdit: {
                        newText: candidate.name,
                        range: {
                            start: document.textDocument.positionAt(context.offset - partial.length),
                            end: position
                        }
                    }
                });
            });
    }

    private addStyleValueCompletions(
        document: LangiumDocument,
        position: Parameters<DefaultCompletionProvider['getCompletion']>[1]['position'],
        items: NonNullable<StructurizrCompletionResult>['items'],
        existing: Set<string>
    ): void {
        const offset = document.textDocument.offsetAt(position);
        const text = document.textDocument.getText();
        const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
        const line = text.slice(lineStart, offset);
        const match = /^[\t ]*(shape|iconPosition|border|style|routing|metadata|description|jump|dashed)[\t ]+([_A-Za-z][_A-Za-z0-9]*)?$/i.exec(line);
        if (!match) {
            return;
        }

        const property = match[1].toLowerCase();
        const partial = match[2] ?? '';
        for (const value of STYLE_VALUE_COMPLETIONS[property] ?? []) {
            if (
                existing.has(value)
                || !value.toLowerCase().startsWith(partial.toLowerCase())
            ) {
                continue;
            }
            existing.add(value);
            items.push({
                label: value,
                detail: 'Structurizr style value',
                sortText: '0',
                textEdit: {
                    newText: value,
                    range: {
                        start: document.textDocument.positionAt(offset - partial.length),
                        end: position
                    }
                }
            });
        }
    }

    private getRelationshipSourcePrefix(
        document: LangiumDocument,
        position: Parameters<DefaultCompletionProvider['getCompletion']>[1]['position']
    ): { partial: string; startOffset: number } | undefined {
        const offset = document.textDocument.offsetAt(position);
        const text = document.textDocument.getText();
        const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
        const line = text.slice(lineStart, offset);
        const match = /^(?:[\t ]*)([_A-Za-z][_A-Za-z0-9.]*)?$/.exec(line);
        if (!match) {
            return undefined;
        }
        const partial = match[1] ?? '';
        return {
            partial,
            startOffset: offset - partial.length
        };
    }

    private getRelationshipOperatorOffset(
        document: LangiumDocument,
        position: Parameters<DefaultCompletionProvider['getCompletion']>[1]['position']
    ): number | undefined {
        const offset = document.textDocument.offsetAt(position);
        const text = document.textDocument.getText();
        const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
        const line = text.slice(lineStart, offset);
        if (!/^[\t ]*(?:this|[_A-Za-z][_A-Za-z0-9.]*)[\t ]+$/i.test(line)) {
            return undefined;
        }
        return offset;
    }
}

const STYLE_VALUE_COMPLETIONS: Readonly<Record<string, readonly string[]>> = {
    shape: [
        'Box',
        'RoundedBox',
        'Circle',
        'Ellipse',
        'Hexagon',
        'Diamond',
        'Cylinder',
        'Bucket',
        'Pipe',
        'Person',
        'Robot',
        'Folder',
        'WebBrowser',
        'Window',
        'Terminal',
        'Shell',
        'MobileDevicePortrait',
        'MobileDeviceLandscape',
        'Component'
    ],
    iconposition: ['Top', 'Bottom', 'Left'],
    border: ['solid', 'dashed', 'dotted'],
    style: ['solid', 'dashed', 'dotted'],
    routing: ['Direct', 'Curved', 'Orthogonal'],
    metadata: ['true', 'false'],
    description: ['true', 'false'],
    jump: ['true', 'false'],
    dashed: ['true', 'false']
};

type PathCompletionKind = 'include' | 'workspace' | 'docs' | 'adrs' | 'icon' | 'theme';

interface PathCompletionContext {
    kind: PathCompletionKind;
    path: string;
    quoted: boolean;
    offset: number;
}

function getPathCompletionContext(
    document: LangiumDocument,
    position: Parameters<DefaultCompletionProvider['getCompletion']>[1]['position']
): PathCompletionContext | undefined {
    const offset = document.textDocument.offsetAt(position);
    const text = document.textDocument.getText();
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
    const line = text.slice(lineStart, offset);
    const match = /^[\t ]*(workspace[\t ]+extends|!include|!docs|!adrs|!decisions|icon|theme)[\t ]+(?:(["'])([^"']*)|([^\s]*))$/i.exec(line);
    if (!match) {
        return undefined;
    }

    const directive = match[1].toLowerCase();
    const kinds: Record<string, PathCompletionKind> = {
        '!include': 'include',
        'workspace extends': 'workspace',
        '!docs': 'docs',
        '!adrs': 'adrs',
        '!decisions': 'adrs',
        icon: 'icon',
        theme: 'theme'
    };
    return {
        kind: kinds[directive],
        path: match[3] ?? match[4] ?? '',
        quoted: match[2] !== undefined,
        offset
    };
}

function isPathCandidate(
    entry: ReturnType<FileSystemProvider['readDirectorySync']>[number],
    kind: PathCompletionKind
): boolean {
    if (entry.isDirectory) {
        return true;
    }
    if (!entry.isFile || kind === 'docs' || kind === 'adrs') {
        return false;
    }

    const extension = UriUtils.extname(entry.uri).toLowerCase();
    switch (kind) {
        case 'include':
            return extension === '.dsl';
        case 'workspace':
            return extension === '.dsl' || extension === '.json';
        case 'icon':
            return ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extension);
        case 'theme':
            return extension === '.json';
        default:
            return false;
    }
}

function pathDetail(kind: PathCompletionKind): string {
    switch (kind) {
        case 'include':
            return 'Structurizr DSL file';
        case 'workspace':
            return 'Structurizr workspace';
        case 'icon':
            return 'Image file';
        case 'theme':
            return 'Theme file';
        default:
            return 'File';
    }
}

function getQualifiedCompletion(
    context: CompletionContext
): { owner: string; partial: string } | undefined {
    const text = context.textDocument.getText().slice(0, context.offset);
    const match = /([_A-Za-z][_A-Za-z0-9]*(?:\.[_A-Za-z][_A-Za-z0-9]*)*)\.([_A-Za-z][_A-Za-z0-9]*)?$/.exec(text);
    if (!match) {
        return undefined;
    }
    return {
        owner: match[1],
        partial: match[2] ?? ''
    };
}

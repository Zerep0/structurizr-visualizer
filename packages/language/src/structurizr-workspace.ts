import {
    AstUtils,
    URI,
    UriUtils,
    type AstNode,
    type FileSystemProvider,
    type LangiumCoreServices,
    type LangiumDocument
} from 'langium';
import {
    isIncludeDirective,
    type IncludeDirective
} from './generated/ast.js';

/**
 * Resolves the local dependency graph formed by !include directives.
 *
 * The resolver only observes documents already managed by Langium, so unsaved
 * editor content wins over filesystem content. It never fetches remote URLs.
 */
export class StructurizrWorkspaceResolver {
    private readonly documents;
    private readonly fileSystem: FileSystemProvider;

    constructor(services: LangiumCoreServices) {
        this.documents = services.shared.workspace.LangiumDocuments;
        this.fileSystem = services.shared.workspace.FileSystemProvider;
    }

    getConnectedDocuments(node: AstNode): LangiumDocument[] {
        const document = AstUtils.getDocument(node);
        const allDocuments = this.getManagedDocumentsWithIncludes();
        const documentsByUri = new Map(
            allDocuments.map(candidate => [UriUtils.normalize(candidate.uri), candidate])
        );
        const adjacency = this.buildAdjacency(allDocuments, documentsByUri);
        const visited = new Set<string>();
        const pending = [UriUtils.normalize(document.uri)];

        while (pending.length > 0) {
            const uri = pending.pop()!;
            if (visited.has(uri)) {
                continue;
            }
            visited.add(uri);
            for (const adjacent of adjacency.get(uri) ?? []) {
                if (!visited.has(adjacent)) {
                    pending.push(adjacent);
                }
            }
        }

        return [...visited]
            .map(uri => documentsByUri.get(uri))
            .filter((candidate): candidate is LangiumDocument => candidate !== undefined)
            .sort((left, right) => left.uri.toString().localeCompare(right.uri.toString()));
    }

    getIncomingIncludes(node: AstNode): IncludeDirective[] {
        const targetDocument = AstUtils.getDocument(node);
        const targetUri = UriUtils.normalize(targetDocument.uri);
        const incoming: IncludeDirective[] = [];

        for (const document of this.getManagedDocumentsWithIncludes()) {
            for (const include of this.getIncludes(document)) {
                if (this.getIncludeTargetUris(include).some(uri => UriUtils.normalize(uri) === targetUri)) {
                    incoming.push(include);
                }
            }
        }
        return incoming;
    }

    getIncludeTargetUris(include: IncludeDirective): URI[] {
        const rawPath = typeof include.path === 'string' ? include.path.trim() : '';
        if (rawPath.length === 0) {
            return [];
        }

        if (/^https?:\/\//i.test(rawPath)) {
            return [URI.parse(rawPath)];
        }

        const source = AstUtils.getDocument(include).uri;
        const normalizedPath = rawPath.replace(/\\/g, '/');
        const target = UriUtils.resolvePath(UriUtils.dirname(source), normalizedPath);
        const managedTarget = this.documents.getDocument(target);
        if (managedTarget) {
            return [managedTarget.uri];
        }

        const managedChildren = [...this.documents.all]
            .filter(document => UriUtils.equals(UriUtils.dirname(document.uri), target))
            .map(document => document.uri);
        if (managedChildren.length > 0) {
            return managedChildren.sort((left, right) => left.toString().localeCompare(right.toString()));
        }

        try {
            const stat = this.fileSystem.statSync(target);
            if (stat.isDirectory) {
                return this.fileSystem.readDirectorySync(target)
                    .filter(child => child.isFile && UriUtils.extname(child.uri).toLowerCase() === '.dsl')
                    .map(child => child.uri)
                    .sort((left, right) => left.toString().localeCompare(right.toString()));
            }
        } catch {
            // Returning the unresolved target allows the validator to report a
            // precise diagnostic on the !include path.
        }

        return [target];
    }

    includeExists(include: IncludeDirective): boolean {
        const rawPath = typeof include.path === 'string' ? include.path.trim() : '';
        if (rawPath.length === 0) {
            return false;
        }
        if (/^https?:\/\//i.test(rawPath)) {
            return true;
        }
        return this.getIncludeTargetUris(include).some(uri =>
            this.documents.hasDocument(uri) || this.fileSystem.existsSync(uri)
        );
    }

    isCircular(include: IncludeDirective): boolean {
        const sourceUri = UriUtils.normalize(AstUtils.getDocument(include).uri);
        const allDocuments = this.getManagedDocumentsWithIncludes();
        const documentsByUri = new Map(
            allDocuments.map(document => [UriUtils.normalize(document.uri), document])
        );
        const adjacency = this.buildDirectedAdjacency(allDocuments, documentsByUri);

        for (const target of this.getIncludeTargetUris(include)) {
            const pending = [UriUtils.normalize(target)];
            const visited = new Set<string>();
            while (pending.length > 0) {
                const current = pending.pop()!;
                if (current === sourceUri) {
                    return true;
                }
                if (visited.has(current)) {
                    continue;
                }
                visited.add(current);
                pending.push(...(adjacency.get(current) ?? []));
            }
        }
        return false;
    }

    private buildAdjacency(
        documents: LangiumDocument[],
        documentsByUri: Map<string, LangiumDocument>
    ): Map<string, Set<string>> {
        const directed = this.buildDirectedAdjacency(documents, documentsByUri);
        const adjacency = new Map<string, Set<string>>();
        for (const [source, targets] of directed) {
            for (const target of targets) {
                addEdge(adjacency, source, target);
                addEdge(adjacency, target, source);
            }
        }
        return adjacency;
    }

    /**
     * Langium normally indexes every DSL file below a VS Code workspace, but a
     * single-file build (tests, CLI consumers, or a freshly opened document)
     * may initially manage only the root document. Follow existing local
     * includes here so linking does not depend on the files having been opened.
     */
    private getManagedDocumentsWithIncludes(): LangiumDocument[] {
        const documentsByUri = new Map(
            [...this.documents.all].map(document => [UriUtils.normalize(document.uri), document])
        );
        const pending = [...documentsByUri.values()];

        while (pending.length > 0) {
            const document = pending.pop()!;
            for (const include of this.getIncludes(document)) {
                for (const targetUri of this.getIncludeTargetUris(include)) {
                    const target = UriUtils.normalize(targetUri);
                    if (
                        documentsByUri.has(target)
                        || targetUri.scheme !== 'file'
                        || !this.fileSystem.existsSync(targetUri)
                    ) {
                        continue;
                    }

                    const targetDocument = this.documents.createDocument(
                        targetUri,
                        this.fileSystem.readFileSync(targetUri)
                    );
                    documentsByUri.set(target, targetDocument);
                    pending.push(targetDocument);
                }
            }
        }

        return [...documentsByUri.values()];
    }

    private buildDirectedAdjacency(
        documents: LangiumDocument[],
        documentsByUri: Map<string, LangiumDocument>
    ): Map<string, Set<string>> {
        const adjacency = new Map<string, Set<string>>();
        for (const document of documents) {
            const source = UriUtils.normalize(document.uri);
            for (const include of this.getIncludes(document)) {
                for (const targetUri of this.getIncludeTargetUris(include)) {
                    const target = UriUtils.normalize(targetUri);
                    if (documentsByUri.has(target)) {
                        addEdge(adjacency, source, target);
                    }
                }
            }
        }
        return adjacency;
    }

    private getIncludes(document: LangiumDocument): IncludeDirective[] {
        return [...AstUtils.streamAst(document.parseResult.value)]
            .filter(isIncludeDirective);
    }
}

function addEdge(graph: Map<string, Set<string>>, source: string, target: string): void {
    let targets = graph.get(source);
    if (!targets) {
        targets = new Set<string>();
        graph.set(source, targets);
    }
    targets.add(target);
}

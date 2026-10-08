import {
    DefaultNameProvider,
    DefaultScopeProvider,
    AstUtils,
    GrammarUtils,
    StreamScope,
    stream,
    type AstNode,
    type AstNodeDescription,
    type CstNode,
    type ReferenceInfo,
    type Scope
} from 'langium';
import {
    isDeploymentGroupDeclaration,
    isElementDeclaration,
    isIdentifierMode,
    isInstanceDeclaration,
    isRelationshipDeclaration,
    type ElementDeclaration
} from './generated/ast.js';
import type { StructurizrServices } from './structurizr-module.js';
import type { StructurizrWorkspaceResolver } from './structurizr-workspace.js';

type IdentifierNode = AstNode & { identifier?: string };

function isIdentifierNode(node: AstNode): node is IdentifierNode {
    return isElementDeclaration(node)
        || isInstanceDeclaration(node)
        || isRelationshipDeclaration(node)
        || isDeploymentGroupDeclaration(node);
}

/**
 * Structurizr identifiers are separate from the human-readable element name.
 * Making the identifier the Langium name enables semantic linking, completion,
 * definition, references, and rename without string searching.
 */
export class StructurizrNameProvider extends DefaultNameProvider {
    override getName(node: AstNode): string | undefined {
        return isIdentifierNode(node) ? node.identifier : super.getName(node);
    }

    override getNameNode(node: AstNode): CstNode | undefined {
        if (isIdentifierNode(node)) {
            return GrammarUtils.findNodeForProperty(node.$cstNode, 'identifier');
        }
        return super.getNameNode(node);
    }
}

/**
 * The official DSL's flat identifier mode exposes all element identifiers
 * throughout a workspace. Hierarchical mode exposes qualified names such as
 * `system.container`, with an unqualified child name available in its own
 * containing element.
 */
export class StructurizrScopeProvider extends DefaultScopeProvider {
    private readonly workspaceResolver: StructurizrWorkspaceResolver;

    constructor(services: StructurizrServices) {
        super(services);
        this.workspaceResolver = services.workspace.StructurizrWorkspaceResolver;
    }

    override getScope(context: ReferenceInfo): Scope {
        return new StreamScope(stream(this.getElementDescriptions(context.container)));
    }

    getElementDescriptions(context: AstNode): AstNodeDescription[] {
        const visibleDocuments = this.workspaceResolver.getConnectedDocuments(context);
        const hierarchical = visibleDocuments
            .flatMap(document => [...AstUtils.streamAst(document.parseResult.value)])
            .filter(isIdentifierMode)
            .some(mode => mode.mode === 'hierarchical');
        const descriptions = [];

        for (const document of visibleDocuments) {
            for (const candidate of AstUtils.streamAst(document.parseResult.value)) {
                if (!isElementDeclaration(candidate) || !candidate.identifier) {
                    continue;
                }

                const qualifiedNames = hierarchical
                    ? getQualifiedIdentifiers(candidate, this.workspaceResolver)
                    : [candidate.identifier];
                for (const qualifiedName of qualifiedNames) {
                    descriptions.push(
                        this.descriptions.createDescription(candidate, qualifiedName, document)
                    );
                }

                if (
                    hierarchical
                    && qualifiedNames.some(name => name !== candidate.identifier)
                    && isLocallyVisible(context, candidate)
                ) {
                    descriptions.unshift(
                        this.descriptions.createDescription(candidate, candidate.identifier, document)
                    );
                }
            }
        }

        return descriptions;
    }
}

export function getQualifiedIdentifier(node: ElementDeclaration): string {
    const segments = node.identifier ? [node.identifier] : [];
    let container: AstNode | undefined = node.$container;
    while (container) {
        if (isElementDeclaration(container) && container.identifier) {
            segments.unshift(container.identifier);
        }
        container = container.$container;
    }
    return segments.join('.');
}

export function getQualifiedIdentifiers(
    node: ElementDeclaration,
    workspaceResolver: StructurizrWorkspaceResolver
): string[] {
    const localName = getQualifiedIdentifier(node);
    const document = AstUtils.getDocument(node);
    const prefixes = getDocumentPrefixes(document.parseResult.value, workspaceResolver, new Set());
    return unique(
        prefixes.map(prefix => prefix.length > 0 ? `${prefix}.${localName}` : localName)
    );
}

function getDocumentPrefixes(
    root: AstNode,
    workspaceResolver: StructurizrWorkspaceResolver,
    visiting: Set<string>
): string[] {
    const document = AstUtils.getDocument(root);
    const documentKey = document.uri.toString();
    if (visiting.has(documentKey)) {
        return [];
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(documentKey);
    const incomingIncludes = workspaceResolver.getIncomingIncludes(root);
    if (incomingIncludes.length === 0) {
        return [''];
    }

    const prefixes: string[] = [];
    for (const include of incomingIncludes) {
        const owner = nearestContainingElement(include.$container);
        if (owner) {
            prefixes.push(...getQualifiedIdentifiers(owner, workspaceResolver));
        } else {
            const sourceRoot = AstUtils.findRootNode(include);
            prefixes.push(...getDocumentPrefixes(sourceRoot, workspaceResolver, nextVisiting));
        }
    }
    return unique(prefixes);
}

function isLocallyVisible(context: AstNode, target: ElementDeclaration): boolean {
    const targetParent = nearestContainingElement(target.$container);
    if (!targetParent) {
        return false;
    }
    return nearestContainingElement(context) === targetParent;
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function nearestContainingElement(node: AstNode | undefined): ElementDeclaration | undefined {
    let current = node;
    while (current) {
        if (isElementDeclaration(current)) {
            return current;
        }
        current = current.$container;
    }
    return undefined;
}

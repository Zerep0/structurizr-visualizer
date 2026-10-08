import { AstUtils, type AstNode, type ValidationAcceptor, type ValidationChecks } from 'langium';
import {
    isElementDeclaration,
    isFragment,
    isIdentifierMode,
    isRelationshipDeclaration,
    type ElementDeclaration,
    type Fragment,
    type IncludeDirective,
    type RelationshipDeclaration,
    type StructurizrAstType,
    type Workspace
} from './generated/ast.js';
import type { StructurizrServices } from './structurizr-module.js';
import { DiagnosticCodes } from './diagnostic-codes.js';
import { getQualifiedIdentifiers } from './structurizr-scope.js';
import type { StructurizrWorkspaceResolver } from './structurizr-workspace.js';

export function registerValidationChecks(services: StructurizrServices): void {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.StructurizrValidator;
    const checks: ValidationChecks<StructurizrAstType> = {
        Workspace: validator.checkDuplicateIdentifiers,
        Fragment: validator.checkDuplicateIdentifiers,
        ElementDeclaration: validator.checkElementPlacement,
        RelationshipDeclaration: validator.checkRelationshipSource,
        IncludeDirective: validator.checkInclude
    };
    registry.register(checks, validator);
}

export class StructurizrValidator {
    private readonly workspaceResolver: StructurizrWorkspaceResolver;

    constructor(services: StructurizrServices) {
        this.workspaceResolver = services.workspace.StructurizrWorkspaceResolver;
    }

    checkDuplicateIdentifiers(root: Workspace | Fragment, accept: ValidationAcceptor): void {
        const currentDocument = AstUtils.getDocument(root);
        const connectedDocuments = this.workspaceResolver.getConnectedDocuments(root);
        const hierarchical = connectedDocuments
            .flatMap(document => [...AstUtils.streamAst(document.parseResult.value)])
            .filter(isIdentifierMode)
            .some(mode => mode.mode === 'hierarchical');
        const seen = new Map<string, AstNode>();

        for (const document of connectedDocuments) {
            for (const node of AstUtils.streamAst(document.parseResult.value)) {
                if (
                    (!isElementDeclaration(node) && !isRelationshipDeclaration(node))
                    || !node.identifier
                ) {
                    continue;
                }

                // Relationship identifiers remain flat even when element
                // identifiers are hierarchical.
                const names = hierarchical && isElementDeclaration(node)
                    ? getQualifiedIdentifiers(node, this.workspaceResolver)
                    : [node.identifier];
                for (const name of names) {
                    const previous = seen.get(name);
                    if (previous) {
                        if (AstUtils.getDocument(node).uri.toString() === currentDocument.uri.toString()) {
                            accept('error', `Identifier '${name}' is already in use.`, {
                                node,
                                property: 'identifier',
                                code: DiagnosticCodes.duplicateIdentifier,
                                relatedInformation: previous.$cstNode
                                    ? [{
                                        location: {
                                            uri: AstUtils.getDocument(previous).uri.toString(),
                                            range: previous.$cstNode.range
                                        },
                                        message: 'The identifier was first declared here.'
                                    }]
                                    : undefined
                            });
                        }
                    } else {
                        seen.set(name, node);
                    }
                }
            }
        }
    }

    checkElementPlacement(element: ElementDeclaration, accept: ValidationAcceptor): void {
        const parent = nearestContainingElement(element.$container);
        const allowedParents = allowedParentKinds[element.kind];
        // Error recovery and completion can create a partial element whose
        // kind has not been chosen yet. Other parser diagnostics already
        // describe that state, so semantic validation must stay silent.
        if (!allowedParents) {
            return;
        }
        const parentKinds = parent
            ? [parent.kind]
            : this.getFragmentParentKinds(element);
        if (parentKinds.some(parentKind => allowedParents.includes(parentKind))) {
            return;
        }

        const expected = allowedParents
            .map(kind => kind ?? 'model')
            .join(' or ');
        accept(
            'error',
            `${element.kind} is only valid inside ${expected}.`,
            {
                node: element,
                property: 'kind',
                code: DiagnosticCodes.invalidElementPlacement
            }
        );
    }

    checkRelationshipSource(relationship: RelationshipDeclaration, accept: ValidationAcceptor): void {
        if (relationship.source) {
            return;
        }
        const owner = nearestContainingElement(relationship.$container);
        if (owner) {
            return;
        }
        const fragmentParentKinds = this.getFragmentParentKinds(relationship);
        if (fragmentParentKinds.some(kind => kind !== undefined)) {
            return;
        }
        if (fragmentParentKinds.length === 0 && isFragment(AstUtils.findRootNode(relationship))) {
            return;
        }
        accept(
            'error',
            'A model-level relationship must specify a source identifier.',
            {
                node: relationship,
                property: 'operator',
                code: DiagnosticCodes.missingRelationshipSource
            }
        );
    }

    checkInclude(include: IncludeDirective, accept: ValidationAcceptor): void {
        if (!this.workspaceResolver.includeExists(include)) {
            accept('error', `Included path '${include.path}' does not exist.`, {
                node: include,
                property: 'path',
                code: DiagnosticCodes.missingInclude
            });
            return;
        }
        if (this.workspaceResolver.isCircular(include)) {
            accept('error', `Circular include detected for '${include.path}'.`, {
                node: include,
                property: 'path',
                code: DiagnosticCodes.circularInclude
            });
        }
    }

    private getFragmentParentKinds(node: AstNode): ParentKind[] {
        const root = AstUtils.findRootNode(node);
        if (!isFragment(root)) {
            return [undefined];
        }
        const incoming = this.workspaceResolver.getIncomingIncludes(node);
        if (incoming.length === 0) {
            return [];
        }
        return incoming.map(include => nearestContainingElement(include.$container)?.kind);
    }
}

type ParentKind = ElementDeclaration['kind'] | undefined;

const allowedParentKinds: Record<ElementDeclaration['kind'], ParentKind[]> = {
    person: [undefined],
    softwareSystem: [undefined],
    container: ['softwareSystem'],
    component: ['container'],
    element: [undefined],
    deploymentEnvironment: [undefined],
    deploymentNode: ['deploymentEnvironment', 'deploymentNode'],
    infrastructureNode: ['deploymentNode']
};

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

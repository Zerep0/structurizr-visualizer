import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AstUtils, URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import {
    expectCompletion,
    expectGoToDefinition,
    parseHelper,
    validationHelper
} from 'langium/test';
import {
    createStructurizrServices,
    DiagnosticCodes,
    isElementDeclaration,
    isFragment,
    isModel,
    isRelationshipDeclaration,
    type Workspace
} from '../src/index.js';

const services = createStructurizrServices(NodeFileSystem).Structurizr;
const parse = parseHelper<Workspace>(services);
const validate = validationHelper<Workspace>(services);

describe('Structurizr grammar', () => {
    test('parses the checked-in hello-world example', async () => {
        const source = await readFile('examples/hello-world/workspace.dsl', 'utf8');
        const document = await parse(source);

        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);
    });

    test('parses and links a fundamental workspace', async () => {
        const document = await parse(`
workspace "Payments" "A payment platform" {
    model {
        customer = person "Customer" "Uses the platform"
        payments = softwareSystem "Payments" {
            api = container "API" "HTTP API" "TypeScript"
            database = container "Database" "Stores payments" "PostgreSQL"
        }

        customer -> payments "Uses"
        payments -> customer "Sends notifications"
    }

    views {
        systemContext payments "payments-context" {
            include *
            autoLayout lr
        }
    }
}
`);

        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);

        const model = document.parseResult.value.statements.find(isModel);
        expect(model).toBeDefined();
        const relationships = model!.statements.filter(isRelationshipDeclaration);
        expect(relationships).toHaveLength(2);
        expect(relationships[0].source?.ref?.identifier).toBe('customer');
        expect(relationships[0].target.ref?.identifier).toBe('payments');
    });

    test('treats keywords case-insensitively', async () => {
        const document = await parse(`
WORKSPACE {
    MODEL {
        user = PERSON "User"
        system = SOFTWARESYSTEM "System"
        user -> system "Uses"
    }
}
`);

        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);
    });

    test('keeps separate statements separate at line boundaries', async () => {
        const document = await parse(`
workspace {
    model {
        first = person "First"
        second = person "Second"
    }
}
`);
        const model = document.parseResult.value.statements.find(isModel);
        const elements = model?.statements.filter(isElementDeclaration) ?? [];

        expect(document.parseResult.parserErrors).toEqual([]);
        expect(elements).toHaveLength(2);
        expect(elements[0].arguments).toEqual([]);
    });
});

describe('multi-file includes', () => {
    test('accepts comments and standalone style fragments', async () => {
        const document = await parse(`
// ─────────────────────────────────────────────────────────────
// STRUCTURIZR HOUSE STYLE
// Reusable C4 architecture style
/* Block comments are accepted too. */
element "Element" {
    shape RoundedBox
    fontSize 22
    strokeWidth 2
    metadata true
    description true
}

element "Person" {
    shape Person
}

element "Critical" {
    stroke #B91C1C
    strokeWidth 5
}

element "Deprecated" {
    opacity 45
    border dashed
}

relationship "Relationship" {
    thickness 2
    fontSize 16
    style solid
    opacity 90
}
`);

        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);
        expect(isFragment(document.parseResult.value)).toBe(true);
    });

    test('accepts includes inside styles and workspace documentation directives', async () => {
        const document = await parse(`
workspace {
    model {
        !include model/systems.dsl
        !include model/relationships.dsl
    }
    views {
        !include views/system-context.dsl
        styles {
            !include styles/style.dsl
        }
    }
    !docs docs
    !adrs decisions
}
`);

        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);
    });

    test('parses common quoted and unquoted include paths', async () => {
        const document = await parse(`
!include model.dsl
!include model/people.dsl
!include people-and-systems.dsl
!include "views/styles.dsl"
`);

        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);
    });

    test('parses fragments and links identifiers across included files', async () => {
        const root = resolve('fixtures/multi-file/basic');
        const workspaceUri = URI.file(resolve(root, 'workspace.dsl'));
        const peopleUri = URI.file(resolve(root, 'model/people.dsl'));
        const stylesUri = URI.file(resolve(root, 'views/styles.dsl'));
        const workspaceDocument = await services.shared.workspace.LangiumDocuments
            .getOrCreateDocument(workspaceUri);

        await services.shared.workspace.DocumentBuilder.build([workspaceDocument], {
            validation: true
        });

        // The resolver must load includes itself; editor consumers should not
        // need to open every fragment before references start working.
        const peopleDocument = services.shared.workspace.LangiumDocuments.getDocument(peopleUri);
        const stylesDocument = services.shared.workspace.LangiumDocuments.getDocument(stylesUri);
        expect(peopleDocument).toBeDefined();
        expect(stylesDocument).toBeDefined();
        await services.shared.workspace.DocumentBuilder.build(
            [peopleDocument!, stylesDocument!],
            { validation: true }
        );

        expect(workspaceDocument.parseResult.parserErrors).toEqual([]);
        expect(peopleDocument!.parseResult.parserErrors).toEqual([]);
        expect(stylesDocument!.parseResult.parserErrors).toEqual([]);
        expect(isFragment(peopleDocument!.parseResult.value)).toBe(true);
        expect(isFragment(stylesDocument!.parseResult.value)).toBe(true);
        expect([workspaceDocument, peopleDocument!, stylesDocument!]
            .flatMap(document => document.diagnostics ?? [])).toEqual([]);

        const relationship = [...AstUtils.streamAst(workspaceDocument.parseResult.value)]
            .find(isRelationshipDeclaration);
        expect(relationship?.source?.ref?.identifier).toBe('federationOperator');
        expect(
            AstUtils.getDocument(relationship!.source!.ref!).uri.toString()
        ).toBe(peopleDocument!.uri.toString());
    });

    test('reports a missing include on its path', async () => {
        const result = await validate(`
workspace {
    model {
        !include model/missing.dsl
    }
}
`, {
            documentUri: 'file:///missing-include/workspace.dsl'
        });

        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: DiagnosticCodes.missingInclude
                })
            ])
        );
    });

    test('resolves every DSL fragment in a directory include', async () => {
        const root = resolve('fixtures/multi-file/directory');
        const uris = [
            URI.file(resolve(root, 'workspace.dsl')),
            URI.file(resolve(root, 'model/people.dsl')),
            URI.file(resolve(root, 'model/systems.dsl'))
        ];
        const documents = await Promise.all(
            uris.map(uri => services.shared.workspace.LangiumDocuments.getOrCreateDocument(uri))
        );

        await services.shared.workspace.DocumentBuilder.build(documents, {
            validation: true
        });

        expect(documents.flatMap(document => document.diagnostics ?? [])).toEqual([]);
        const relationship = [...AstUtils.streamAst(documents[2].parseResult.value)]
            .find(isRelationshipDeclaration);
        expect(relationship?.source?.ref?.identifier).toBe('operator');
        expect(relationship?.target.ref?.identifier).toBe('platform');
    });

    test('discovers nested includes transitively', async () => {
        const root = resolve('fixtures/multi-file/nested');
        const workspaceUri = URI.file(resolve(root, 'workspace.dsl'));
        const baseUri = URI.file(resolve(root, 'model/base.dsl'));
        const peopleUri = URI.file(resolve(root, 'model/people.dsl'));
        const workspace = await services.shared.workspace.LangiumDocuments
            .getOrCreateDocument(workspaceUri);

        await services.shared.workspace.DocumentBuilder.build([workspace], {
            validation: true
        });

        const base = services.shared.workspace.LangiumDocuments.getDocument(baseUri);
        const people = services.shared.workspace.LangiumDocuments.getDocument(peopleUri);
        expect(base).toBeDefined();
        expect(people).toBeDefined();
        await services.shared.workspace.DocumentBuilder.build([base!, people!], {
            validation: true
        });

        expect([workspace, base!, people!].flatMap(document => document.diagnostics ?? []))
            .toEqual([]);
        const relationship = [...AstUtils.streamAst(base!.parseResult.value)]
            .find(isRelationshipDeclaration);
        expect(relationship?.source?.ref?.identifier).toBe('operator');
        expect(AstUtils.getDocument(relationship!.source!.ref!).uri.toString())
            .toBe(people!.uri.toString());
    });

    test('preserves hierarchical identifiers at the include location', async () => {
        const workspace = services.shared.workspace.LangiumDocuments.createDocument(
            URI.parse('file:///hierarchical-include/workspace.dsl'),
            `workspace {
    !identifiers hierarchical
    model {
        user = person "User"
        shop = softwareSystem "Shop" {
            !include containers.dsl
        }
        user -> shop.api "Calls"
    }
}
`
        );
        const containers = services.shared.workspace.LangiumDocuments.createDocument(
            URI.parse('file:///hierarchical-include/containers.dsl'),
            'api = container "API"\n'
        );

        await services.shared.workspace.DocumentBuilder.build([workspace, containers], {
            validation: true
        });

        expect([...(workspace.diagnostics ?? []), ...(containers.diagnostics ?? [])]).toEqual([]);
        const relationship = [...AstUtils.streamAst(workspace.parseResult.value)]
            .find(isRelationshipDeclaration);
        expect(relationship?.target.ref?.identifier).toBe('api');
        expect(AstUtils.getDocument(relationship!.target.ref!).uri.toString())
            .toBe(containers.uri.toString());
    });

    test('does not leak symbols from an unrelated DSL project', async () => {
        const workspace = services.shared.workspace.LangiumDocuments.createDocument(
            URI.parse('file:///isolated/workspace.dsl'),
            `workspace {
    model {
        local = softwareSystem "Local"
        external -> local "Must stay unresolved"
    }
}
`
        );
        const unrelated = services.shared.workspace.LangiumDocuments.createDocument(
            URI.parse('file:///unrelated/model.dsl'),
            'external = person "External"\n'
        );

        await services.shared.workspace.DocumentBuilder.build([workspace, unrelated], {
            validation: true
        });

        const relationship = [...AstUtils.streamAst(workspace.parseResult.value)]
            .find(isRelationshipDeclaration);
        expect(relationship?.source?.ref).toBeUndefined();
        expect(workspace.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    message: expect.stringContaining("external")
                })
            ])
        );
    });

    test('detects circular includes', async () => {
        const firstUri = URI.parse('file:///circular/first.dsl');
        const secondUri = URI.parse('file:///circular/second.dsl');
        const first = services.shared.workspace.LangiumDocuments.createDocument(
            firstUri,
            '!include second.dsl\n'
        );
        const second = services.shared.workspace.LangiumDocuments.createDocument(
            secondUri,
            '!include first.dsl\n'
        );

        await services.shared.workspace.DocumentBuilder.build([first, second], {
            validation: true
        });

        expect([...(first.diagnostics ?? []), ...(second.diagnostics ?? [])]).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: DiagnosticCodes.circularInclude
                })
            ])
        );
    });
});

describe('style grammar', () => {
    test('parses the complete Structurizr 6.2.3 style surface', async () => {
        const shapes = [
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
        ];
        const shapeStyles = shapes.map(shape => `
        element "Shape:${shape}" {
            shape ${shape}
        }`).join('');
        const document = await parse(`
workspace {
    views {
        styles {
            element "Element" {
                shape RoundedBox
                icon https://example.com/icon.png
                iconPosition Top
                width 450
                height 300
                background #112233
                color yellow
                colour blue
                stroke #AABBCCDD
                strokeWidth 2
                fontSize 24
                border dotted
                opacity 80
                metadata true
                description false
                properties {
                    "custom.element" "value"
                }
            }

            relationship "Relationship" {
                thickness 2
                color #334455
                colour red
                style dotted
                dashed false
                routing Orthogonal
                jump true
                fontSize 16
                width 200
                position 55
                opacity 90
                metadata true
                description false
                properties {
                    "custom.relationship" "value"
                }
            }

            light {
                element "Element" { background white }
                relationship "Relationship" { color black }
            }
            dark {
                element "Element" { background #111111 }
                relationship "Relationship" { color #EEEEEE }
            }

            theme default
            themes default https://static.structurizr.com/themes/default/theme.json themes/local.json
            ${shapeStyles}
        }
    }
}
`);

        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);
    });

    test('parses standalone light and dark style fragments', async () => {
        const document = await parse(`
light {
    element "Person" {
        shape Person
        icon data:image/png;base64,AAAA
        iconPosition Left
    }
}
dark {
    relationship "Relationship" {
        routing Curved
        jump false
    }
}
`);

        expect(document.parseResult.lexerErrors).toEqual([]);
        expect(document.parseResult.parserErrors).toEqual([]);
        expect(isFragment(document.parseResult.value)).toBe(true);
    });

    test('completes official enumerated style values', async () => {
        const scenarios = [
            {
                text: 'element "Element" {\n    shape <|>\n}\n',
                expected: ['Box', 'Person', 'Component']
            },
            {
                text: 'element "Element" {\n    iconPosition <|>\n}\n',
                expected: ['Top', 'Bottom', 'Left']
            },
            {
                text: 'element "Element" {\n    border <|>\n}\n',
                expected: ['solid', 'dashed', 'dotted']
            },
            {
                text: 'relationship "Relationship" {\n    routing <|>\n}\n',
                expected: ['Direct', 'Curved', 'Orthogonal']
            },
            {
                text: 'relationship "Relationship" {\n    jump <|>\n}\n',
                expected: ['true', 'false']
            }
        ];

        for (const [index, scenario] of scenarios.entries()) {
            const disposable = await expectCompletion(services)({
                text: scenario.text,
                index: 0,
                parseOptions: {
                    documentUri: `file:///style-completion/${index}.dsl`
                },
                assert: completions => {
                    expect(completions.items.map(item => item.label))
                        .toEqual(expect.arrayContaining(scenario.expected));
                }
            });
            await disposable.dispose();
        }
    });
});

describe('identifier semantics', () => {
    test('completes filesystem paths for path-valued constructs', async () => {
        const root = resolve('fixtures/multi-file/basic');
        const documentUri = URI.file(resolve(root, 'path-completion.dsl')).toString();

        const rootCompletion = await expectCompletion(services)({
            text: '!include <|>\n',
            index: 0,
            parseOptions: { documentUri },
            assert: completions => {
                const labels = completions.items.map(item => item.label);
                expect(labels).toEqual(expect.arrayContaining(['model/', 'views/']));
            }
        });
        await rootCompletion.dispose();

        const nestedCompletion = await expectCompletion(services)({
            text: '!include model/p<|>\n',
            index: 0,
            parseOptions: { documentUri },
            assert: completions => {
                const people = completions.items.find(item => item.label === 'people.dsl');
                expect(people?.textEdit).toMatchObject({
                    newText: 'people.dsl',
                    range: {
                        start: { line: 0, character: 15 },
                        end: { line: 0, character: 16 }
                    }
                });
            }
        });
        await nestedCompletion.dispose();

        const quotedCompletion = await expectCompletion(services)({
            text: '!include "views/s<|>"\n',
            index: 0,
            parseOptions: { documentUri },
            assert: completions => {
                expect(completions.items.map(item => item.label)).toContain('styles.dsl');
            }
        });
        await quotedCompletion.dispose();

        const docsCompletion = await expectCompletion(services)({
            text: '!docs <|>\n',
            index: 0,
            parseOptions: { documentUri },
            assert: completions => {
                const labels = completions.items.map(item => item.label);
                expect(labels).toEqual(expect.arrayContaining(['model/', 'views/']));
                expect(labels).not.toContain('workspace.dsl');
            }
        });
        await docsCompletion.dispose();

        expect(services.lsp.CompletionProvider?.completionOptions?.triggerCharacters)
            .toEqual(expect.arrayContaining(['.', '/', '\\']));
    });

    test('offers relationship endpoints from sibling fragments', async () => {
        const rootUri = URI.parse('file:///fragment-completion/workspace.dsl');
        const peopleUri = URI.parse('file:///fragment-completion/people.dsl');
        const systemsUri = URI.parse('file:///fragment-completion/systems.dsl');
        const root = services.shared.workspace.LangiumDocuments.createDocument(
            rootUri,
            `workspace {
    !identifiers hierarchical
    model {
        !include people.dsl
        !include systems.dsl
        !include relationships.dsl
    }
}
`
        );
        const people = services.shared.workspace.LangiumDocuments.createDocument(
            peopleUri,
            'operator = person "Operator"\n'
        );
        const systems = services.shared.workspace.LangiumDocuments.createDocument(
            systemsUri,
            `shop = softwareSystem "Shop" {
    api = container "API"
}
`
        );
        await services.shared.workspace.DocumentBuilder.build([root, people, systems], {
            validation: true
        });

        const targetCompletion = await expectCompletion(services)({
            text: 'operator -> <|>\n',
            index: 0,
            parseOptions: {
                documentUri: 'file:///fragment-completion/relationships.dsl'
            },
            assert: completions => {
                const labels = completions.items.map(item => item.label);
                expect(labels).toEqual(expect.arrayContaining(['operator', 'shop', 'shop.api']));
            }
        });
        await targetCompletion.dispose();

        const dotCompletion = await expectCompletion(services)({
            text: 'operator -> shop.<|>\n',
            index: 0,
            parseOptions: {
                documentUri: 'file:///fragment-completion/relationships.dsl'
            },
            assert: completions => {
                const api = completions.items.find(item => item.label === 'api');
                expect(api?.textEdit).toMatchObject({
                    newText: 'api',
                    range: {
                        start: { line: 0, character: 17 },
                        end: { line: 0, character: 17 }
                    }
                });
            }
        });
        await dotCompletion.dispose();

        expect(services.lsp.CompletionProvider?.completionOptions?.triggerCharacters)
            .toContain('.');

        const sourceCompletion = await expectCompletion(services)({
            text: '<|>\n',
            index: 0,
            parseOptions: {
                documentUri: 'file:///fragment-completion/relationships.dsl'
            },
            assert: completions => {
                const operator = completions.items.find(item => item.label === 'operator');
                expect(operator?.textEdit).toMatchObject({
                    newText: 'operator',
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: 0, character: 0 }
                    }
                });
            }
        });
        await sourceCompletion.dispose();

        const operatorCompletion = await expectCompletion(services)({
            text: 'operator <|>\n',
            index: 0,
            parseOptions: {
                documentUri: 'file:///fragment-completion/relationships.dsl'
            },
            assert: completions => {
                const labels = completions.items.map(item => item.label);
                expect(labels).toEqual(expect.arrayContaining(['->', '-/>']));
            }
        });
        await operatorCompletion.dispose();
    });

    test('offers scoped relationship targets while a statement is incomplete', async () => {
        const disposable = await expectCompletion(services)({
            text: `
workspace {
    model {
        customer = person "Customer"
        shop = softwareSystem "Shop"
        customer -> <|>
    }
}
`,
            index: 0,
            assert: completions => {
                const labels = completions.items.map(item => item.label);
                expect(labels).toEqual(expect.arrayContaining(['customer', 'shop']));
            }
        });
        await disposable.dispose();
    });

    test('navigates from a reference to its declaration', async () => {
        const disposable = await expectGoToDefinition(services)({
            text: `
workspace {
    model {
        <|shop|> = softwareSystem "Shop"
        user = person "User"
        user -> <|>shop "Uses"
    }
}
`,
            index: 0,
            rangeIndex: 0
        });
        await disposable.dispose();
    });

    test('resolves qualified hierarchical identifiers', async () => {
        const result = await validate(`
workspace {
    !identifiers hierarchical
    model {
        user = person "User"
        shop = softwareSystem "Shop" {
            api = container "API"
        }
        user -> shop.api "Calls"
    }
}
`);

        expect(result.document.parseResult.parserErrors).toEqual([]);
        expect(result.diagnostics).toEqual([]);

        const model = result.document.parseResult.value.statements.find(isModel)!;
        const relationship = model.statements.find(isRelationshipDeclaration)!;
        expect(relationship.target.ref?.identifier).toBe('api');
    });

    test('allows repeated local names in hierarchical mode', async () => {
        const result = await validate(`
workspace {
    !identifiers hierarchical
    model {
        one = softwareSystem "One" {
            api = container "API"
        }
        two = softwareSystem "Two" {
            api = container "API"
        }
    }
}
`);

        expect(result.diagnostics).toEqual([]);
    });

    test('reports duplicate flat identifiers with a stable code', async () => {
        const result = await validate(`
workspace {
    model {
        one = softwareSystem "One" {
            api = container "API"
        }
        two = softwareSystem "Two" {
            api = container "API"
        }
    }
}
`);

        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: DiagnosticCodes.duplicateIdentifier,
                    message: "Identifier 'api' is already in use."
                })
            ])
        );
    });
});

describe('model semantics', () => {
    test('reports invalid element placement', async () => {
        const result = await validate(`
workspace {
    model {
        api = container "API"
    }
}
`);

        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: DiagnosticCodes.invalidElementPlacement
                })
            ])
        );
    });

    test('requires a source for model-level relationships', async () => {
        const result = await validate(`
workspace {
    model {
        system = softwareSystem "System"
        -> system "Invalid at model scope"
    }
}
`);

        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: DiagnosticCodes.missingRelationshipSource
                })
            ])
        );
    });
});

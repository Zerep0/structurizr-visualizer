grammar Structurizr

entry Document:
    Workspace | Fragment;

Workspace:
    EOL*
    'workspace'
    (
        extends?='extends' extendsPath=Value
        | (name=Value (description=Value)?)?
    )
    EOL* '{' EOL*
        statements+=WorkspaceStatement*
    '}' EOL*;

/**
 * An included DSL file is a fragment, not a standalone workspace. The exact
 * insertion context is supplied by the include graph; this broad syntactic
 * root keeps fragments useful in the editor before or while that graph is
 * being rebuilt.
 */
Fragment:
    EOL* statements+=FragmentStatement+;

FragmentStatement:
    (
        IdentifierMode
        | GroupDeclaration
        | StyleScheme
        | StyleDefinition
        | ElementDeclaration
        | InstanceDeclaration
        | DeploymentGroupDeclaration
        | RelationshipDeclaration
        | ElementProperty
        | Properties
        | Perspectives
        | HealthCheck
        | ViewDefinition
        | Styles
        | Theme
        | Themes
        | Terminology
        | ViewSelection
        | AutoLayout
        | Animation
        | ViewProperty
        | WorkspaceScope
        | Visibility
        | Users
        | IncludeDirective
        | ImpliedRelationshipsDirective
        | DocsDirective
        | AdrsDirective
        | ComponentsDirective
    ) EOL*;

WorkspaceStatement:
    (
        IdentifierMode
        | Model
        | Views
        | Configuration
        | Properties
        | IncludeDirective
        | DocsDirective
        | AdrsDirective
    ) EOL*;

IdentifierMode:
    '!identifiers' mode=('flat' | 'hierarchical');

Model:
    'model' EOL* '{' EOL*
        statements+=ModelStatement*
    '}';

ModelStatement:
    (
        IdentifierMode
        | GroupDeclaration
        | ElementDeclaration
        | RelationshipDeclaration
        | IncludeDirective
        | ImpliedRelationshipsDirective
    ) EOL*;

GroupDeclaration:
    'group' displayName=Value EOL* '{' EOL*
        statements+=ModelStatement*
    '}';

/**
 * Positional arguments are intentionally retained as an ordered list. Their
 * meaning depends on kind in the official DSL (for example, a container has
 * description, technology, and tags while a person has description and tags).
 */
ElementDeclaration:
    (identifier=ID '=')?
    kind=ElementKind
    displayName=Value
    arguments+=Value*
    (EOL* '{' EOL* body+=ElementBodyStatement* '}')?;

ElementKind returns string:
    'person'
    | 'softwareSystem'
    | 'container'
    | 'component'
    | 'element'
    | 'deploymentEnvironment'
    | 'deploymentNode'
    | 'infrastructureNode';

ElementBodyStatement:
    (
        GroupDeclaration
        | ElementDeclaration
        | InstanceDeclaration
        | DeploymentGroupDeclaration
        | RelationshipDeclaration
        | ElementProperty
        | Properties
        | Perspectives
        | HealthCheck
        | IncludeDirective
        | DocsDirective
        | AdrsDirective
        | ComponentsDirective
    ) EOL*;

InstanceDeclaration:
    (identifier=ID '=')?
    kind=('softwareSystemInstance' | 'containerInstance' | 'instanceOf')
    target=[ElementDeclaration:QualifiedIdentifier]
    arguments+=Value*
    (EOL* '{' EOL* body+=InstanceBodyStatement* '}')?;

InstanceBodyStatement:
    (
        RelationshipDeclaration
        | ElementProperty
        | Properties
        | Perspectives
        | HealthCheck
    ) EOL*;

DeploymentGroupDeclaration:
    (identifier=ID '=')? 'deploymentGroup' displayName=Value;

HealthCheck:
    'healthCheck' name=Value url=Value (interval=INT)? (timeout=INT)?;

RelationshipDeclaration:
    (identifier=ID '=')?
    (thisSource?='this' | source=[ElementDeclaration:QualifiedIdentifier])?
    operator=RelationshipOperator
    target=[ElementDeclaration:QualifiedIdentifier]
    arguments+=Value*
    (EOL* '{' EOL* body+=RelationshipBodyStatement* '}')?;

RelationshipOperator returns string:
    '->' | '-/>' | RELATIONSHIP_ARCHETYPE_OPERATOR;

RelationshipBodyStatement:
    (
        ElementProperty
        | Properties
        | Perspectives
    ) EOL*;

ElementProperty:
    kind=('description' | 'technology' | 'url' | 'group') value=Value
    | kind=('tag' | 'tags') values+=Value+
    | kind='instances' value=Value;

Properties:
    'properties' EOL* '{' EOL*
        entries+=PropertyEntry*
    '}';

PropertyEntry:
    name=PropertyValue value=Value EOL*;

PropertyValue returns string:
    QualifiedIdentifier | STRING | PATH_VALUE;

Perspectives:
    'perspectives' EOL* '{' EOL*
        entries+=PerspectiveEntry*
    '}';

PerspectiveEntry:
    ('perspective')? name=Value
    (
        description=Value (value=Value)? (url=Value)?
        | EOL* '{' EOL* details+=PerspectiveDetail* '}'
    ) EOL*;

PerspectiveDetail:
    kind=('description' | 'value' | 'url') value=Value EOL*;

Views:
    'views' EOL* '{' EOL*
        statements+=ViewStatement*
    '}';

ViewStatement:
    (
        ViewDefinition
        | Styles
        | Theme
        | Themes
        | Terminology
        | Properties
        | IncludeDirective
    ) EOL*;

ViewDefinition:
    kind=ViewKind arguments+=ViewArgument*
    (EOL* '{' EOL* body+=ViewBodyStatement* '}')?;

ViewKind returns string:
    'systemLandscape'
    | 'systemContext'
    | 'container'
    | 'component'
    | 'filtered'
    | 'dynamic'
    | 'deployment'
    | 'custom'
    | 'image';

ViewArgument returns string:
    QualifiedIdentifier | STRING | PATH_VALUE | '*' | '*?';

ViewBodyStatement:
    (
        ViewSelection
        | AutoLayout
        | Animation
        | ViewProperty
        | Properties
        | RelationshipDeclaration
    ) EOL*;

ViewSelection:
    kind=('include' | 'exclude') selectors+=ViewArgument+;

AutoLayout:
    'autoLayout' arguments+=Value*;

Animation:
    'animation' EOL* '{' EOL*
        steps+=AnimationStep*
    '}';

AnimationStep:
    elements+=ViewArgument+ EOL*;

ViewProperty:
    kind=('default' | 'title' | 'description') value=Value?;

Styles:
    'styles' EOL* '{' EOL*
        statements+=StyleStatement*
    '}';

StyleStatement:
    (StyleScheme | StyleDefinition | Theme | Themes | IncludeDirective) EOL*;

StyleScheme:
    scheme=('light' | 'dark') EOL* '{' EOL*
        statements+=StyleStatement*
    '}';

StyleDefinition:
    kind=('element' | 'relationship') tag=Value EOL* '{' EOL*
        statements+=StyleDefinitionStatement*
    '}' EOL*;

StyleDefinitionStatement:
    (StyleProperty | Properties | IncludeDirective) EOL*;

StyleProperty:
    name=StylePropertyName values+=StylePropertyValue+ EOL*;

StylePropertyValue returns string:
    Value | ElementKind | 'dashed' | HEX_COLOR;

StylePropertyName returns string:
    'shape' | 'icon' | 'iconPosition' | 'width' | 'height' | 'background' | 'color'
    | 'colour' | 'stroke' | 'strokeWidth' | 'fontSize' | 'border'
    | 'opacity' | 'metadata' | 'description' | 'routing'
    | 'thickness' | 'position' | 'dashed' | 'style' | 'jump';

Theme:
    'theme' value=ThemeValue;

Themes:
    'themes'
    (
        values+=ThemeValue+
        | EOL* '{' EOL* values+=ThemeValue* EOL* '}'
    );

ThemeValue returns string:
    Value | 'default';

Terminology:
    'terminology' EOL* '{' EOL*
        entries+=TerminologyEntry*
    '}';

TerminologyEntry:
    kind=('person' | 'softwareSystem' | 'container' | 'component'
        | 'deploymentNode' | 'infrastructureNode' | 'relationship' | 'metadata')
    value=Value EOL*;

Configuration:
    'configuration' EOL* '{' EOL*
        statements+=ConfigurationStatement*
    '}';

ConfigurationStatement:
    (
        WorkspaceScope
        | Visibility
        | Users
        | Properties
    ) EOL*;

WorkspaceScope:
    'scope' value=('landscape' | 'softwareSystem' | 'none');

Visibility:
    'visibility' value=('private' | 'public');

Users:
    'users' EOL* '{' EOL*
        entries+=UserEntry*
    '}';

UserEntry:
    username=Value role=('read' | 'write') EOL*;

IncludeDirective:
    '!include' path=IncludePath;

IncludePath returns string:
    STRING | PATH_VALUE | QualifiedIdentifier | IncludePathKeyword;

IncludePathKeyword returns string:
    'model' | 'views' | 'styles' | 'configuration';

DocsDirective:
    '!docs' path=Value importer=Value?;

AdrsDirective:
    ('!adrs' | '!decisions') path=Value type=Value?;

ComponentsDirective:
    '!components' arguments+=Value*;

ImpliedRelationshipsDirective:
    '!impliedRelationships' strategy=Value;

QualifiedIdentifier returns string:
    PATH_VALUE | ID ('.' ID)*;

Value returns string:
    STRING | ID | INT | PATH_VALUE;

terminal RELATIONSHIP_ARCHETYPE_OPERATOR: /--[A-Za-z_][A-Za-z0-9_-]*->/;
terminal HEX_COLOR: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/;
terminal PATH_VALUE: /(?:https?:\/\/|file:\/\/|data:image\/|[A-Za-z]:\\|\.{1,2}[\/\\]|\/(?![\/*])|[_A-Za-z0-9-]+[\/\\])[^\s{}]+|[_A-Za-z0-9]+(?:[-.][_A-Za-z0-9]+)+/;
terminal ID: /[_a-zA-Z][_a-zA-Z0-9]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal EOL: /(?:\r?\n)+/;

hidden terminal WS: /[ \t\f]+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

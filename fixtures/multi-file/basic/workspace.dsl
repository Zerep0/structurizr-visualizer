workspace "Federation" "A multi-file workspace" {
    model {
        !include model/people.dsl

        platform = softwareSystem "Federation Platform"
        federationOperator -> platform "Administers"
    }

    views {
        systemContext platform "platform-context" {
            include *
            autoLayout lr
        }

        !include views/styles.dsl
    }
}

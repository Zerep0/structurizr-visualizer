workspace "Hello World" "A minimal Structurizr Studio example" {
    model {
        user = person "User" "Uses the software system"
        system = softwareSystem "Software System" "Provides value to the user" {
            api = container "API" "Handles requests" "TypeScript"
        }

        user -> system "Uses"
    }

    views {
        systemContext system "system-context" {
            include *
            autoLayout lr
        }
    }
}

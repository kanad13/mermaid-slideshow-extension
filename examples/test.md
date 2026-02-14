# Mermaid Slideshow Test File

This file contains diverse Mermaid diagram types for testing slideshow rendering and navigation.

## Diagram 1: Flowchart

```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

## Diagram 2: Sequence Diagram

```mermaid
sequenceDiagram
    participant Alice
    participant Bob
    participant Charlie
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: Great!
    Bob->>Charlie: Can you help?
    Charlie-->>Bob: Sure thing
    Charlie->>Alice: All sorted
```

## Diagram 3: State Diagram

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Review: Submit
    Review --> Approved: Accept
    Review --> Draft: Request changes
    Approved --> Published: Deploy
    Published --> [*]
```

## Diagram 4: Pie Chart

```mermaid
pie title Project Languages
    "JavaScript" : 45
    "Python" : 30
    "Go" : 15
    "Other" : 10
```

## Diagram 5: Azure DevOps Syntax

::: mermaid
graph LR
    A[Markdown File] --> B[Extract Blocks]
    B --> C[Slideshow]
    C --> D[Navigate]
:::

## Diagram 6: Class Diagram

```mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
    Animal : +swim()
    Duck : +String beakColor
    Duck : +quack()
    Fish : +int sizeInFeet
    Fish : +canEat()
```

## Diagram 7: Entity-Relationship Diagram

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }
    ORDER {
        int orderNumber
        date created
    }
    LINE-ITEM {
        string product
        int quantity
        float price
    }
```

## Diagram 8: Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Design
        Wireframes     :done, d1, 2025-01-01, 10d
        Mockups        :done, d2, after d1, 7d
    section Development
        Backend API    :active, dev1, 2025-01-18, 14d
        Frontend       :dev2, after dev1, 14d
    section Testing
        QA Testing     :test1, after dev2, 7d
```

## Diagram 9: Mindmap

```mermaid
mindmap
    root((Project))
        Planning
            Requirements
            Timeline
            Budget
        Development
            Frontend
            Backend
            Database
        Testing
            Unit Tests
            Integration
            UAT
```

## Non-Mermaid Content

This paragraph and the code block below should be ignored by the extraction engine.

```javascript
console.log("This is not a mermaid diagram");
```

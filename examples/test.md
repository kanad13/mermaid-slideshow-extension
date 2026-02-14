# Mermaid Slideshow Test File

This file contains 5 Mermaid diagrams for testing the slideshow preview.

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
    participant User
    participant Extension
    participant Webview
    User->>Extension: Click Preview
    Extension->>Extension: Extract Mermaid blocks
    Extension->>Webview: Send diagrams
    Webview->>Webview: Render slide
    User->>Webview: Arrow key / scroll
    Webview->>Webview: Next slide
```

## Diagram 3: State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Previewing: Open preview
    Previewing --> Navigating: Arrow key
    Navigating --> Previewing: Render slide
    Previewing --> Idle: Close panel
```

## Diagram 4: Pie Chart

```mermaid
pie title Extension Code Composition
    "Extraction" : 15
    "Webview HTML/CSS" : 40
    "Navigation JS" : 30
    "VS Code API" : 15
```

## Diagram 5: Azure DevOps Syntax

::: mermaid
graph LR
    A[Markdown File] --> B[Extract Blocks]
    B --> C[Slideshow]
    C --> D[Navigate]
:::

## Non-Mermaid Content

This paragraph and the code block below should be ignored by the extraction engine.

```javascript
console.log("This is not a mermaid diagram");
```

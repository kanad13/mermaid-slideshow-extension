# Order service design

This file is the source of the README screenshots. The text between diagrams is for readers of the document. The slideshow shows only the diagrams.

## How an order moves through the system

Orders enter through the API, pass a stock check, and end up in billing or a back-order queue.

```mermaid
flowchart LR
    A[Customer places order] --> B{In stock?}
    B -->|Yes| C[Charge payment]
    B -->|No| D[Back-order queue]
    C --> E[Ship order]
    D --> C
```

## Who talks to whom

The same diagram can be written in an Azure DevOps block. Both syntaxes become slides in the order they appear in the file.

::: mermaid
sequenceDiagram
    participant Customer
    participant API
    participant Stock
    participant Billing
    Customer->>API: Place order
    API->>Stock: Reserve items
    Stock-->>API: Reserved
    API->>Billing: Charge card
    Billing-->>API: Paid
    API-->>Customer: Order confirmed
:::

## Order states

```mermaid
stateDiagram-v2
    [*] --> Placed
    Placed --> Reserved: stock found
    Placed --> BackOrdered: out of stock
    BackOrdered --> Reserved: restocked
    Reserved --> Paid
    Paid --> Shipped
    Shipped --> [*]
```

## Data model

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "appears in"
```

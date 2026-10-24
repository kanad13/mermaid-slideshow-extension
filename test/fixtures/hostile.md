# Hostile and malformed diagrams

Slide 1: HTML in labels (strict security level must show it as text).

```mermaid
graph TD
    A["<img src=x onerror=document.title='XSS1'>"] --> B["<b>bold?</b> </script> $& {{NONCE}}"]
    click A call alert(1)
```

Slide 2: syntax error (shows the failure notice, navigation keeps working).

```mermaid
graph TD
    A --> --> B
```

Slide 3: breaking out of the pre element.

```mermaid
sequenceDiagram
    Alice->>Bob: </pre><script>document.title='XSS3'</script>
```

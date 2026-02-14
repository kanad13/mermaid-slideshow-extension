# Architecture

Design decisions and architectural patterns for the Mermaid Slideshow extension.

## Overview

The extension extracts Mermaid diagram code blocks from markdown files and renders them as a navigable slideshow in a VS Code webview panel. The entire implementation lives in a single file (`src/extension.js`) with no runtime dependencies.

## High-Level Flow

```
User opens .md file → clicks "Mermaid Slideshow"
         ↓
extractMermaidBlocks(rawText) → string[]
         ↓
getWebviewContent(diagrams, nonce) → HTML
         ↓
Webview renders first diagram via Mermaid CDN
         ↓
User navigates with arrow keys / scroll / click
         ↓
On file edit: postMessage({ type: 'update', diagrams }) → re-render
```

One active webview panel per session, reused across files. This minimizes resource consumption and simplifies state management.

## Key Functions

| Function | Purpose |
|---|---|
| `extractMermaidBlocks(rawText)` | Regex extraction of Mermaid blocks from raw markdown (both ``` and ::: syntax) |
| `getWebviewContent(diagrams, nonce)` | Generates complete slideshow HTML with CSS, navigation JS, and Mermaid CDN |
| `postDiagramUpdate(panel, diagrams)` | Sends updated diagrams to webview via `postMessage` for live updates |
| `getNonce()` | Generates random 32-char alphanumeric token for CSP |
| `activate(context)` | Registers command, manages panel lifecycle, sets up file change listener |

## Live Updates via postMessage

Initial render uses full HTML replacement (`panel.webview.html = ...`). Subsequent updates use `postMessage` to send new diagram data to the existing webview, which re-renders the current slide without losing navigation state. This avoids the cost and flicker of full HTML replacement on every keystroke.

## Security Model

Markdown files may contain malicious content. Defense layers:

1. **CSP with Nonces:** Fresh nonce per render. Only scripts with matching nonce execute. CDN whitelisted by domain (`https://cdn.jsdelivr.net`).
2. **No HTML Parsing:** Raw text regex extraction only — no markdown-to-HTML conversion, no user HTML passed through.
3. **Trusted CDN Only:** Mermaid loaded from jsDelivr. No user-provided JavaScript execution.
4. **VS Code Sandbox:** Webview isolated from filesystem and VS Code internals.

## State Management

Closure-based inside `activate()`:
- `currentPanel` — the active webview (or `undefined`)
- `currentDocument` — the document being previewed

`onDidChangeTextDocument` listener triggers re-extraction and `postMessage` on every edit. Slide index preserved by clamping to the new diagram count.

## Guidelines for Changes

**Safe to modify:** CSS styling, navigation UX, slide layout, adding new diagram metadata.

**Requires care:** CSP header, nonce generation, Mermaid extraction regex, state management lifecycle.

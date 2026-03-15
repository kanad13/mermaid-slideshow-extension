# Architecture

Design decisions and architectural patterns for the Mermaid Slideshow extension.

## Overview

The extension presents Mermaid diagrams, images, and markdown content from markdown files as a focused, full-panel slideshow in a VS Code webview. Each piece of content is rendered on its own slide with keyboard and mouse navigation. The entire implementation lives in a single file (`src/extension.js`) with no runtime dependencies — both Mermaid and the markdown parser (marked) are loaded via CDN in the webview.

## High-Level Flow

```
User opens .md file → clicks "Mermaid Slideshow"
         ↓
extractSlides(rawText, options) → Slide[]
  (splits on --- separators, classifies mermaid/image/markdown)
         ↓
getWebviewContent(slides, nonce, theme, webview, docUri) → HTML
  (resolves local image paths to webview URIs)
         ↓
Webview renders first slide:
  - mermaid → mermaid.run()
  - image → <img> centered with object-fit
  - markdown → marked.parse() to styled HTML
         ↓
User navigates with arrow keys / scroll / click
         ↓
On file edit: postMessage({ type: 'update', slides }) → re-render
```

One active webview panel per session, reused across files. This minimizes resource consumption and simplifies state management.

## Slide Model

Each slide is a typed object:

```javascript
{ type: "mermaid" | "image" | "markdown", content: string }
```

- **mermaid**: Raw Mermaid diagram code (rendered via `mermaid.run()`)
- **image**: Image URI (local paths resolved to webview-safe URIs, HTTPS URLs passed through)
- **markdown**: Raw markdown text (rendered via `marked.parse()` in the webview)

## Key Functions

| Function | Purpose |
|---|---|
| `extractSlides(rawText, options)` | Splits markdown on `---` separators, finds mermaid blocks, images, and markdown sections in document order. Respects feature toggle options. |
| `extractSlidesFromSection(section, slides, ...)` | Processes a single section between `---` separators. Finds mermaid/image tokens, emits slides in position order with markdown leftovers. |
| `extractMermaidBlocks(rawText)` | Legacy wrapper — returns only mermaid content strings for backward compatibility. |
| `isBlankMarkdown(text)` | Determines if a markdown section has meaningful content (filters heading-only sections). |
| `resolveSettings()` | Reads `enableImages` and `enableMarkdownSlides` from VS Code configuration. |
| `resolveTheme()` | Resolves Mermaid theme from user setting + VS Code color theme auto-detection. |
| `getWebviewContent(slides, nonce, theme, webview, docUri)` | Generates complete slideshow HTML from template, resolving local image paths to webview URIs. |
| `postSlideUpdate(panel, slides)` | Sends updated slides to webview via `postMessage` for live updates. |
| `getNonce()` | Generates random 32-char alphanumeric token for CSP. |
| `activate(context)` | Registers command, manages panel lifecycle, sets up file change, config change, and color theme change listeners. |

## Extraction Algorithm

1. Split raw text on `---` / `***` / `___` horizontal rules (multiline regex).
2. For each section:
   - Find all mermaid blocks (backtick and Azure DevOps syntax) with positions.
   - Find all `![alt](src)` image references with positions (excluding those inside code fences).
   - Sort tokens by document position.
   - Emit slides interleaved with markdown leftover text between tokens.
3. Feature toggles (`enableMermaid`, `enableImages`, `enableMarkdown`) gate which types are included.

## Live Updates via postMessage

Initial render uses full HTML replacement (`panel.webview.html = ...`). Subsequent updates use `postMessage` to send new slide data to the existing webview, which re-renders the current slide without losing navigation state. This avoids the cost and flicker of full HTML replacement on every keystroke.

## Security Model

Markdown files may contain malicious content. Defense layers:

1. **CSP with Nonces:** Fresh nonce per render. Only scripts with matching nonce execute. CDN whitelisted by domain (`https://cdn.jsdelivr.net`).
2. **Image URI Allowlist:** `img-src` CSP directive allows the webview's own `cspSource` (for local images) and `https:` (for remote images). No `data:` or `blob:` URIs.
3. **Attribute Escaping:** Image `src` values are HTML-attribute-escaped before insertion to prevent injection.
4. **Markdown Rendering via Trusted CDN:** `marked` library loaded from jsDelivr renders markdown to HTML. While this does produce user-influenced HTML, it runs inside the VS Code webview sandbox which is isolated from the filesystem and VS Code internals.
5. **VS Code Sandbox:** Webview isolated from filesystem and VS Code internals.

## State Management

Closure-based inside `activate()`:
- `currentPanel` - the active webview (or `undefined`)
- `currentDocument` - the document being previewed

Helper functions `buildSlides(doc)` and `fullRender()` encapsulate the common patterns of extracting slides and generating HTML.

`onDidChangeTextDocument` listener triggers re-extraction and `postMessage` on every edit. Slide index preserved by clamping to the new slide count.

`onDidChangeConfiguration` listener detects changes to theme, `enableImages`, or `enableMarkdownSlides` and does a full HTML replacement. This resets slide position (acceptable since setting changes are infrequent).

## Guidelines for Changes

**Safe to modify:** CSS styling, navigation UX, slide layout, adding new slide types.

**Requires care:** CSP header, nonce generation, extraction regexes, image URI resolution, state management lifecycle.

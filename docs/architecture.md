# Architecture

Technical architecture of the Markdown Presentation Tool VS Code extension.

## Overview

Markdown Presentation Tool is a VS Code extension that presents markdown content as a navigable slideshow in a webview panel. Users wrap sections of their markdown file in `<!-- slide -->` delimiter pairs, and each pair's content becomes one slide with full markdown rendering — headings, paragraphs, lists, blockquotes, code blocks, and Mermaid diagrams.

## Branch Strategy and History

This repository carries two independent VS Code extension tracks on separate branches:

| Branch | Extension ID | What it does |
| --- | --- | --- |
| `main` | `mermaid-slideshow` | Original extension. Renders only Mermaid diagrams as a slideshow. Published and stable. |
| `markmaid-slideshow` | `markdown-presentation-tool` | Current extension. Renders full markdown content as a navigable slideshow. This branch. |

**Why two branches instead of one?** The original `mermaid-slideshow` extension on `main` only extracted Mermaid diagram blocks and ignored all other markdown content. The `markdown-presentation-tool` extension is a fundamentally different product — it renders full markdown slides with mixed content. Rather than breaking existing users of the Mermaid-only extension, the new extension was developed on a separate branch under a separate extension ID. The two branches are never merged into each other.

## Slide Extraction Pipeline

The single entry point is `getSlides()` in `src/extension.js`. It auto-detects which extraction path to use:

### Slide mode (file contains `<!-- slide -->` delimiters)

Handled by `splitSlides()`. Delimiters work as paired fences:

1. The 1st delimiter opens a slide, the 2nd closes it, the 3rd opens the next, etc.
2. Content outside any open/close pair is discarded (preamble, gaps between pairs, trailing text after a close).
3. If the file ends with a slide still open (odd number of delimiters), EOF acts as an implicit close.
4. Empty slides (open immediately followed by close) are skipped.
5. Delimiters inside fenced code blocks (`` ``` `` or `::: mermaid`) are ignored.
6. YAML front matter (`---` at line 0, closed by `---` or `...`) is stripped before processing.

This lets authors keep notes, documentation, and metadata in the same file without it appearing in the slideshow.

### Mermaid-only mode (no `<!-- slide -->` delimiters)

Handled by `extractMermaidBlocks()`. This is the backward-compatible path from the original `mermaid-slideshow` extension. It extracts only Mermaid code blocks (backtick `` ```mermaid `` and Azure DevOps `::: mermaid` syntax), wraps each in a Mermaid fence, and returns one slide per diagram. All surrounding markdown text is discarded.

This mode exists so that files written for the original Mermaid-only extension continue to work without modification.

### Detection logic

`hasSlideDelimiter()` checks whether the file contains at least one `<!-- slide -->` on its own line (case-insensitive). If yes, slide mode is used. If no, mermaid-only mode is used.

## Webview Rendering

The webview is a single HTML file (`src/webview.html`) that handles both modes through the same code path:

1. **Template injection** — `getWebviewContent()` reads `src/webview.html` and replaces placeholder tokens (`{{NONCE}}`, `{{THEME}}`, `{{SLIDES_JSON}}`, `{{BODY_CLASSES}}`) with runtime values.
2. **Markdown-to-HTML** — `renderMarkdownToHtml()` is a lightweight inline parser in the webview that handles headings, paragraphs, lists (ordered/unordered), blockquotes, horizontal rules, inline formatting (bold, italic, code), fenced code blocks, and Mermaid fences.
3. **Mermaid rendering** — Mermaid is loaded via CDN (`https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs`). After the markdown parser emits `<pre class="mermaid">` elements, `mermaid.run()` renders them to SVG.
4. **CSP nonce** — Every webview render generates a fresh cryptographic nonce injected into the Content Security Policy header. Only scripts with the matching nonce can execute.

## Live Update Mechanism

When the source document changes in the editor:

1. `onDidChangeTextDocument` fires.
2. A 300ms debounce timer prevents excessive re-renders during rapid typing.
3. After the debounce, `getSlides()` re-extracts slides from the current document text.
4. The updated slides are sent to the webview via `postMessage({ type: 'update', slides })`.
5. The webview receives the message, replaces its slide array, and re-renders the current slide (clamping the index if slides were removed).

The webview is also fully re-rendered (not just updated via message) when:
- The user changes any `markdownPresentation.*` setting (theme, counter visibility, navigation arrow visibility).
- The VS Code color theme changes (which affects the auto-detected Mermaid theme).

## Key Files

| File | Purpose |
| --- | --- |
| `src/extension.js` | All extension logic: activation, slide extraction (`getSlides`, `splitSlides`, `extractMermaidBlocks`), webview panel management, live update wiring |
| `src/webview.html` | Webview renderer: markdown-to-HTML parser, Mermaid CDN initialization, slide navigation UI, keyboard/mouse handlers |
| `test/extension.test.js` | Unit tests for slide extraction logic (uses Node.js built-in test runner) |
| `examples/01-classic-mode.md` | Mermaid-only test file (no slide delimiters, backward-compat testing) |
| `examples/02-slide-mode-basics.md` | Happy-path slide mode examples — mixed content and both fence syntaxes |
| `examples/03-slide-mode-advanced.md` | Slide mode edge cases — preamble, gaps, empty pairs, tall slide scroll |

## Design Decisions

| Decision | Rationale |
| --- | --- |
| No TypeScript | Single-file extension with no complex type hierarchies. Plain JS keeps the build toolchain minimal. |
| No bundler | Only one source file (`extension.js`) and one template (`webview.html`). No need for webpack/esbuild. |
| No runtime dependencies | Mermaid is loaded via CDN in the webview, not bundled. The extension itself uses only Node.js built-ins and the VS Code API. |
| Closure-based state | Panel, document, and timer state are held in closures inside `activate()`. No classes, no globals. |
| Paired fence delimiters | `<!-- slide -->` pairs (open/close) let authors keep notes and documentation outside slides in the same file, matching the mental model of code fences. |
| `<!-- slide -->` not `---` | `---` conflicts with Markdown horizontal rules and YAML front matter. HTML comments are unambiguous and invisible in normal markdown rendering. |
| Backward-compat mermaid-only mode | Files without `<!-- slide -->` fall back to extracting Mermaid blocks only, preserving compatibility with the original `mermaid-slideshow` extension. |

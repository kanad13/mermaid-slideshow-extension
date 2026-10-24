# Architecture

This document explains how Mermaid Slideshow turns a markdown file into a slideshow, why the code has its current shape, and which parts need care when you change them.

## Overview

The extension shows each Mermaid diagram of a markdown file as one full-panel slide in a VS Code webview. The implementation has three parts and one external library.

- **Extension host code:** `src/extension.js` reads the document, registers the command, and manages the single webview panel.
- **Webview template:** `src/webview.html` holds the page markup, styles, and the script that renders and navigates slides.
- **Mermaid library:** the webview loads it at runtime from a CDN, so the package has no runtime dependencies.
- **VS Code API:** it supplies documents, settings, color themes, and the webview panel.

**Terms used in this document:**

- **Webview:** a web page that VS Code displays inside an editor panel, isolated from the rest of the editor.
- **CDN:** a content delivery network, which serves a library file over the internet. This extension uses jsDelivr.
- **Content Security Policy:** a rule set in the page that limits which scripts, styles, and network requests the browser allows.
- **Nonce:** a random value that a script tag must carry to run under the policy, and that changes with every render.
- **Debounce:** a short wait after each edit, restarted by the next edit, so one burst of typing causes one update.

The extension has no build step. VS Code runs `src/extension.js` directly, and the packaged extension contains the source files.

## End-to-end flow

```
User runs "Show Mermaid Slideshow" on a markdown file
        ↓
extractMermaidBlocks(rawText) → string[]
        ↓
getWebviewContent(diagrams, nonce, theme) → HTML
        ↓
Webview loads Mermaid from the CDN and renders slide 1
        ↓
User navigates with arrow keys, scroll wheel, or the on-screen arrows
        ↓
User edits the file → debounced postMessage({ type: "update", diagrams }) → re-render
```

## Components and responsibilities

| Component                                   | Responsibility                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `extractMermaidBlocks(rawText)`             | Finds Mermaid blocks in document order, in both the backtick and the `:::` syntax                                      |
| `getNonce()`                                | Returns a random Content Security Policy nonce from the operating system's random source                               |
| `resolveTheme()`                            | Maps the `mermaidSlideshow.theme` setting and the editor color theme to one of the four Mermaid themes                 |
| `getWebviewContent(diagrams, nonce, theme)` | Fills the template placeholders in one pass and returns the page                                                       |
| `activate(context)`                         | Registers the command, owns the panel and the current document, and subscribes to document, setting, and theme changes |
| `scripts/webview-harness.js`                | Serves the real page on localhost so you can inspect rendering in a browser                                            |

## How the pieces interact

**Panel and document:**

- One panel exists at a time, and running the command on another file reuses it.
- `currentPanel` and `currentDocument` live in closures inside `activate()`, so the module has no globals.
- Closing the panel clears both and cancels any pending update.

**Live updates:**

- Each edit of the shown document restarts a 300 ms timer.
- When the timer fires, the extension checks that the panel still shows that document, extracts the blocks, and posts them to the webview.
- The webview keeps its slide index and clamps it to the new slide count.

**Full re-render:**

- A change of the theme setting or the editor color theme replaces the page HTML with a fresh nonce.
- The page then starts at the first slide.

**Empty state:**

- The page template renders the "no diagrams" message itself, so the same page and message listener exist for files without diagrams.
- Adding the first diagram to such a file therefore appears through a normal live update.

## Security model

Markdown files can come from untrusted sources, and workspace settings travel with a repository. The design assumes that diagram text and the theme setting are hostile.

| Layer                          | Mechanism                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Content Security Policy        | `default-src 'none'`, scripts only with the render's nonce or from the CDN host, inline styles for Mermaid output   |
| Random nonce                   | 16 bytes from `crypto.randomBytes`, new for every render                                                            |
| Escaped data in the page       | `toScriptJson` escapes `<`, `>`, `&`, U+2028, and U+2029, so diagram text cannot end the script element             |
| Single-pass substitution       | One regular expression replaces every placeholder with a replacer function, so inserted text is never scanned again |
| Theme allowlist                | The theme value must be one of four names before it reaches the script                                              |
| Mermaid default security level | The page never sets `securityLevel`; Mermaid sanitizes labels and disables click handlers                           |
| Render API                     | `mermaid.render()` returns SVG, and diagram text never passes through `innerHTML`; notices use `textContent`        |
| Webview resource access        | The panel grants no local resource roots because the page loads no local files                                      |
| Untrusted workspaces           | `package.json` declares support, because the theme allowlist and the escaping make a hostile folder harmless        |
| Webview sandbox                | VS Code isolates the webview from the filesystem and from extension internals                                       |

The security limits that follow from loading code from a CDN are described in [dependencies.md](dependencies.md).

## Failure behavior

| Condition                              | Result                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| Mermaid fails to load                  | The slide area shows a notice, and navigation and the empty state keep working  |
| One diagram has a syntax error         | That slide shows "Failed to render diagram N", and other slides render normally |
| Render finishes after a newer request  | The page drops the stale result using a render token                            |
| Update message has an unexpected shape | The page ignores it                                                             |
| Command runs without a markdown editor | The extension shows an error message and opens no panel                         |

## Design decisions

**Single file and no runtime dependencies:**

- The logic is small, so one file is easier to read than a module tree.
- Mermaid is large, and the CDN keeps the package small.
- Split the file when it exceeds roughly 1500 lines.

**CDN loading with an exact version:**

- One constant, `MERMAID_VERSION` in `src/extension.js`, names the version.
- An exact version keeps rendering and security behavior reviewable.

**Regular-expression extraction:**

- The extension needs only the diagram text, so a markdown parser would add weight without benefit.
- A single alternation over both syntaxes keeps slides in document order.

**Slide position across full re-renders:**

- A full re-render starts at the first slide, because the extension stores no slide state.
- [decisions.md](decisions.md) records why persisting it is deferred.

## Guidelines for changes

**Safe to modify:**

- CSS styling, navigation behavior, and slide layout in `src/webview.html`.

**Requires care:**

- The Content Security Policy, nonce generation, and template substitution.
- The extraction regular expression, because it defines which text becomes a slide.
- The panel lifecycle, because timers and event listeners outlive a single command run.

**Required checks after a change:**

- Run `npm test`.
- Follow the manual checks in [testing.md](testing.md) for anything the tests cannot reach.

## Related documents

- [development.md](development.md) describes setup, workflow, and release.
- [dependencies.md](dependencies.md) holds the dependency and version policy.
- [testing.md](testing.md) maps workflows to evidence.
- [decisions.md](decisions.md) records ideas that are not built.

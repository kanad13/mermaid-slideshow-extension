# Conventions & Architecture Rules

These rules ensure consistency across sessions. Follow them exactly.

## Code Style (enforced by ESLint)

- **Indentation:** Tabs (not spaces)
- **Quotes:** Double quotes (`"`)
- **Semicolons:** Required
- **Line endings:** Unix (LF)
- **Language target:** ES2020
- **Module system:** CommonJS (`require`/`module.exports`)

## Architecture Constraints

1. **Single source file:** All extension logic lives in `src/extension.js`. No splitting into modules unless the file exceeds ~1500 lines.
2. **Closure-based state:** `currentPanel` and `currentDocument` live inside `activate()`. No global state, no classes.
3. **Single webview panel:** One panel at a time, reused across files. Track via `currentPanel`.
4. **No runtime dependencies beyond VS Code API.** Mermaid is loaded via CDN in the webview. The `marked` library is being removed.
5. **CSP nonces:** Every webview render generates a fresh nonce. All inline scripts must carry it. CDN scripts whitelisted by domain only (`https://cdn.jsdelivr.net`).

## Webview Rules

- All CSS is inline in the HTML template (no external stylesheets except CDN)
- All JS is inline in the HTML template (no bundled webview scripts)
- Mermaid loaded as ES module from CDN: `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs`
- `securityLevel: 'loose'` for Mermaid (allows all diagram types)
- No `eval()`, no dynamic script injection

## Mermaid Extraction

Two syntaxes must be supported:

1. **Backtick style:** ` ```mermaid ... ``` `
2. **Azure DevOps style:** `::: mermaid ... :::`

Extraction operates on raw markdown text via regex, before any parsing. This is the established pattern — do not change the approach.

## Documentation Style

- JSDoc on all exported/public functions: `@param`, `@returns`, brief description
- Inline comments only where logic is non-obvious
- No comment headers, banners, or decorative separators
- No TODO comments in committed code — track work items in `.dev/PLAN.md`

## Naming

- Extension ID prefix: `mermaidSlides`
- Command IDs: `mermaidSlides.<action>` (e.g., `mermaidSlides.showPreview`)
- Functions: camelCase, verb-first (e.g., `extractMermaidBlocks`, `getWebviewContent`)
- CSS classes: kebab-case (e.g., `slide-container`, `slide-counter`)

## Testing Approach

- Manual testing via F5 debug launch (defined in `.vscode/launch.json`)
- Test file at `examples/test.md` with diverse Mermaid diagram types
- Each phase has a user milestone — do not proceed until it passes
- `npm run lint` must pass before any phase is considered complete

## What Not To Do

- Do not add TypeScript — this project is JavaScript
- Do not add frameworks (React, Svelte, etc.) to the webview
- Do not bundle webview scripts with webpack — keep them inline
- Do not add configuration settings until explicitly requested
- Do not add features not in `.dev/PLAN.md`

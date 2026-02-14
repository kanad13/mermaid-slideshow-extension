# Mermaid Slideshow - VS Code Extension

## Key Context

This extension presents Mermaid diagrams from markdown files as a focused, full-panel slideshow in a VS Code webview. Each diagram gets its own slide with keyboard/mouse navigation and live updates on edit. Package name: `mermaid-slideshow`, command prefix: `mermaidSlideshow`.

- Single source file: `src/extension.js`
- No runtime dependencies - Mermaid loaded via CDN in webview
- Closure-based state (no classes, no globals)
- CSP nonce security on all webview renders

## Architecture Rules

- All extension logic in `src/extension.js` unless it exceeds ~1500 lines
- Single webview panel, reused across files
- No TypeScript, no frameworks, no bundled webview scripts
- Mermaid CDN: `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs`
- Two extraction syntaxes: backtick (```) and Azure DevOps (:::)

## Code Style (enforced by ESLint)

- Tabs, double quotes, semicolons, Unix line endings
- ES2020, CommonJS (`require`/`module.exports`)
- JSDoc on all exported/public functions
- No TODO comments in code - track in issues

## Git Commits

Concise, imperative mood. Describe *what changed*. Commit at meaningful intervals.

## Testing

- Manual testing via F5 debug launch
- Test file at `examples/test.md` with diverse Mermaid diagram types
- `npm run lint` must pass before any work is considered complete

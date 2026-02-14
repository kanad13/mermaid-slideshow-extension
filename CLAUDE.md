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

## Multi-File Change Protocol

When a task touches 3+ files or requires multiple related edits:

1. **Branch first** - always work on a feature branch, never directly on main
2. **File-touch matrix** - map which files each change touches, then group/sequence to minimize redundant edits to the same file across commits
3. **Phase the work** - group changes into logical phases (infra/config first, then code, then tests). Never fix a file you're about to delete
4. **Gate each phase** - after each phase: commit, build `.vsix`, run tests, verify before proceeding
5. **Track in a workplan** - for 4+ phases, create a `WORKPLAN.md` (delete when done) with the matrix and checklist

## Testing

- Manual testing via F5 debug launch
- Test file at `examples/test.md` with diverse Mermaid diagram types
- `npm test` must pass before any work is considered complete

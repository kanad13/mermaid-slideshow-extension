# Markdown Slideshow - VS Code Extension

## Branch Status

This is the `markmaid-slideshow` branch. It is building `markdown-slideshow` — a **new, independent VS Code extension** that is distinct from the `mermaid-slideshow` extension on `main`.

**Key files:**
- `src/extension.js` — all extension logic
- `src/webview.html` — webview renderer with markdown-to-HTML and Mermaid support
- `test/extension.test.js` — unit tests
- `docs/development.md` — development, CI, and release workflow

---

## Key Context

This extension presents markdown content as a navigable slideshow in a VS Code webview. It supports **two modes**, auto-detected per file:

**Classic mode** (no `<!-- slide -->` in the file): each Mermaid diagram block is one slide, identical to the original mermaid-slideshow behavior. Entry point: `getSlides()` wraps each extracted Mermaid block in a fence and returns it as a slide.

**Slide mode** (file contains `<!-- slide -->`): the file is split at `<!-- slide -->` HTML comment delimiters. Each section between delimiters becomes one slide with full markdown rendering — headings, paragraphs, lists, blockquotes, inline code, bold/italic, and Mermaid diagrams all render correctly on the same slide.

Both modes share the same webview renderer (`renderMarkdownToHtml` in `src/webview.html`). The dispatcher is `getSlides()` in `src/extension.js`.

- Single source file: `src/extension.js`
- No runtime dependencies — Mermaid loaded via CDN in webview
- Closure-based state (no classes, no globals)
- CSP nonce security on all webview renders

---

## Architecture Rules

- All extension logic in `src/extension.js`
- Single webview panel, reused across files
- No TypeScript, no frameworks, no bundled webview scripts
- Mermaid CDN: `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs`
- `getSlides()` is the single entry point for slide extraction — never call `extractMermaidBlocks()` or `splitSlides()` directly from `activate()`
- Slide delimiter: `<!-- slide -->` (HTML comment on its own line, case-insensitive)
- Do NOT use `---` as a slide delimiter — it conflicts with Markdown `<hr>` and YAML front matter
- Two Mermaid syntaxes supported inside slides: backtick (` ```mermaid `) and Azure DevOps (`:::`)

---

## Code Style (enforced by ESLint)

- Tabs, double quotes, semicolons, Unix line endings
- ES2020, CommonJS (`require`/`module.exports`)
- JSDoc on all exported/public functions
- No TODO comments in code — track in issues

---

## Git Commits

Commit at regular intervals. Include detailed comments on why changes were made (e.g. to fix which issues, to implement what features, etc.)

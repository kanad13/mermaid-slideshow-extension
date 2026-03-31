# Agent Brief: Implement Markdown Slide Mode

**Read this document first. It is your complete brief.**

---

## What You Are Working On

This is `mermaid-slideshow`, a VS Code extension that shows Mermaid diagrams
from markdown files as a navigable slideshow in a WebView panel. It is
deliberately minimal: one source file (`src/extension.js`), one webview template
(`src/webview.html`), Mermaid loaded from CDN, no bundler, no TypeScript.

**Your task:** Implement "slide mode" — the ability for a user to divide a markdown
file into slides using `<!-- slide -->` HTML comment delimiters, with each slide
supporting mixed markdown text and Mermaid diagrams.

---

## Repository State When You Start

- Branch: `feat/render-markdown-on-slides`
- Source code: **at `main` baseline** (a previous PR was reviewed and rejected; source was reset to clean state)
- `pr_review_docs/` folder: contains design documents — read them
- `npm test` on the baseline passes — confirm this before making any changes

```
src/extension.js      — 261 lines  (main baseline)
src/webview.html      — ~150 lines (main baseline)
test/extension.test.js — ~90 lines (main baseline)
examples/test.md      — classic test file, no changes needed
```

---

## What NOT to Do Before Reading the Docs

Do NOT start implementing. First read:
1. `pr_review_docs/plan.md` — your step-by-step implementation guide
2. `pr_review_docs/extracted-code.md` — the code to adapt (with annotations)
3. `pr_review_docs/rationale.md` — the "why" behind key decisions (important for edge cases)

You do NOT need to read `pr_review_docs/findings.md` unless you want background
on what the rejected PR did wrong.

---

## The Single Most Important Constraint

**The slide delimiter is `<!-- slide -->` (an HTML comment), NOT `---`.**

`---` is a standard Markdown horizontal rule and YAML front matter delimiter.
Using it would silently break every existing user's files. This decision is
non-negotiable. All code, tests, comments, and documentation must use `<!-- slide -->`.

---

## Architecture Overview

Two modes, auto-detected, no user setting required:

```
File with <!-- slide --> → slide mode  → splitSlides()  → markdown sections → renderMarkdownToHtml()
File without delimiter  → classic mode → extractMermaidBlocks() + wrap in fences → renderMarkdownToHtml()
```

Key point: the webview always uses `renderMarkdownToHtml()`. Classic mode feeds
it mermaid-fence-wrapped strings; slide mode feeds it full markdown sections.
One rendering path, two feed sources.

The dispatcher `getSlides(rawText)` is the single entry point called from
`activate()` and all event handlers. Never call `extractMermaidBlocks` or
`splitSlides` directly from the extension activation code.

---

## Implementation Phases (summary)

| Phase | File | Summary |
|---|---|---|
| 1 | `src/extension.js` | Add `hasSlideDelimiter`, `splitSlides`, `getSlides`. Replace 4 call sites with `getSlides`. Rename `postDiagramUpdate` → `postSlidesUpdate`. Update exports. |
| 2 | `src/webview.html` | Add CSS (`.slide-inner` card + typography + `<hr>` rule; fix `overflow: visible`). Swap `<pre class="mermaid">` → `<div class="slide-inner">`. Add `escapeHtml`, `renderInline`, `renderMarkdownToHtml` (with `<hr>` + raw mermaid). Update `renderSlide` (restore error handling). Add keyboard shortcuts. |
| 3 | `test/extension.test.js` | Update import. Add `describe("splitSlides", ...)`, `describe("hasSlideDelimiter", ...)`, `describe("getSlides", ...)` blocks. |
| 4 | `examples/` | Create `slide-mode-demo.md` to demonstrate slide mode. |
| 5 | `CLAUDE.md`, `CHANGELOG.md`, `package.json` | Document the new capability; update description and keywords in package.json. |

Full phase details are in `pr_review_docs/plan.md`.
Full code for each piece is in `pr_review_docs/extracted-code.md`.

---

## Critical Implementation Notes

### `splitSlides` must skip YAML front matter

Files that start with `---\nkey: value\n---` (YAML front matter) must have that
block stripped before splitting. Detect it at line 0:
```javascript
if (lines[0] === "---") {
    for (let j = 1; j < lines.length; j++) {
        if (lines[j] === "---" || lines[j] === "...") {
            startLine = j + 1;
            break;
        }
    }
}
```
Start the main loop from `startLine` instead of `0`. Full code in `extracted-code.md`.

### `---` is now a valid `<hr>` — add it to `renderMarkdownToHtml`

Because `---` is no longer the slide separator, it should render as an HTML
horizontal rule inside slides. Add this branch before headings/paragraphs:
```javascript
if (/^\s*[-*_]{3,}\s*$/.test(line)) {
    html += '<hr />';
    continue;
}
```
Also add the CSS rule: `.slide-inner hr { border: none; border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35)); margin: 0.8em 0; }`

### Fix `.slide-inner { overflow: hidden }` → `overflow: visible`

The PR's CSS clips tall slide content. Change to `overflow: visible` so the
parent `.slide-content` (which has `overflow: auto`) handles scrolling.

### Mermaid content must NOT be HTML-escaped

When building HTML for a Mermaid fence (`<pre class="mermaid">`), inject the
Mermaid source code raw — do NOT call `escapeHtml()` on it:
```javascript
if (inMermaid) {
    html += line + '\n';   // raw, no escapeHtml
    continue;
}
```
Generic code fences (non-mermaid) SHOULD be HTML-escaped. See `rationale.md`
→ Decision 7 for the full explanation.

### Restore the render error message

The rejected PR deleted the UI error message from `renderSlide`'s catch block.
**Restore it.** When Mermaid fails to render, the user must see a message in
the slide, not just a console log:
```javascript
} catch (error) {
    console.error('Mermaid rendering failed:', error);
    container.innerHTML = '<p style="color: var(--vscode-errorForeground);">Failed to render slide ' + (currentIndex + 1) + ' — check the Mermaid syntax.</p>';
}
```

### Test structure

New tests go in **new** `describe` blocks with their own names. Do NOT modify
the existing `describe("extractMermaidBlocks", ...)` block.

### Empty-state message in `getWebviewContent`

Update the empty-state HTML in `extension.js` to reference `<!-- slide -->`, not `---`:
```html
<p style="font-size: 0.85em;">Add a \`\`\`mermaid block, or use &lt;!-- slide --&gt; to divide your file into slides.</p>
```

---

## Quality Gates

After Phase 1: `npm test` must pass.
After Phase 2: F5 debug launch. Verify `examples/test.md` shows one diagram per slide (classic mode). Verify a test file with `<!-- slide -->` shows one section per slide (slide mode).
After Phase 3: `npm test` must pass with all new tests green.
After Phase 5: `npm run lint` must pass with 0 warnings.

---

## Commit Strategy

Commit after each phase. Each commit must individually pass `npm test`.

1. `feat: add hasSlideDelimiter, splitSlides, getSlides; auto-detect slide mode`
2. `feat: add markdown renderer and typography to webview; restore error handling`
3. `test: add splitSlides, hasSlideDelimiter, getSlides test suites`
4. `docs: add slide-mode-demo.md example`
5. `docs: update CLAUDE.md and CHANGELOG for slide mode`

---

## Files You Should NOT Touch

- `examples/test.md` — classic mode regression test, leave as-is
- `package.json` — no new dependencies
- Any existing test in `describe("extractMermaidBlocks", ...)`
- `getNonce()`, `resolveTheme()`, VS Code event subscription code in `activate()`

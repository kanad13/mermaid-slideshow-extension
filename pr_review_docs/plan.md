# Implementation Plan: Markdown Slide Mode

**Prerequisite:** Source code is at `main` baseline. Read `findings.md` and
`rationale.md` before executing. Use `extracted-code.md` as reference for
functions to implement — do not copy blindly, read the annotations.

**Run before starting:** `npm test` on the clean main baseline must pass.

---

## Phase 1 — `src/extension.js`: Add new functions, update dispatcher

**No deletions. Pure additions plus rename of one function and its call sites.**

### 1.1 — Add three functions after `extractMermaidBlocks` (~line 40)

Add `hasSlideDelimiter`, `splitSlides`, and `getSlides` in that order.
Full source with JSDoc is in `extracted-code.md` → "Functions for extension.js".
Read the annotations — particularly:
- The `<!-- slide -->` delimiter regex
- The YAML front matter skip at the start of `splitSlides`
- The mermaid-fence wrapping in `getSlides`

### 1.2 — Update `getWebviewContent`

- Rename parameter `diagrams` → `slides`
- Update JSDoc to describe slide mode
- Change empty-state message to reference `<!-- slide -->` delimiter, not `---`
- Change template placeholder: `{{DIAGRAMS_JSON}}` → `{{SLIDES_JSON}}`
- Add XSS protection to JSON injection:
  ```javascript
  html = html.replace("{{SLIDES_JSON}}", JSON.stringify(slides).replace(/</g, "\\u003c"));
  ```

### 1.3 — Replace all `extractMermaidBlocks()` call sites with `getSlides()`

There are exactly 4 call sites in `activate()`:
- Inside the command handler
- Inside `changeDocumentSubscription` (debounced)
- Inside `changeConfigSubscription`
- Inside `changeColorThemeSubscription`

Replace each one. Use `slides` as the local variable name throughout.

### 1.4 — Rename `postDiagramUpdate` → `postSlidesUpdate`

Update both the function definition and its one call site in the debounce callback.
Update the postMessage key: `diagrams:` → `slides:`.

### 1.5 — Update module exports

```javascript
module.exports = {
    activate,
    deactivate,
    extractMermaidBlocks,
    hasSlideDelimiter,
    splitSlides,
    getSlides,
};
```

### 1.6 — Update `activate()` JSDoc

Mention both modes in the function description.

**Quality gate:** `npm test` must pass after Phase 1 (no webview changes yet).
There should be zero test regressions. The new exported functions are tested
in Phase 3.

---

## Phase 2 — `src/webview.html`: Add rendering capability

### 2.1 — CSS changes

**Remove from body:**
```css
user-select: none;
```

**Replace** `.slide-content .mermaid { ... }` and `.slide-content .mermaid svg { ... }` selectors.
Remove both — they target the old structure.

**Change** `.slide-content` `align-items: center` → `align-items: stretch`.

**Add** after `.slide-content { ... }` block: the `.slide-inner` card styles and all
typography rules. Full CSS source is in `extracted-code.md` → "CSS additions for webview.html".

⚠️ **Fix from PR:** Change `.slide-inner { overflow: hidden }` → `.slide-inner { overflow: visible }`.
The PR's `overflow: hidden` clips tall slide content inside the flex container.
See `findings.md` → Issue 9.

**Add `<hr>` rule** inside `.slide-inner` styles:
```css
.slide-inner hr {
    border: none;
    border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35));
    margin: 0.8em 0;
}
```

### 2.2 — HTML structure

Replace:
```html
<pre class="mermaid"></pre>
```
With:
```html
<div class="slide-inner"></div>
```

### 2.3 — JavaScript: template variable

Replace `const diagrams = {{DIAGRAMS_JSON}};` → `const slides = {{SLIDES_JSON}};`

### 2.4 — JavaScript: container selector

Replace `document.querySelector('.slide-content')` → `document.querySelector('.slide-inner')`

### 2.5 — JavaScript: add helper functions

Add `escapeHtml()`, `renderInline()`, and `renderMarkdownToHtml()` before `renderSlide`.
Full source is in `extracted-code.md` → "JavaScript functions for webview.html".

**Critical corrections from the PR:**
1. Mermaid content must NOT be HTML-escaped (see `rationale.md` → Decision 7)
2. `renderMarkdownToHtml` must handle `---`/`***`/`___` lines as `<hr>` — this
   was not possible in the PR (separator collision) but is now correct behaviour.
   Add this branch before the heading/paragraph fallthrough:
   ```javascript
   // Horizontal rule (---, ***, ___)
   if (/^\s*[-*_]{3,}\s*$/.test(line)) {
       html += '<hr />';
       continue;
   }
   ```

### 2.6 — JavaScript: update `renderSlide`

Replace the function body. The new version:
- Calls `renderMarkdownToHtml(slides[currentIndex])` to build the innerHTML
- Calls `mermaid.run({ querySelector: '.mermaid' })` after setting innerHTML
- **Restores** the catch-block UI error message (this was deleted in the PR — regression)

```javascript
async function renderSlide(index) {
    currentIndex = index;
    const markdown = slides[currentIndex];
    container.innerHTML = renderMarkdownToHtml(markdown);
    try {
        await mermaid.run({ querySelector: '.mermaid' });
    } catch (error) {
        console.error('Mermaid rendering failed:', error);
        container.innerHTML = '<p style="color: var(--vscode-errorForeground);">Failed to render slide ' + (currentIndex + 1) + ' — check the Mermaid syntax.</p>';
    }
    counter.textContent = (currentIndex + 1) + ' / ' + slides.length;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === slides.length - 1;
}
```

### 2.7 — JavaScript: keyboard shortcuts

Add PageDown, PageUp, Space to the `keydown` listener:
```javascript
if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
```

### 2.8 — JavaScript: update `message` event handler

Change `message.diagrams` → `message.slides`, `diagrams.length` → `slides.length`.

### 2.9 — JavaScript: update initial render

Replace `renderSlide(0)` with the null-safe version:
```javascript
if (slides.length === 0) {
    container.innerHTML = '<p style="color: var(--vscode-descriptionForeground);">No slides found.</p>';
    counter.textContent = '';
    document.body.classList.add('single-slide');
} else {
    document.body.classList.toggle('single-slide', slides.length === 1);
    renderSlide(0);
}
```

**Quality gate:** F5 debug launch. Test with `examples/test.md` (classic mode —
no `<!-- slide -->` — should show one diagram per slide). Test with a new file
containing `<!-- slide -->` (slide mode — should show full markdown per section).

---

## Phase 3 — `test/extension.test.js`

### 3.1 — Update import line

```javascript
const { extractMermaidBlocks, hasSlideDelimiter, splitSlides, getSlides } = require("../src/extension");
```

### 3.2 — Add three new `describe` blocks

Add after the existing `extractMermaidBlocks` describe block:

- `describe("splitSlides", ...)` — tests for the `splitSlides` function
- `describe("hasSlideDelimiter", ...)` — tests for the detection function
- `describe("getSlides", ...)` — integration-style tests for the dispatcher

Full test source is in `extracted-code.md` → "Tests for extension.test.js".

Note: The PR's tests used `---` as the delimiter and were inside the wrong
`describe` block. The tests here use `<!-- slide -->` and are in their own blocks.

**Quality gate:** `npm test` must pass with all new tests green. No existing tests
should be modified or removed.

---

## Phase 4 — `examples/` updates

### 4.1 — Do NOT modify `examples/test.md`

This file has no `<!-- slide -->` delimiters. It tests classic mode. Leave it as-is.

### 4.2 — Create `examples/slide-mode-demo.md`

New file that demonstrates slide mode. Include:
- A title-only slide (markdown prose, no diagram)
- A slide with text + a Mermaid flowchart
- A slide with a bulleted list + a sequence diagram
- A slide with mermaid-only content (to verify classic mermaid still renders)

The `<!-- slide -->` delimiters between sections should be visible and clearly
annotated in the file with a comment above them.

---

## Phase 5 — Documentation

### 5.1 — `CLAUDE.md`

Add to "Key Context" section:
```
Two modes of operation:
- Classic mode (default): no <!-- slide --> in file → each Mermaid block is one slide
- Slide mode (opt-in): file contains <!-- slide --> → each section between delimiters is one slide with full markdown rendering
```

Add to "Architecture Rules":
```
- Slide detection: hasSlideDelimiter() → getSlides() is the single entry point; never call extractMermaidBlocks or splitSlides directly from activate()
- Slide delimiter: <!-- slide --> (HTML comment on its own line, case-insensitive)
- Do NOT use --- as slide delimiter (conflicts with Markdown hr and YAML front matter)
```

Update the "Two extraction syntaxes" bullet to mention slide mode.

### 5.2 — `CHANGELOG.md`

Add an `[Unreleased]` section:
```markdown
## [Unreleased]

### Added
- Slide mode: add `<!-- slide -->` HTML comments to divide a file into mixed-content slides (markdown text and diagrams on the same slide)
- Keyboard navigation: PageDown, PageUp, and Space bar added alongside existing arrow keys
- Markdown rendering: headings, paragraphs, lists, blockquotes, horizontal rules, inline code/bold/italic rendered in slide mode
- YAML front matter is automatically skipped and not shown as slide content

### Changed
- Text selection now enabled in the preview panel

### Fixed
- Classic mermaid-only mode is fully preserved; files without `<!-- slide -->` behave identically to v1.1.4

### Security
- Slide content JSON uses unicode escaping for `<` characters to prevent injection
```

### 5.3 — `package.json`

Update the `description` field to mention markdown slide mode:
```json
"description": "Preview Mermaid diagrams and markdown slides in a focused, navigable slideshow with keyboard controls and live updates as you edit."
```

Add `"slides"` and `"mixed content"` to the `keywords` array if not already present.

No version bump here — that happens separately when releasing.

---

## File Touch Matrix

Every file is touched at most once across phases.

| File | Phase | Change type |
|---|---|---|
| `src/extension.js` | 1 | Add 3 functions (with YAML skip in splitSlides), rename 1, replace 4 call sites, update exports |
| `src/webview.html` | 2 | CSS: remove 2, add 11 rules (incl. `<hr>`); HTML: swap 1 element; JS: add 3 functions + `<hr>` branch, update 5 blocks |
| `test/extension.test.js` | 3 | Update 1 import, add 3 describe blocks (~40 lines) |
| `examples/test.md` | — | No change |
| `examples/slide-mode-demo.md` | 4 | New file |
| `CLAUDE.md` | 5 | ~15 lines added |
| `CHANGELOG.md` | 5 | ~25 lines added |
| `package.json` | 5 | description + keywords update |

---

## Commit Plan

One commit per phase. Each commit must individually pass `npm test`.

1. `feat: add hasSlideDelimiter, splitSlides, getSlides; auto-detect slide mode`
2. `feat: add markdown renderer and typography to webview; restore error handling`
3. `test: add splitSlides, hasSlideDelimiter, getSlides test suites`
4. `docs: add slide-mode-demo.md example`
5. `docs: update CLAUDE.md, CHANGELOG, package.json for slide mode`

---

## Things NOT to Do

- Do NOT use `---` as slide delimiter anywhere — in code, tests, comments, or docs
- Do NOT remove `extractMermaidBlocks` — it is the engine for classic mode
- Do NOT add a VS Code setting for slide mode — auto-detection is the design
- Do NOT add a markdown parser npm package
- Do NOT modify `resolveTheme`, `getNonce`, or any of the VS Code event subscription wiring
- Do NOT modify or remove existing tests in the `extractMermaidBlocks` describe block
- Do NOT HTML-escape content inside Mermaid fences (see `rationale.md` → Decision 7)
- Do NOT use `.slide-inner { overflow: hidden }` — use `overflow: visible` (see findings.md Issue 9)

---

## Known Limitations (acceptable, document but do not fix in this pass)

- Nested lists not supported (only flat)
- Markdown links `[text](url)` rendered as raw text
- Tables (GFM pipe syntax) not rendered
- Images not rendered (CSP blocks most sources anyway)
- Multi-line blockquotes collapse to single-line

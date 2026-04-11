# Implementation Plan: Markdown Slide Mode

Implementation sequencing lives here; `planned-changes/code-snippets.md` groups snippets by target file / concern rather than strict phase order.

## Phase 1 — `src/extension.js`: Add new functions, update dispatcher

**No deletions. Pure additions plus rename of one function and its call sites.**

### 1.1 — Add three functions after `extractMermaidBlocks` (~line 40)

Add `hasSlideDelimiter`, `splitSlides`, and `getSlides` in that order.
Full source with JSDoc is in `planned-changes/code-snippets.md` → "Functions for `src/extension.js`".

### 1.2 — Update `getWebviewContent`

- Rename parameter `diagrams` → `slides`
- Update JSDoc to describe slide mode
- Change empty-state message to exactly: `No slides found in this file. Add a \`\`\`mermaid\`\`\` block in classic mode, or add <!-- slide --> HTML comments on their own line to divide the file into mixed markdown and diagram slides.`
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
Keep the existing 300ms debounce interval in `changeDocumentSubscription`.

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
There should be zero test regressions. The new exported functions are tested in Phase 3.

---

## Phase 2 — `src/webview.html`: Add rendering capability

### 2.1 — CSS changes

**Remove from body:**
```css
user-select: none;
```

Delete the two old selectors:
- `.slide-content .mermaid { ... }`
- `.slide-content .mermaid svg { ... }`

(These targeted the old structure. The new `.slide-inner` card layout below replaces them.)

**Change** `.slide-container` `align-items: center` → `align-items: flex-start` so tall slides start at the top edge instead of being vertically centered.

**Change** `.slide-content` `align-items: center` → `align-items: flex-start`.

(`align-items: stretch` looks intuitive but causes the flex child to fill the container's fixed height, so tall-slide content overflows with `overflow: visible` but the parent's `overflow: auto` never triggers a scrollbar. `flex-start` lets `.slide-inner` grow to its natural content height and correctly activates the scrollbar on tall slides.)

`.slide-content` remains the outer scroll container for tall slides. Keep vertical scrolling on `.slide-content`, not `.slide-inner`.

**Add** after `.slide-content { ... }` block: the `.slide-inner` card styles and all
typography rules. Full CSS source is in `planned-changes/code-snippets.md` → "CSS additions for `src/webview.html`".


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

### 2.3 — JavaScript: template variable and `goNext` rename

Replace `const diagrams = {{DIAGRAMS_JSON}};` → `const slides = {{SLIDES_JSON}};`

Also update `goNext` — the only function outside `renderSlide` and the message handler that references `diagrams`:

```javascript
function goNext() {
    if (currentIndex < slides.length - 1) {
        renderSlide(currentIndex + 1);
    }
}
```

(`goPrev` only checks `currentIndex > 0` — no `diagrams` reference, no change needed.)

### 2.4 — JavaScript: container selectors

Replace `document.querySelector('.slide-content')` → `document.querySelector('.slide-inner')` for `container`.

Keep a separate `scrollContainer` reference to `.slide-content` for internal slide scrolling:

```javascript
const container = document.querySelector('.slide-inner');
const scrollContainer = document.querySelector('.slide-content');
```

### 2.5 — JavaScript: add helper functions

Add `escapeHtml()`, `renderInline()`, and `renderMarkdownToHtml()` before `renderSlide`.
Full source is in `planned-changes/code-snippets.md` → "JavaScript functions for `src/webview.html`".

### 2.6 — JavaScript: update `renderSlide`

Replace the function body. The new version:
- Calls `renderMarkdownToHtml(slides[currentIndex])` to build the innerHTML
- Resets `.slide-content` scroll position to the top on every slide change
- Calls `mermaid.run({ querySelector: '.mermaid' })` after setting innerHTML
- **Restores** the catch-block UI error message (this was deleted in the PR — regression)

```javascript
async function renderSlide(index) {
    currentIndex = index;
    const markdown = slides[currentIndex];
    container.innerHTML = renderMarkdownToHtml(markdown);
    scrollContainer.scrollTop = 0;
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

### 2.8 — JavaScript: wheel navigation and in-slide scrolling

Preserve the branch's wheel behavior, but align it with the final slide-mode structure:

- Plain wheel changes slides (debounced, same navigation semantics as arrow keys)
- `Shift + wheel` scrolls within `.slide-content` without changing slides
- For `Shift + wheel`, use whichever axis has the larger magnitude (`deltaY` or `deltaX`) so macOS trackpads and horizontal-wheel emulation behave consistently
- Do not consume the plain-wheel event or start the cooldown when already at the first/last slide and no navigation can occur
- Only call `preventDefault()` / `stopPropagation()` when internal scrolling or slide navigation actually happens

Full source is in `planned-changes/code-snippets.md` → "Wheel navigation and internal scrolling for `src/webview.html`".

### 2.9 — JavaScript: update `message` event handler

Locate `window.addEventListener('message', ...)` in the script and update the handler in place:

- Change `message.diagrams` → `message.slides`
- Change `diagrams.length` → `slides.length`
- Change any `diagrams.push(...)` update logic to use `slides.push(...)`

Full source is in `planned-changes/code-snippets.md` → "Message event handler update for `src/webview.html`".

### 2.10 — JavaScript: update initial render

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
Also verify a tall slide: the scrollbar appears on `.slide-content`, `Shift + wheel`
scrolls inside the current slide, and plain wheel still changes slides. Navigate
away from a scrolled tall slide and confirm the next slide opens at the top
(`scrollContainer.scrollTop` resets on slide change).

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

Full test source is in `planned-changes/code-snippets.md` → "Tests for `test/extension.test.js`".

Note: The PR's tests used `---` as the delimiter and were inside the wrong
`describe` block. The tests here use `<!-- slide -->` and are in their own blocks.

**Quality gate:** `npm test` must pass with all new tests green. No existing tests
should be modified or removed.

---

## Phase 4 — `examples/` updates

### 4.1 — Create `examples/slide-mode-demo.md`

New file that demonstrates slide mode. Include:
- A title-only slide (markdown prose, no diagram)
- A slide with text + a Mermaid flowchart
- A slide with a bulleted list + a sequence diagram
- A deliberately tall slide (enough content to exceed the viewport) to verify the
    `.slide-content` scrollbar and `Shift + wheel` internal scrolling behavior
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
- Tall slide scrolling: hold `Shift` while using the mouse wheel / trackpad to scroll within the current slide without changing slides
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

### 5.4 — `readme.md`

Update the README so the feature is discoverable from the marketplace/repo front page.
Add or revise documentation for:

- The two modes of operation: classic mode vs slide mode
- The slide delimiter: `<!-- slide -->`
- Mixed-content slides (markdown + Mermaid on the same slide)
- Navigation controls: arrow keys, PageUp/PageDown, Space, mouse wheel
- Tall slide behavior: `Shift + wheel` scrolls within the current slide, while plain wheel changes slides
- A short example snippet showing `<!-- slide -->` with at least one markdown section and one Mermaid block

# PR Findings: `feat/render-markdown-on-slides`

Adversarial review of the PR against `main`. Verdict: **do not merge as-is.**
The goal of the PR is valid and worth implementing — but the execution has
critical architectural mistakes that must be corrected before any code lands.

---

## What the PR Does

The PR makes a major paradigm shift to the extension:

| Aspect | Before (main) | After (PR) |
|---|---|---|
| Slide unit | One Mermaid diagram per slide | One `---`-delimited markdown section per slide |
| Text content | Filtered out — only diagrams shown | Fully rendered — headings, lists, paragraphs, diagrams |
| Extraction fn | `extractMermaidBlocks()` | `splitSlides()` (new) |
| Webview rendering | Direct `<pre class="mermaid">` injection | Custom `renderMarkdownToHtml()` (new, ~160 lines) |

The intent — allowing slides with mixed markdown and diagrams — is a genuine,
valuable improvement to the extension.

---

## Critical Issues

### Issue 1 — `---` as slide separator causes silent data corruption

`---` (three dashes on their own line) is valid Markdown syntax with two established meanings:
1. **Horizontal rule** (`<hr>`) — extremely common in markdown files
2. **YAML front matter delimiter** — used by Jekyll, Hugo, Obsidian, GitHub Pages, VS Code's own markdown preview

**Impact:** Any user who opens an existing markdown file with horizontal rules
will find their file silently split into slides at every `---`. A file with three
visual section dividers becomes four involuntary slides. A file with YAML front
matter gets its metadata treated as Slide 1.

This affects **every existing user** of the extension. There is no warning, no
opt-in, and no way to know this happened other than noticing the slide count changed.

The fence-tracking inside `splitSlides()` is well-implemented — `---` inside
fenced code blocks is correctly ignored — but that doesn't help with the
document-level collision.

This is the single most important reason the PR cannot be merged.

---

### Issue 2 — Backward compatibility completely destroyed

The original extension behaviour ("each Mermaid block is its own slide") is
permanently gone for any file that does not add `---` separators.

**Before:** A user's existing `diagrams.md` with 9 Mermaid blocks → 9 slides, clean.

**After:** Same file without any `---` → entire 170-line file becomes one single
scrollable slide with all 9 diagrams and all prose crammed together.

The test file `examples/test.md` explicitly described the original value proposition:
> "this text will not appear in the slideshow; only the diagram will be presented"

The PR contradicts this for every existing user who hasn't been told about the
new syntax.

---

### Issue 3 — `extractMermaidBlocks` is dead code

The function is still exported and has its tests, but it is never called in the
actual extension flow (`activate()` or any event handler). It was silently
orphaned by the `splitSlides` replacement. Any call site that used to call
`extractMermaidBlocks` now calls `splitSlides` unconditionally.

---

### Issue 4 — Mermaid render error handling regressed

Main branch — user sees an error message in the slide:
```javascript
container.innerHTML = '<p style="color: var(--vscode-errorForeground);">Failed to render diagram ' + (currentIndex + 1) + '</p>';
```

PR branch — error is silently logged to console only:
```javascript
} catch (error) {
    console.error('Mermaid rendering failed:', error);
    // the UI error message line was deleted
}
```

Users with a broken Mermaid block see a blank slide. There is no in-UI indication
of what happened.

---

## Minor Issues

### Issue 5 — New tests placed inside wrong `describe` block

The four new `splitSlides` tests are nested inside `describe("extractMermaidBlocks", ...)`.
They should be in their own `describe("splitSlides", ...)` block.

### Issue 6 — Trailing whitespace introduced

`src/extension.js` line 243 (in `activate()`, after the language check) has a
trailing tab character. Minor but will fail a strict ESLint configuration.

### Issue 7 — Mermaid content is HTML-escaped before injection (fragile, not wrong)

In `renderMarkdownToHtml`, code inside fences — including Mermaid blocks — passes
through `escapeHtml()`:
```javascript
if (inCode || inMermaidColon) {
    html += escapeHtml(line) + '\n';
    continue;
}
```

This converts `-->` to `--&gt;`, `<` to `&lt;`, etc. inside `<pre class="mermaid">`.

This *works* because Mermaid reads `element.textContent` (which decodes HTML
entities back to raw characters) rather than `innerHTML`. However it is fragile:
any future refactor that changes how the pre's content is read would silently
break all diagrams. Mermaid code should be injected raw, without HTML escaping.

The fix for the mermaid fence branch in the new code should use a separate path
that does NOT call `escapeHtml`.

### Issue 8 — Empty-state message references `---`

The empty-state HTML in `getWebviewContent()` (inside extension.js) hardcodes:
```html
<p>...separate slides with a line containing only <code>---</code>.</p>
```
Changing the separator requires updating this template literal too.

### Issue 9 — CSS: `.slide-inner { overflow: hidden }` silently clips content

The PR's `.slide-inner` card container has:
```css
.slide-inner {
    ...
    overflow: hidden;  /* ← BUG */
}
```

`overflow: hidden` clips any content that overflows the element's computed bounds.
While `.slide-inner` has no explicit height (so it auto-expands vertically), the
`overflow: hidden` causes problems in practice:

- In a flex layout (`align-items: stretch`), the element can be constrained to
  the parent's height; `overflow: hidden` then clips the bottom of long slides
  rather than allowing the parent `.slide-content` to scroll.
- For wide Mermaid diagrams that don't fit in 960px, horizontal content gets
  clipped rather than triggering a scroll.

**Fix:** Change to `overflow: visible` (let the parent `.slide-content` with
`overflow: auto` handle scrolling) or simply remove the `overflow` declaration.

### Issue 10 — No `<hr>` rendering despite `---` now being free

The PR uses `---` as the slide separator, so it cannot also render `---` as
`<hr>`. However, since the correct implementation uses `<!-- slide -->` as the
separator, `---` (and `***`, `___`) are now free Markdown constructs.
The `renderMarkdownToHtml` function should handle them as `<hr>` elements —
matching standard Markdown behaviour.

### Issue 11 — YAML front matter appears as slide content

Files commonly begin with YAML front matter:
```
---
title: My Notes
date: 2024-01-01
---
```
In slide mode, this block would appear as the first slide's raw text content,
which is ugly and unintended. `splitSlides()` should detect and skip a leading
YAML front matter block (lines starting with `---`, ending with `---` or `...`,
at the very beginning of the file).

---

## What the PR Gets Right

These parts of the PR are good and should be carried forward:

| Item | Why |
|---|---|
| `renderMarkdownToHtml()` concept | This is the core new capability. Needs the escaping fix but is otherwise well-structured |
| `escapeHtml()` and `renderInline()` helpers | Good security practice, clean implementations |
| `.slide-inner` card CSS | Better visual presentation — fix `overflow: hidden` before using |
| Typography CSS (h1-h6, p, ul, ol, pre, code) | Necessary for the new rendering capability |
| `align-items: stretch` on `.slide-content` | Correct for variable-height slides; `center` was wrong for text |
| Removed `user-select: none` | Users should be able to copy text from slides |
| PageDown / PageUp / Space keyboard shortcuts | Sensible presentation-style navigation additions |
| `JSON.stringify(slides).replace(/</g, "\\u003c")` | XSS protection in the JSON injection into the template |
| Initial render null-check | Defensive: handles the zero-slides case gracefully on load |
| The `splitSlides()` concept and algorithm | Sound approach — needs new delimiter and YAML skip |
| 4 new unit tests | Good coverage pattern — needs correct delimiter and correct describe block |

---

## Answers to Specific Questions

### Does the PR introduce markdown-only rendering?

Yes. A slide can now contain:
- Markdown text only (no Mermaid)
- Mermaid diagram only
- Mixed: markdown text + one or more Mermaid diagrams

### Is the view crammed if a slide has too many items?

Yes, potentially. `.slide-content` uses `overflow: auto` so it scrolls, but
scrolling breaks the slideshow mental model. The CSS `max-height: calc(100vh - 120px)`
constrains the visible area, and SVG diagrams are capped at `calc(100vh - 180px)`.
For well-authored slides this is fine; for slides with many diagrams it will scroll.
This is an acceptable trade-off: the user controls what goes on each slide.

### Would a file with no separator produce a crammed single slide?

Yes. This is Issue 2 above. In the PR, any file without `---` separators renders
the entire file as one slide. The fix is the two-mode auto-detection described in
`rationale.md`.

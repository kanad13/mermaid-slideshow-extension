# Architectural Rationale

This document records the reasoning behind each key decision in the
implementation plan. Read this before challenging any decision — the goal
is to make the reasoning explicit so it can be contested if circumstances change.

---

## Decision 1 — Slide Delimiter: `<!-- slide -->`

**Chosen:** `<!-- slide -->` (HTML comment on its own line, case-insensitive)

**Regex:** `/^<!--\s*slide\s*-->\s*$/im`

**Rejected alternatives:**

| Candidate | Why rejected |
|---|---|
| `---` (PR choice) | Standard Markdown horizontal rule AND YAML front matter delimiter. Collides with existing files silently. |
| `+++` | Not standard Markdown but occasionally used in TOML front matter (Hugo). Uncommon but possible collision. |
| `===` | Used as Setext-style h1 underline in some Markdown flavours. |
| `::slide::` or `:::slide:::` | Similar to Azure DevOps fenced div syntax; could confuse people working in those contexts. |
| `<!-- new-slide -->` | Equally valid but less terse. Could be a tolerated variant. |
| A VS Code setting | Adds user-facing configuration complexity with no real benefit. Auto-detection is better UX. |

**Why `<!-- slide -->` is correct:**

1. **HTML comment** — invisible in all standard Markdown renderers (GitHub, VS Code built-in preview, Obsidian, Jekyll, Hugo). The delimiter does not visually pollute the document.
2. **Self-documenting** — `<!-- slide -->` tells any human reader exactly what it does.
3. **Precedent** — reveal.js uses `<!-- .slide: -->`, Marp uses `---` (but Marp files are typically NOT also rendered as standard Markdown). Our choice aligns with the HTML-comment-as-presentation-marker pattern.
4. **Zero collision risk** — HTML comments are not Mermaid syntax, not YAML, not any standard Markdown construct. A user would only write `<!-- slide -->` on its own line intentionally.
5. **grep-friendly** — `grep -n "<!-- slide -->"` finds all slide boundaries instantly.

---

## Decision 2 — Two-Mode Auto-Detection

**Chosen:** Single `getSlides()` dispatcher that auto-detects mode based on file content.

**Modes:**
- **Classic mode** (no `<!-- slide -->` found): call `extractMermaidBlocks()`, wrap each result in a mermaid fence, return as slides.
- **Slide mode** (`<!-- slide -->` found): call `splitSlides()`, return markdown sections as slides.

**How:** One detection function:
```javascript
function hasSlideDelimiter(rawText) {
    return /^<!--\s*slide\s*-->\s*$/im.test(rawText);
}
```

One dispatcher (the only entry point called from `activate()` and event handlers):
```javascript
function getSlides(rawText) {
    if (hasSlideDelimiter(rawText)) {
        return splitSlides(rawText);
    }
    return extractMermaidBlocks(rawText).map(d => '```mermaid\n' + d + '\n```');
}
```

**Why auto-detection over an explicit setting:**
- Existing users get their original behaviour with zero configuration change.
- New slide-mode users opt in simply by adding `<!-- slide -->` to their file.
- No setting to discover, document, or support. The file *is* the configuration.
- Consistent with the "zero config" principle already present in the extension
  (theme auto-detects from VS Code colour theme; activation auto-detects from file type).

**Why wrap classic diagrams in a fence rather than keeping a separate render path:**
The webview should have one rendering code path, not two. If classic mode feeds
raw Mermaid code to the webview and slide mode feeds markdown strings, the webview
needs `if (mode === 'classic') { ... } else { ... }`. That complexity lives in the
wrong place. Instead, normalise at the extension level: always send markdown strings
that contain mermaid fences. The webview's `renderMarkdownToHtml()` handles both cases.

**Why `hasSlideDelimiter()` regex, not `slides.length > 1`:**

An alternative approach (suggested by at least one other reviewer) is to call
`splitSlides()` eagerly and use `result.length > 1` as the mode signal instead of
a separate detection function:
```javascript
function getSlides(rawText) {
    const parts = splitSlides(rawText);
    if (parts.length > 1) return parts;        // slide mode
    return extractMermaidBlocks(rawText).map(d => '```mermaid\n' + d + '\n```');
}
```

This is appealing (fewer functions, no regex), but has a reliability problem:
- A user who adds `<!-- slide -->` at the end of their file but only has one
  non-empty section gets `parts.length === 1`, silently falling through to classic
  mode. Their intent (slide mode) is ignored with no indication why.
- A file with two `<!-- slide -->` delimiters flanking blank content produces
  `length === 1` (empty slides are skipped), same failure.

The explicit `hasSlideDelimiter()` regex tests for *intent* (did the user add a
delimiter?) rather than *outcome* (did we get multiple sections?). Intent is the
right signal. The regex is O(n) on the text — no worse than calling `splitSlides`.

---

## Decision 3 — File Structure: One File vs. Multiple Files

**Chosen:** Keep all extension logic in `src/extension.js` (plus `src/webview.html` which already exists).

**Note on CLAUDE.md guidance:** CLAUDE.md states "All extension logic in `src/extension.js`
unless it exceeds ~1500 lines." This decision was made when the extension was
mermaid-only. The project owner acknowledges this rule may be imperfect. Here is
an **independent assessment** rather than a blind deference to the rule:

### Arguments for splitting (e.g., `src/slides.js`)

- `hasSlideDelimiter`, `splitSlides`, `getSlides` are ~100 lines of pure functions with no VS Code API dependencies.
- They are individually testable without the vscode mock (except that loading `extension.js` requires the mock regardless).
- A separate `src/slides.js` would make the concern boundary explicit.

### Arguments against splitting (keep in `extension.js`)

- At ~340 lines post-change, `extension.js` is immediately readable in full without scrolling.
- The parsing functions are tightly motivated by the extension context. Reading them in isolation from their callers loses that context.
- A `require('./slides')` adds navigation overhead for what is essentially one screen of code.
- The functions are written-once, stable code. There is no active velocity reason to isolate them.

### Independent verdict: **Keep together, for now.**

The 1500-line threshold in CLAUDE.md is a blunt rule. A more principled criterion:
**split when a concern has enough independent behaviour that it warrants its own
test file, and when the concern is likely to grow independently.** The slide
parsing logic does not meet this bar yet.

**When to revisit:** If the slide parsing grows to handle YAML front matter
stripping, link rewriting, image proxying, or other file-level transformations
(>200 lines of parsing logic), extract to `src/slides.js` and add
`test/slides.test.js` as a companion. That is the right trigger, not line count.

### What about `src/webview.html`?

The `renderMarkdownToHtml()` function lives in `webview.html`'s inline `<script>`.
This is correct — it is **frontend JavaScript** that runs inside the VS Code
WebView (a sandboxed browser context). It cannot be a separate `.js` file loaded
via `require` because the WebView cannot access the local filesystem directly.
Options to externalize it would require converting it to a WebView resource URI
(adding `vscode.Uri.joinPath`, `webview.asWebviewUri`, updating CSP), which is
significant complexity for no practical gain. Keep it inline.

---

## Decision 4 — Branch Strategy: Start Fresh from `main`

**Chosen:** Discard `feat/render-markdown-on-slides`. Create a new branch from `main`.
Salvage useful code from the PR branch via `extracted-code.md` (reference only, not
cherry-picked as commits).

**Alternative:** Rework the existing PR branch — change the separator, restore
backward compat, fix the bugs, rebase.

### Why start fresh

| Dimension | Rework PR branch | Start from main |
|---|---|---|
| Separator change | Touch extension.js + webview.html + tests + docs in a "change what was already changed" pattern; diff is hard to audit | Add once, cleanly; every change has clear intent |
| Restoring backward compat | Requires re-adding `extractMermaidBlocks` call paths that the PR deliberately removed — looks like reverting + re-adding | Additive only; `extractMermaidBlocks` is never removed |
| Test structure | Fix the wrong `describe` block nesting in the same commit that changes the delimiter — messy | Write tests correctly the first time |
| Error handling | Restore the deleted UI error message — another revert-and-re-add | Never delete it; it stays |
| Code review clarity | Final diff mixes reverts, modifications, and additions — hard to verify | Clean, linear additions on top of known-good baseline |
| Risk of merge artifacts | Medium — two people editing the same lines | Low — all new lines |

The *content* of the PR (the markdown renderer, the CSS, the keyboard shortcuts,
the test patterns) is preserved in `extracted-code.md` and will be referenced
during implementation. Nothing useful is thrown away.

---

## Decision 5 — Unified Rendering Path in the Webview

**Chosen:** The webview always uses `renderMarkdownToHtml()`. Classic mode sends
mermaid-fence-wrapped strings; slide mode sends raw markdown sections.

**Consequence:** The webview has no concept of "mode". It receives an array of
markdown strings and renders each one. Whether those strings are one-liner mermaid
fences or multi-paragraph slides is irrelevant to the webview.

**Why this matters:** Future additions (e.g., slide transitions, presenter notes,
print layout) only need to be implemented once in the webview. If the webview had
two distinct rendering paths, every such addition would need to be duplicated.

---

## Decision 6 — No Markdown Parser Dependency

**Chosen:** Custom `renderMarkdownToHtml()` function (~100 lines of line-by-line
parsing), not a library like `marked`, `markdown-it`, or `remark`.

**Why no library:**
- The extension's explicit philosophy is zero runtime dependencies (Mermaid via CDN is the only exception, and it is not bundled).
- A WebView cannot use npm packages directly — any library would need to either be bundled into `webview.html` (defeating the no-bundler approach) or loaded from CDN (adding another CDN dependency, more CSP entries, offline risk).
- The subset of Markdown actually needed is small: headings, paragraphs, lists, inline formatting, blockquotes, fences. A 100-line custom renderer is the right trade-off for this scope.

**Known limitations (acceptable):** The custom renderer does not support tables,
nested blockquotes, multi-line blockquotes, images, or raw HTML. These are
documented in `plan.md` under "Known Limitations". They can be added incrementally
without a library.

---

## Decision 7 — Mermaid Content Must Not Be HTML-Escaped

**Critical correction from the PR:**

The PR's `renderMarkdownToHtml` HTML-escapes ALL content inside fences including
Mermaid blocks:
```javascript
if (inCode || inMermaidColon) {
    html += escapeHtml(line) + '\n';  // BUG: escapes Mermaid syntax
}
```

This converts `A-->B` to `A--&gt;B` inside `<pre class="mermaid">`. It works *in
practice* because Mermaid reads `element.textContent` which decodes entities. But
this is an accidental correctness: a maintainer who changes `textContent` to
`innerHTML` anywhere in the Mermaid call chain would break all diagrams silently.

**Correct implementation:** Mermaid fences (both backtick and colon variants) should
inject raw content:
```javascript
if (inMermaid) {
    html += line + '\n';  // raw, no escaping
    continue;
}
```

Generic non-mermaid code fences SHOULD be HTML-escaped (to display the code as
text rather than parsing it as HTML).

---

## Decision 8 — YAML Front Matter: Skip, Don't Render

**Chosen:** `splitSlides()` detects and skips a leading YAML front matter block
before splitting. The front matter is not included in any slide.

**Detection rule:** A YAML front matter block starts at line 0 with `---` and
ends at the first subsequent line that is `---` or `...`. If line 0 is not `---`,
no skip occurs.

**Why not list it as a "known limitation":**
YAML front matter is extremely common in real-world markdown files that engineers
work with (Obsidian notes, Jekyll posts, Hugo content, GitHub Pages). The whole
point of this extension is to work seamlessly on files the user already has — not
to require them to clean up their files first. Silently rendering `---\ntitle: My
Notes\n---` as the first slide is visibly wrong and erodes trust in the tool.

**Scope:** Only applies to a block at the very start of the file (line 0 = `---`).
YAML blocks further down are not treated as front matter.

**Why skip entirely rather than parse/display:**
- YAML is not Markdown. Rendering it as a slide would show raw `key: value` lines
  with no useful context.
- The user's intent is clear: front matter is document metadata, not presentation
  content.

---

## Decision 9 — Render `---` as `<hr>` Inside Slides

**Chosen:** In `renderMarkdownToHtml()`, a line matching `/^\s*[-*_]{3,}\s*$/`
(the CommonMark horizontal rule pattern) is rendered as `<hr>`.

**Why this was not possible before (and is now):**
The PR used `---` as the slide separator, so any `---` in the content would be
consumed as a separator and never reach the renderer. With `<!-- slide -->` as the
separator, `---` is regular Markdown content that should be rendered as a visual
divider — matching every other Markdown renderer's behaviour.

This is a **bonus correctness gain** from switching the separator. It costs one
extra branch in `renderMarkdownToHtml` and one CSS rule.

**CSS:** Add `hr { border: none; border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35)); margin: 0.8em 0; }` inside `.slide-inner`.

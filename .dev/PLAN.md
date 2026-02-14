# Mermaid Slides Preview — Project Plan

## Objective

Transform the existing Lightweight Markdown Preview extension into **Mermaid Slides Preview**: a VS Code extension that extracts Mermaid diagrams from markdown files and presents them as a navigable slideshow in a side panel.

## Architecture

```
User opens .md file → clicks "Mermaid Slides Preview" button in editor title bar
  → extension extracts all Mermaid blocks (```mermaid and ::: mermaid syntaxes)
  → webview opens beside editor
  → displays one diagram per slide, full-panel, centered
  → user navigates with arrow keys or mouse scroll
  → live-updates when source file changes
```

Single source file (`src/extension.js`), single webview panel, closure-based state. Mermaid rendered client-side via CDN. No markdown parsing needed — raw text regex extraction only.

## Phases

### Phase 1: Foundation
Strip the old extension identity and establish the new one.

- [ ] Update `package.json`: name → `mermaid-slides-preview`, new displayName, description, command ID (`mermaidSlides.showPreview`), remove `marked` dependency
- [ ] Update `src/extension.js`: rename command, update activation log, strip `marked` import
- [ ] Delete old `.vsix` artifact
- [ ] Replace `examples/test.md` with a mermaid-focused test file (multiple diagram types)
- [ ] Verify: `npm run build` succeeds, extension activates, command appears for .md files

**User milestone:** Install extension via F5 debug, open test.md, confirm the command button appears in editor title bar. Clicking it should open an empty/placeholder webview panel.

### Phase 2: Extraction Engine
Isolate and harden the Mermaid block extraction.

- [ ] Refactor Mermaid extraction into a standalone function: `extractMermaidBlocks(rawText) → string[]`
- [ ] Remove all non-Mermaid extraction code (math, headings, TOC, image resolution)
- [ ] Remove all markdown-to-HTML conversion (no more `marked()` calls)
- [ ] Wire extraction into the command handler: extract blocks, pass to webview

**User milestone:** Add `console.log` or notification showing count of extracted diagrams. Open test.md with known diagram count — confirm match.

### Phase 3: Slideshow Webview
Build the core slideshow presentation.

- [ ] New `getWebviewContent()` generating slideshow HTML/CSS/JS
- [ ] Layout: single diagram centered, fills available space
- [ ] Mermaid CDN loaded, renders current slide's diagram
- [ ] Slide counter overlay (e.g., "2 / 5")
- [ ] Navigation: left/right arrow keys cycle slides
- [ ] Navigation: mouse scroll (or scroll wheel) cycles slides
- [ ] CSP nonce security (reuse existing pattern)
- [ ] Handle edge cases: zero diagrams found (show message), single diagram (hide nav)

**User milestone:** Full slideshow working. Open test.md → click preview → see first diagram → navigate through all diagrams with keyboard and scroll. Verify correct count.

### Phase 4: Live Updates
Ensure the preview stays in sync with the source file.

- [ ] `onDidChangeTextDocument` listener re-extracts diagrams on file edit
- [ ] Preserve current slide index when diagrams change (clamp if count decreases)
- [ ] Handle file switch: if user opens different .md file and triggers preview, load new file's diagrams

**User milestone:** Edit test.md (add/remove a diagram), confirm preview updates without losing slide position.

### Phase 5: Cleanup & Ship
Prepare for release.

- [ ] Update `readme.md` for new extension
- [ ] Update `docs/architecture.md` and `docs/development.md`
- [ ] Reset `CHANGELOG.md` for v0.1.0
- [ ] Update/replace `assets/icon.png` if desired
- [ ] `npm run lint` passes
- [ ] `npm run package` produces valid .vsix
- [ ] CI workflows work (push to branch, verify)

**User milestone:** Install .vsix in VS Code (not debug mode). Full end-to-end test.

## Progress Tracking

Update checkboxes above as tasks complete. Each phase must pass its user milestone before proceeding to the next. When resuming work across sessions, read this file first to determine current state.



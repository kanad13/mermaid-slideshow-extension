# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-04-18

### Added
- Remote image rendering: `![alt](https://...)` on its own line now displays inline inside slides; images are automatically constrained to fit the viewport — no scrolling or panning needed
- `markdownPresentation.slide.headingAlignment` — set h1–h6 text alignment: `left` (default), `center`, or `right`
- `markdownPresentation.slide.contentAlignment` — set overall slide text alignment: `left` (default), `center`, or `right`
- `markdownPresentation.slide.fontSize` — set base font size: `small` (0.85em), `medium` (default), or `large` (1.25em)
- `markdownPresentation.slide.backgroundColor` — override the slide background with any CSS color value (e.g. `#1e1e1e`, `rgba(0,0,0,0.8)`); leave empty to follow the VS Code editor background

### Improved
- "No slides found" empty state redesigned: clearer heading, instructions split across readable paragraphs, larger text

## [1.1.1] - 2026-04-17

### Fixed
- Reverted editor title bar icon back to `$(feedback)` — the switch to `$(open-preview)` introduced in v1.0.0 was unintentional

## [1.1.0] - 2026-04-17

### Changed
- Slides now render directly on the editor background — the rounded card border around each slide was removed to match VS Code's native markdown preview
- Configuration key `markdownPresentation.theme` renamed to `markdownPresentation.mermaid.theme` so the Settings UI clearly indicates the option controls Mermaid diagram theming, not overall slide theming
- Settings description for the Mermaid theme option tightened to name "Mermaid diagrams" explicitly

### Added
- `markdownPresentation.slide.showCounter` — toggle the bottom-right slide counter (default: true)
- `markdownPresentation.slide.showNavigationArrows` — toggle the on-screen prev/next arrows; keyboard navigation is unaffected (default: true)

## [1.0.0] - 2026-04-17

First official release of Markdown Presentation Tool — the project is feature-complete and ready for general use.

### Changed
- Editor title bar icon changed from `$(feedback)` to `$(open-preview)` to match VS Code's native Markdown preview icon
- Example files renamed and reorganized for clarity:
  - `examples/test.md` → `examples/01-classic-mode.md`
  - `examples/slide-mode-demo.md` → `examples/02-slide-mode-basics.md` (trimmed to happy-path scenarios)
  - `examples/combined.md` → `examples/03-slide-mode-advanced.md` (focused on edge cases)
- README updated with hero and full-tour demo GIFs

### Added
- `examples/demo-script-short.md` — recording script for the 30-second pitch video
- `examples/demo-script-long.md` — recording script for the 3-minute feature tour video

## [0.3.0] - 2026-04-14

### Changed
- Extension ID renamed from `markdown-slideshow` to `markdown-presentation-tool`
- Command ID renamed from `markdownSlideshow.showPreview` to `markdownPresentation.showPreview`
- Configuration key renamed from `markdownSlideshow.theme` to `markdownPresentation.theme`

## [0.2.0] - 2026-04-14

### Added
- Paired fence slide delimiters: wrap content in `<!-- slide -->` open/close pairs to create slides, just like code fences. Content outside pairs is ignored, letting you keep notes and documentation in the same file.
- Full markdown rendering per slide: headings, paragraphs, lists (ordered/unordered), blockquotes, horizontal rules, inline code, bold, italic, fenced code blocks, and Mermaid diagrams
- Keyboard navigation: arrow keys, PageDown, PageUp, and Space bar
- Tall slide scrolling: hold Shift while scrolling to move within the current slide
- YAML front matter is automatically stripped

### Changed
- Rebranded from "Markdown Slideshow" to "Markdown Presentation Tool"
- Command palette entry renamed to "Show Markdown Presentation"
- Editor title bar icon changed to `$(feedback)` codicon
- README rewritten with user-focused language and clear paired-fence examples
- Architecture and development docs rewritten

### Fixed
- Content before the first `<!-- slide -->` delimiter no longer appears as a slide
- Content between closing and opening delimiter pairs is correctly ignored

### Security
- Slide content JSON uses unicode escaping for `<` characters to prevent injection

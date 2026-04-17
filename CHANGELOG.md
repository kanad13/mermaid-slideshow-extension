# Changelog

All notable changes to this project will be documented in this file.

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

## [1.2.1] - 2026-04-02

### Fixed
- Revert accidental marketplace publish of experimental `feat/image-markdown-slides` branch (1.2.0). This release restores the stable 1.1.4 main branch code.

## [1.1.4] - 2026-03-13

### Fixed
- Replace custom SVG command icon with built-in `$(vm-running)` codicon for correct rendering in dark and high-contrast VS Code themes

### Changed
- Updated readme hero screenshot

## [1.1.3] - 2026-02-15

### Changed
- Repository moved to [mermaid-slideshow-extension](https://github.com/kanad13/mermaid-slideshow-extension) for clarity (separate from the mermaid-slideshow web app)

## [1.1.2] - 2026-02-15

### Fixed
- Republish to correct VS Code marketplace build artifacts

## [1.1.1] - 2026-02-15

### Changed
- Reduced package size from 3.74 MB to 57 KB by excluding demo GIF from distribution (still visible on GitHub)

## [1.1.0] - 2026-02-15

### Added
- Auto-detect Mermaid theme from VS Code color theme (dark/high-contrast themes automatically use Mermaid dark theme)
- Re-renders slideshow when VS Code color theme changes mid-session
- Unit tests for diagram extraction using Node.js built-in test runner
- Webview now respects VS Code light/dark theme for all UI elements (background, nav arrows, counter)

### Changed
- Webview HTML/CSS/JS extracted to separate template file (`src/webview.html`)
- Live preview updates are now debounced (300ms) for better performance on large files
- Panel no longer retains context when hidden (saves memory)
- Dropped webpack - extension ships source directly (no bundler needed for a single-file extension)

### Fixed
- ESLint `sourceType` corrected from `"module"` to `"commonjs"`
- Panel reuse now picks up theme changes when switching files
- Build artifacts (`dist/`) removed from git tracking

## [1.0.0] - 2026-02-14

### Added
- Configurable Mermaid diagram themes (default, dark, forest, neutral) via VS Code Settings
- Explicit activation on markdown files (`onLanguage:markdown`)

### Changed
- Rewritten extension description and README with benefit-oriented branding and use cases
- Updated architecture and development docs to reflect theme configuration

## [0.1.0] - 2026-02-14

### Added
- Mermaid diagram extraction from markdown files (both backtick and Azure DevOps triple-colon syntax)
- Slideshow presentation in a side panel - one diagram per slide, centered
- Keyboard navigation (arrow keys) and mouse scroll navigation between slides
- Clickable navigation arrows
- Slide counter overlay
- Live preview updates when source file changes (preserves current slide position)
- Empty state messaging when no Mermaid diagrams are found
- Single-slide mode (hides navigation when only one diagram exists)

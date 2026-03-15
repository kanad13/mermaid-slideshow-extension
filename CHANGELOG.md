# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-03-15

### Added
- **Image slides:** Markdown images (`![alt](path)`) are now rendered as full-screen presentation slides, centered and scaled to fit without distortion. Supports both local and remote images of any aspect ratio.
- **Markdown content slides:** Text sections separated by horizontal rules (`---`) are rendered as styled slides with full markdown formatting — headings, bullet/numbered lists, nested lists, code blocks, blockquotes, tables, bold, italic, and links.
- **Markdown rendering via CDN:** Uses the `marked` library loaded from jsDelivr (same pattern as Mermaid) — no bundled runtime dependencies added.
- **Settings: `enableImages`** — Toggle image slides on/off (default: on).
- **Settings: `enableMarkdownSlides`** — Toggle markdown content slides on/off (default: on).
- New unified extraction engine (`extractSlides`) that processes all content types in document order.
- 15 new unit tests for the `extractSlides` function covering all slide types, feature toggles, and edge cases.

### Changed
- Extraction engine refactored from `extractMermaidBlocks` (mermaid-only) to `extractSlides` (multi-type, position-aware). The legacy `extractMermaidBlocks` function is preserved as a wrapper for backward compatibility.
- Webview template updated with multi-type slide rendering, image CSS (object-fit, centering), and markdown prose styling.
- CSP updated to allow `img-src` for local webview URIs and HTTPS images.
- Empty-state message updated: "No presentation slides found" (context-aware based on enabled features).
- Settings change listener now responds to `enableImages` and `enableMarkdownSlides` changes in addition to theme changes.
- Updated README, architecture docs, and test file to document all new features.

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

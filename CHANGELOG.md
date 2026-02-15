# Changelog

All notable changes to this project will be documented in this file.

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

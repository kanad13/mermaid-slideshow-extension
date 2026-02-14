# Changelog

All notable changes to this project will be documented in this file.

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

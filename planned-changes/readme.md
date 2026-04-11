# Planned Changes

This folder `planned-changes` contains planning notes and reference snippets for upcoming feature work before it is fully applied to the extension source.

At the moment, the main focus is **Markdown Slide Mode** (mixed markdown + Mermaid slides, updated navigation behavior, and related documentation/testing work).

## What is in here?

- `plan.md` — the implementation plan, phased work breakdown, quality gates, and file-touch map
- `code-snippets.md` — reference code snippets grouped by file and concern to support the plan

## How to use this folder

1. Read `plan.md` first for sequencing and scope.
2. Use `code-snippets.md` as supporting reference while implementing.
3. Treat the files in this folder as planning artifacts, not the live source of truth.

The actual runtime code still lives in `src/`, and these docs exist to make later implementation or careful reapplication much less error-prone.

---

## Pre-feature groundwork already completed on this branch

Before implementing the planned features, the following identity and infrastructure changes were made on this branch. They are **not** feature work — they are prerequisites so that when the features ship, the result is a new, independent VS Code extension rather than an update to the existing mermaid-slideshow extension.

### 1. Extension rebranded to `markdown-slideshow` (v0.1.0)

The planned features (full markdown rendering per slide, `<!-- slide -->` delimiter mode) expand the scope well beyond "Mermaid diagram viewer". To reflect this and maintain it independently from the `main` branch:

- Package name: `mermaid-slideshow` → `markdown-slideshow`
- Display name: `Mermaid Slideshow` → `Markdown Slideshow`
- Command prefix: `mermaidSlideshow` → `markdownSlideshow`
- Version reset to `0.1.0` (clean start for the new extension's lifecycle)
- Updated in: `package.json`, `package-lock.json`, `src/extension.js`, `src/webview.html`, `CLAUDE.md`

### 2. Release workflow automated and guarded

- `release.yml` now publishes to the VS Code Marketplace automatically on tag push (no manual `vsce publish` step)
- A version-match guard was added: the pushed tag must match the `package.json` version, or the workflow fails before publishing — this prevents accidental marketplace releases during active feature development
- `docs/development.md` was rewritten (~450 lines → ~130 lines) to reflect what is automated vs what the developer does manually (6 steps)

### 3. CI workflow scoped to this branch

- `ci.yml` now triggers on pushes and PRs to `markmaid-slideshow` only (not `main`), keeping the two extensions' CI pipelines fully independent

### Implication for post-feature release

Once the planned features are implemented and stable, this branch will produce its first real release of the `markdown-slideshow` extension. The `readme.md`, `CHANGELOG.md`, `docs/architecture.md`, and `examples/test.md` files were intentionally deferred and should be updated alongside or just before that release to accurately describe the new extension's capabilities.

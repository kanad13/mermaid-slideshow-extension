# Planned Changes

This folder `planned-changes` contains planning notes and reference snippets for upcoming feature work before it is fully applied to the extension source.

## Branch context

The current GitHub repository has 2 branches that serve 2 different VS Code extensions:
1. Main branch: `mermaid-slideshow` extension that renders Mermaid diagrams from markdown files, with one diagram per slide.
2. This branch: `markmaid-slideshow` extension that will render full markdown content on slides, including Markdown elements and Mermaid diagrams. Both branches will coexist in the repository, and changes will be cherry-picked between them as needed.

## What is in this folder?

- `plan.md` — the implementation plan, phased work breakdown, quality gates, and file-touch map
- `code-snippets.md` — reference code snippets grouped by file and concern to support the plan

## How to use this folder

1. Read `plan.md` first for sequencing and scope.
2. Use `code-snippets.md` as supporting reference while implementing.
3. Treat the files in this folder as planning artifacts, not the live source of truth.

The actual runtime code still lives in `src/`, and these docs exist to make later implementation or careful reapplication much less error-prone.

## What this folder is not for

This folder should not be used to describe the live development workflow, CI behavior, or release process for the branch. Those operational details belong in `docs/development.md`.

Use this folder for implementation planning only.

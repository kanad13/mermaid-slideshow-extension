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

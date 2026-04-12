# Markdown Slideshow

> This branch is building `markdown-slideshow`, a separate extension track from the published `mermaid-slideshow` extension on `main`.

The runtime implementation on `markmaid-slideshow` is still in progress, so this README is intentionally lightweight for now.

## Workflow summary

- Push to `markmaid-slideshow` and `.github/workflows/ci.yml` starts automatically.
- If the pushed commit is `chore: release vX.Y.Z`, CI automatically calls `.github/workflows/release.yml` after the checks pass.
- Full contributor instructions live in `docs/development.md`.

## Where to look first

- `docs/development.md` — canonical development, CI, and release workflow for this branch
- `planned-changes/plan.md` — phased implementation plan for the markdown slide mode work
- `CLAUDE.md` — branch-specific architecture rules and working assumptions

If you are looking at the public repository homepage and see the stable `Mermaid Slideshow` documentation, that is the `main` branch story. This branch is intentionally different.

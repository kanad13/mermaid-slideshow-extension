# Mermaid Slideshow — VS Code Extension

## Before Starting Any Work

1. Read `.dev/PLAN.md` — understand the objective, find current progress, identify the next incomplete phase
2. Read `.dev/CONVENTIONS.md` — follow all rules exactly
3. Read `src/extension.js` — understand current state of the code
4. Pick up from the first unchecked task in the current phase. Do not skip phases.

## After Completing Work

1. Update checkboxes in `.dev/PLAN.md` for completed tasks
2. If a phase is fully complete, note it and inform the user about the user milestone test needed
3. Run `npm run lint` before declaring any phase done

## Git Commits

Make commits at meaningful intervals — typically after completing each task or a logical group of related tasks within a phase. Do not batch an entire phase into one commit. Commit messages should be concise, imperative mood, and describe *what changed* (e.g., "Strip marked dependency and old markdown parsing pipeline"). Always commit before moving to a new phase.

## Key Context

This extension extracts Mermaid diagrams from markdown files and displays them as a slideshow in a VS Code webview panel. Package name: `mermaid-slideshow`, command prefix: `mermaidSlideshow`. It was built by transforming an existing markdown preview extension. The Mermaid extraction logic from the original codebase is the foundation — do not rewrite it without cause.

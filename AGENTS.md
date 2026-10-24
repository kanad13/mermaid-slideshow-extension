# Mermaid Slideshow - VS Code Extension

## Key Context

This extension presents Mermaid diagrams from markdown files as a focused, full-panel slideshow in a VS Code webview. Each diagram gets its own slide with keyboard and mouse navigation and live updates on edit. Package name: `mermaid-slideshow`. Command prefix: `mermaidSlideshow`.

- Single source file: `src/extension.js`, plus the page template `src/webview.html`.
- No runtime dependencies. Mermaid loads from a CDN in the webview.
- Closure-based state. No classes, no globals.
- CSP nonce and escaped data on every webview render.

## Task Routing

Match the maintainer's request to a workflow in [docs/workflows.md](docs/workflows.md) and run it. Stop at the stopping point that the workflow names. The workflow column must equal a heading in that guide; `test/docs.test.js` checks it.

| If the maintainer says...                                                    | Run workflow             |
| :--------------------------------------------------------------------------- | :----------------------- |
| "Evaluate adding X", "Is X worth it?", "Add a dependency"                    | Evaluate a Change        |
| "Add X", "Implement X" (after approval)                                      | Build an Approved Change |
| "Update", "upgrade", "maintain", "dependency review", "is the repo current?" | Maintain and Upgrade     |
| "X is broken", "fix this bug"                                                | Fix a Defect             |
| "Release", "publish", "ship it"                                              | Release                  |
| "Check for drift", "sync the repo", "are the docs accurate?"                 | Sync and Audit           |
| "Update the docs", "rewrite the README"                                      | Change Documentation     |

- **No match:**
    - A question about the code or the docs gets an answer and no file changes.
    - Any other request that matches no row or several rows: name the closest workflow and ask the maintainer to confirm it.
- **Evidence:**
    - Verify claims about libraries, store rules, and behavior against the code, a command's output, or primary documentation.
    - Report a check as passed only if you ran it.

## Architecture Rules

- Keep all extension logic in `src/extension.js` until it exceeds about 1500 lines.
- Use one webview panel and reuse it across files.
- No TypeScript, no frameworks, no bundled webview scripts.
- Hold the Mermaid version in one constant, `MERMAID_VERSION`, as an exact `x.y.z`.
- Keep the Content Security Policy strict. Never loosen it to silence a console message.
- Extract two syntaxes: backtick fences and Azure DevOps `:::` blocks.

## Code Style (enforced by ESLint and Prettier)

- Tabs, double quotes, semicolons, Unix line endings.
- ES2020 and CommonJS (`require` and `module.exports`).
- JSDoc on all exported and public functions. Comments explain why.
- No TODO comments in code. Track work in issues.
- Run `npm run format` to fix formatting. A global editor hook may reformat files; the repository's Prettier config wins.

## Git and Commits

- Work on a feature branch. Never commit to `main`.
- Write concise, imperative commit subjects that describe what changed. Commit at meaningful intervals.
- Push, tag, merge, and publish only when the maintainer says so in the conversation.
- Add no `Co-Authored-By` trailers, "Generated with" lines, or other tool attribution to commits, pull requests, files, or release notes.

## Multi-File Change Protocol

When a task touches three or more files:

1. Work on a feature branch.
2. Map which files each change touches, then group changes to avoid editing a file twice across commits.
3. Phase the work: configuration first, then code, then tests, then documentation.
4. After each phase, commit, run `npm test`, and build the `.vsix`.
5. For four or more phases, keep a `WORKPLAN.md` with the matrix and checklist, and delete it when done.

## Testing

- `npm test` runs unit tests, lint, and the format check. It must pass on the minimum Node version before any work is complete.
- Test the delivered artifact as well as the source. `test/package.test.js` does this for the package.
- Break each new test's behavior once to confirm that the test fails, then restore the code.
- Manual checks for the webview and the editor are listed in `docs/testing.md`. Use `examples/test.md` and `test/fixtures/hostile.md`.

## Where to Look

- [docs/architecture.md](docs/architecture.md): design and security model.
- [docs/development.md](docs/development.md): setup, workflow, and release procedure.
- [docs/dependencies.md](docs/dependencies.md): dependency and version policy. Read it before you change any version.
- [docs/testing.md](docs/testing.md): workflow-to-evidence map and manual checks.
- [docs/workflows.md](docs/workflows.md): the procedure and stopping point for each kind of request.
- [docs/decisions.md](docs/decisions.md): ideas that are not built. It is context, not a task list. Do not implement an entry without a maintainer request.

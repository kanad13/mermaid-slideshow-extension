# Development Guide

This is the single source of truth for developing, testing, and releasing the Markdown Presentation Tool. For architecture details, see [architecture.md](architecture.md).


## Key Source Files

| File | Purpose |
| --- | --- |
| `src/extension.js` | All extension logic: activation, slide extraction, webview panel management |
| `src/webview.html` | Webview renderer: Markdown-to-HTML, Mermaid via CDN, slide navigation |
| `test/extension.test.js` | Node.js unit tests |
| `examples/01-classic-mode.md` | Classic mode test file (no slide delimiters) — one slide per Mermaid diagram, for backward compatibility |
| `examples/02-slide-mode-basics.md` | Slide mode happy-path examples — text + diagrams, mermaid-only slides, both fence syntaxes |
| `examples/03-slide-mode-advanced.md` | Slide mode edge cases — preamble, gaps, empty pairs, tall slide with Shift+scroll |
| `examples/demo-script-short.md` | Recording script for the 30-second pitch video |
| `examples/demo-script-long.md` | Recording script for the 3-minute feature-tour video |


## Prerequisites

### Local development

- Node.js 20 (matches CI)
- npm
- VS Code
- `gh` CLI — required to trigger releases from the terminal

### Repository secrets (for release automation)

- `VSCE_PAT` — a Personal Access Token for the VS Code Marketplace publisher account, stored as a GitHub Actions secret under **Settings → Secrets and variables → Actions**
- Standard `GITHUB_TOKEN` — provided automatically by GitHub Actions; no manual setup needed


## Local Setup

```bash
git clone https://github.com/kanad13/markdown-presentation-tool.git
cd markdown-presentation-tool
npm ci
```


## Daily Development

### Run the extension locally (F5 debug)

1. Open the repository in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. In the host window, open `examples/01-classic-mode.md` (classic mode) or `examples/02-slide-mode-basics.md` (slide mode).
4. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run `Markdown: Show Markdown Presentation`.
5. Verify slide rendering and navigation.

### Test with a local VSIX install

If `F5` debugging doesn't work (e.g. in a Codespace or remote container), build and install a `.vsix` package instead:

```bash
npm run package                       # produces markdown-presentation-tool-X.Y.Z.vsix
code --install-extension markdown-presentation-tool-*.vsix
```

Then reload VS Code (`Developer: Reload Window`) and open a markdown file to test.

To uninstall afterward:

```bash
code --uninstall-extension KunalPathak.markdown-presentation-tool
```

The `.vsix` file is git-ignored. Do not commit it.

### Local quality checks (run before pushing)

```bash
npm test                              # Unit tests + ESLint (same as CI)
npm run package                       # Packages to .vsix; verifies the build
```

### Committing

No special commit message format is required. Use descriptive messages that explain the change.

Stage files explicitly — avoid `git add .` after running `npm run package`, as build artifacts may be present in the working directory even though they are git-ignored.

```bash
git add src/extension.js src/webview.html   # or whichever files you changed
git commit -m "feat: improve slide rendering for nested lists"
git push origin main
```


## Automation Overview

There are two GitHub Actions workflow files. They are **fully independent** — CI never triggers release, and release never runs automatically.

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | Every push to `main` and every PR | Lint, unit tests, package, verify `.vsix` |
| Release Publish | `.github/workflows/release.yml` | Manual `workflow_dispatch` only | Validate version + CHANGELOG, package, create git tag, create GitHub Release, publish to Marketplace |

A push **always** runs CI. A release **never** runs automatically — it requires an explicit manual trigger.


## What Happens on Every Push

When you push to `main`, `.github/workflows/ci.yml` runs automatically:

1. Checks out the code
2. Installs dependencies with `npm ci`
3. Runs unit tests and ESLint (`npm test`)
4. Packages the extension (`npm run package`)
5. Verifies the `.vsix` file was produced

If any step fails, the push is flagged in GitHub. Nothing is published. No tag is created.


## Release Process

Releases are intentional and manual. There is no special commit message format. Prepare the code, then explicitly trigger the release workflow when ready.

### Step 1 — Decide the version

Use semantic versioning: `MAJOR.MINOR.PATCH`.

- `patch` — bug fixes, no new features
- `minor` — backwards-compatible new features
- `major` — breaking changes

### Step 2 — Bump `package.json`

```bash
npm version patch --no-git-tag-version
```

Replace `patch` with `minor` or `major` as appropriate. The `--no-git-tag-version` flag prevents a local git tag — tags are created by automation, not by your shell.

This command updates both `package.json` and `package-lock.json`.

### Step 3 — Update `CHANGELOG.md`

Add a release section at the top of the changelog. The section header must use this exact format:

```
## [X.Y.Z] - YYYY-MM-DD
```

The version in brackets must exactly match `package.json`. The release workflow validates this.

Example:

```markdown
## [0.2.0] - 2026-04-15

### Added
- Slide mode: split content at `<!-- slide -->` delimiters
- Full Markdown rendering per slide: headings, lists, blockquotes, inline code, bold, italic
```

### Step 4 — Commit and push

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

Any commit message is fine. Wait for CI to pass before proceeding.

### Step 5 — Trigger the release workflow

Once CI is green, run the release workflow. Pass the version number **without** the `v` prefix.

**Using the `gh` CLI (recommended):**

```bash
gh workflow run release.yml --ref main -f version=X.Y.Z
```

**Using the GitHub web UI:**

1. Go to **Actions** → **Markdown Presentation Tool — Release & Publish**.
2. Click **Run workflow**.
3. Select the `main` branch.
4. Enter the version (e.g. `1.2.1`) in the `version` field.
5. Click **Run workflow**.

### What the release workflow does

1. Validates the workflow was triggered from `main`
2. Validates the `version` input matches semver format `X.Y.Z`
3. Validates that `package.json` version matches the input version
4. Validates that `CHANGELOG.md` contains a `## [X.Y.Z]` entry for the version
5. Verifies the git tag `mpt-vX.Y.Z` does not already exist on the remote
6. Installs dependencies with `npm ci`
7. Packages the extension with `npm run package`
8. Verifies the `.vsix` was produced
9. Creates and pushes the `mpt-vX.Y.Z` git tag
10. Creates a GitHub Release titled "Markdown Presentation Tool vX.Y.Z" with the `.vsix` attached and auto-generated release notes
11. Publishes the extension to the VS Code Marketplace


## Troubleshooting

### CI failed

Read the failing step in the GitHub Actions log. Common causes:

- **Lint failure** — run `npm run lint` locally and fix ESLint errors before pushing
- **Test failure** — run `npm test` locally to reproduce
- **Package failure** — run `npm run package` locally; check `package.json` for syntax errors or missing fields

### Release workflow failed: wrong branch

The release workflow only accepts `main`. If you triggered from the wrong branch:

```bash
gh workflow run release.yml --ref main -f version=X.Y.Z
```

### Release workflow failed: invalid version format

The `version` input must be exactly `X.Y.Z` — three dot-separated integers, no `v` prefix.

- Correct: `1.2.1`
- Wrong: `v1.2.1`, `1.2`, `1.2.1-beta`

### Release workflow failed: version mismatch

The `version` input does not match the version in `package.json`. Run `npm version patch --no-git-tag-version` to bump (or edit `package.json` directly), commit, push, wait for CI, then re-run the workflow.

### Release workflow failed: missing CHANGELOG entry

`CHANGELOG.md` does not contain a `## [X.Y.Z]` header for the version. Add the entry, commit, push, wait for CI, then re-run the workflow.

### Release workflow failed: tag already exists

That version has already been released. Use a new version number. If the previous release was erroneous and you need to retag, delete the remote tag intentionally:

```bash
git push origin --delete mpt-vX.Y.Z
```

Then re-run the workflow.

### Release workflow failed: Marketplace publish failed

The most common cause is a missing or expired `VSCE_PAT`. Update the secret under **Settings → Secrets and variables → Actions**, then re-run the workflow from the **Actions** tab — no new commit is needed.

### CI passed but nothing was published

Expected. CI never publishes. After CI passes, run the release workflow manually as described in Step 5 of the release process.


## Branch Conventions

- All work happens on `main`.
- Use descriptive commit messages. No special format is required for any type of commit.
- Stage files explicitly rather than using `git add .`.
- Let automation handle git tags, GitHub Releases, and Marketplace publishing — never create tags or publish manually.
- Keep this file (`docs/development.md`) as the live source of truth for the development and release process.

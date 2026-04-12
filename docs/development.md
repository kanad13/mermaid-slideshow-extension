# Development Guide

This document is the source of truth for how development and release automation work on the `markmaid-slideshow` branch.


## Branch identity

This repository currently carries two extension tracks:

- `main` continues to represent the published `mermaid-slideshow` extension.
- `markmaid-slideshow` is building the separate `markdown-slideshow` extension.

That split matters because the automation in this document is **branch-specific**. Everything below applies to `markmaid-slideshow` only.

## Workflow trigger map

There are two workflow files in the repository, but only one normal developer action: **push your commit to `markmaid-slideshow`**.

| Workflow file | Who starts it | When it starts | What it does |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | GitHub Actions automatically | Every push to `markmaid-slideshow` | Installs dependencies, runs lint, runs unit tests, packages the extension, and verifies the `.vsix` |
| `.github/workflows/release.yml` | `ci.yml` automatically | Only after CI passes for a release commit | Validates the release commit, validates the version, creates the tag, creates the GitHub Release, and publishes to the VS Code Marketplace |

- A push to `markmaid-slideshow` automatically starts `.github/workflows/ci.yml`.
- If that push is a release commit, CI automatically hands off to `.github/workflows/release.yml` after the checks pass.
- There is no separate manual button that the developer is expected to press as part of the normal branch workflow.

## Requirements

### Local requirements

For day-to-day development on this branch, you need:

- Node.js 20 recommended for parity with CI
- npm
- VS Code
- permission to push to `markmaid-slideshow`

### Repository requirements for release automation

For automated publishing to succeed, the repository needs:

- GitHub Actions secret `VSCE_PAT`
- standard GitHub Actions token access for creating the GitHub Release

## Local setup

```bash
git clone https://github.com/kanad13/mermaid-slideshow-extension.git
cd mermaid-slideshow-extension
git checkout markmaid-slideshow
npm ci
```

Recommended local checks before you push:

```bash
npm run lint
node --test 'test/**/*.test.js'
npm run package
```

## What the developer actually does

### Normal code change

1. Edit the branch code, usually in `src/extension.js` or `src/webview.html`.
2. Press `F5` in VS Code to launch the Extension Development Host.
3. Open `examples/test.md`.
4. Run `Markdown: Show Markdown Slideshow` from the Command Palette.
5. Verify behavior, then run the local checks shown above.
6. Commit and push normally.

Example normal commit:

```bash
git add .
git commit -m "feat: improve slide rendering"
git push origin markmaid-slideshow
```

What happens after that push:

1. GitHub Actions runs `.github/workflows/ci.yml`.
2. The workflow installs dependencies with `npm ci`.
3. It runs ESLint.
4. It runs the Node.js unit tests.
5. It packages the extension with `vsce package`.
6. It verifies that a `.vsix` file was produced.
7. No tag is created, and nothing is published.

### Release change

Release commits are deliberate and use the same push-based flow.

#### Step 1: Decide the release version

Use semantic versioning: `MAJOR.MINOR.PATCH`.

#### Step 2: Bump the version files

```bash
npm version patch --no-git-tag-version
```

Use `minor` or `major` instead of `patch` when appropriate. The `--no-git-tag-version` flag is important because Git tags are created by automation, not by your local shell.

#### Step 3: Update the changelog

Add the release notes to `CHANGELOG.md` for the same version.

#### Step 4: Create the release commit

The release commit message must be a dedicated one-line commit in this exact format:

```text
chore: release vX.Y.Z
```

The version in the message must exactly match `package.json`.

Example:

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release v0.2.0"
git push origin markmaid-slideshow
```

What happens after that push:

1. Branch CI runs first and must pass.
2. CI then calls the reusable release workflow.
3. The release workflow validates the commit message format.
4. It validates that the commit version matches `package.json`.
5. It verifies that the tag does not already exist.
6. It packages the extension again for the release artifact.
7. It creates and pushes the `vX.Y.Z` git tag.
8. It creates a GitHub Release with the generated `.vsix` attached.
9. It publishes the extension to the VS Code Marketplace.

## Troubleshooting

### Release stage did not run

The release stage only runs when the pushed head commit is a release commit. In practice, use the exact first-line commit message:

```text
chore: release vX.Y.Z
```

If you use a normal commit message, only CI runs.

### Release stage failed with a version mismatch

The version in the release commit message must exactly match `package.json`. Fix the version, recommit with the correct release message, and push again.

### Release stage failed because the tag already exists

That version has already been tagged remotely. Use a new version number, or delete the remote tag intentionally before retrying.

### Marketplace publish failed

The most common cause is a missing or expired `VSCE_PAT`. Update the GitHub Actions secret and rerun with a fresh release commit if needed.

## Branch rules

- Push your work to `markmaid-slideshow`.
- Use a normal commit message for normal code changes.
- Use the exact `chore: release vX.Y.Z` message only for a real release commit.
- Let automation create the tag, GitHub Release, and Marketplace publish.
- Keep live workflow/process documentation in this file rather than in `planned-changes/readme.md`.

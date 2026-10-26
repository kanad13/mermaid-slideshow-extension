# Development guide

This guide covers setup, the daily workflow, and the release procedure for Mermaid Slideshow. For design background read [architecture.md](architecture.md). For dependency rules read [dependencies.md](dependencies.md). For test evidence read [testing.md](testing.md).

## 1. Setup

**Prerequisites:**

- Install the Node version that `package.json` `engines.node` requires, or newer.
- Install VS Code at or above the `engines.vscode` floor.
- For releases, install the GitHub CLI and log in with `gh auth login`.

**Install:**

```bash
git clone https://github.com/kanad13/mermaid-slideshow-extension.git
cd mermaid-slideshow-extension
npm ci
npm test
```

`npm ci` installs the exact versions from `package-lock.json`. Use `npm install` only when you change dependencies, and commit the lockfile with that change.

**Publishing credentials:**

- Publishing needs a Personal Access Token with the `Marketplace > Manage` scope.
- Run `npx vsce login KunalPathak` and paste the token. Check the login with `npx vsce ls-publishers`.
- Local development needs no credentials.

## 2. Daily workflow

1. Create a branch. Never commit to `main`.

    ```bash
    git checkout -b fix/short-description
    ```

    Use the prefixes `feat/`, `fix/`, `docs/`, `refactor/`, and `chore/`.

2. Edit the code. The style rules are:
    - Tabs, double quotes, semicolons, and Unix line endings.
    - `const` and `let` only.
    - JSDoc on every exported or public function, explaining why the function exists.
    - No `TODO` comments. Track work in issues.
3. Run the checks.

    ```bash
    npm test
    ```

    The command runs unit tests, the linter, and the format check. Run `npm run format` to fix formatting.

4. Check what the tests cannot reach, as [testing.md](testing.md) describes. Press F5 in VS Code to start an Extension Development Host, open `examples/test.md`, and run **Mermaid: Show Mermaid Slideshow**.
5. Commit in small logical groups with a concise imperative subject that says what changed.
6. When a change touches three or more files, plan the files first and commit in phases: configuration, code, tests, documentation.
7. After review, merge the branch into `main` with a merge commit (`git merge --no-ff`), and run `npm test` on the merged result.

## 3. Release procedure

Release only from `main`, after the feature branches are merged and CI passes. Each step names a command the maintainer runs.

1. Choose the version by semantic versioning from the user-visible changes.
2. Update `package.json`, `package-lock.json`, and `CHANGELOG.md` together.
    - Put the new entry at the top of the changelog.
    - List only user-facing changes.
3. Verify the clean state.

    ```bash
    rm -rf node_modules
    npm ci
    npm test
    npm audit --omit=dev
    ```

4. Build the package and install it in a real editor for the smoke check.

    ```bash
    npm run package
    code --install-extension mermaid-slideshow-X.Y.Z.vsix
    ```

5. Commit the version change.

    ```bash
    git add package.json package-lock.json CHANGELOG.md
    git commit -m "chore: bump version to X.Y.Z"
    ```

6. Tag the exact commit that you publish.

    ```bash
    git tag -a vX.Y.Z -m "Release version X.Y.Z"
    ```

7. Push the branch and the tag. The tag push starts `.github/workflows/release.yml`.

    ```bash
    git push origin main
    git push origin vX.Y.Z
    ```

8. Let the workflow publish to Open VSX, then publish to the Marketplace with the existing login.

    ```bash
    npm run publish
    ```

    - The workflow checks that the tag is on `main` and matches `package.json` and the changelog entry. It runs the tests, packages the extension, creates the GitHub release, and publishes to Open VSX.
    - The release workflow publishes to Open VSX. It signs in with a short-lived OIDC token that Open VSX issues to the registered trusted publisher (repository `kanad13/mermaid-slideshow-extension`, workflow `release.yml`), so no stored token is needed. The repository secret `OVSX_PAT` is a fallback: when it is set, the workflow uses it instead of OIDC. Delete it after a release has published through OIDC.
    - If the run fails after the tag exists, fix the cause and start the workflow again from the Actions tab (**Release > Run workflow**, from `main`, with the tag), or run `gh workflow run Release --ref main -f tag=vX.Y.Z`. Open VSX can be read-only for a while, and a retry then publishes it. Open VSX ignores a version it already has, so repeating a run is safe.
    - Tag the merge commit after CI is green on `main`. Never re-push an old tag, because the workflow runs on every pushed `vX.Y.Z` tag and would run that release again.

9. Verify the result:
    - The Marketplace page lags 5 to 10 minutes. Check it with `vsce show KunalPathak.mermaid-slideshow`, not a polling loop.
    - Check Open VSX with `ovsx show KunalPathak.mermaid-slideshow` and the release with `gh release view vX.Y.Z`. The workflow's last step also confirms the version on Open VSX.
    - CI is green on `main`.

## 4. Troubleshooting

| Symptom                                 | Action                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Marketplace rejects an existing version | Confirm that `package.json` holds the new version, then wait and refresh                                                     |
| The tag points to the wrong commit      | Stop and ask the maintainer before you move or delete a pushed tag                                                           |
| `vsce` reports an authorization error   | Create a new token and run `npx vsce login KunalPathak`                                                                      |
| The Open VSX publish step fails         | Open VSX can be read-only. Run `gh workflow run Release --ref main -f tag=vX.Y.Z` again. A version it already has is skipped |
| `npm test` fails only on one Node line  | Run the failing suite on the minimum Node version named in `package.json`                                                    |
| The format check fails                  | Run `npm run format` and review the diff                                                                                     |

## 5. Checklist

**Before you commit:**

- [ ] `npm test` passes.
- [ ] Documentation matches the change.
- [ ] The security model in [architecture.md](architecture.md) is unchanged or updated.

**Before you release:**

- [ ] The editor smoke check passed on the built `.vsix`.
- [ ] `npm audit --omit=dev` reports no findings.
- [ ] Manifest, lockfile, and changelog agree on the version.
- [ ] The icon is square and between 256 and 1024 pixels wide, which `vsce publish` enforces.
- [ ] CI is green on `main`.

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

7. Push the branch and the tag.

    ```bash
    git push origin main
    git push origin vX.Y.Z
    ```

8. Publish with the existing login.

    ```bash
    npm run publish
    ```

9. Verify the result:
    - The Marketplace page shows the new version. Propagation can take several minutes.
    - The GitHub release exists with the `.vsix` attached. The tag-triggered workflow creates it.
    - CI is green on `main`.

## 4. Troubleshooting

| Symptom                                 | Action                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Marketplace rejects an existing version | Confirm that `package.json` holds the new version, then wait and refresh  |
| The tag points to the wrong commit      | Stop and ask the maintainer before you move or delete a pushed tag        |
| `vsce` reports an authorization error   | Create a new token and run `npx vsce login KunalPathak`                   |
| `npm test` fails only on one Node line  | Run the failing suite on the minimum Node version named in `package.json` |
| The format check fails                  | Run `npm run format` and review the diff                                  |

## 5. Checklist

**Before you commit:**

- [ ] `npm test` passes.
- [ ] Documentation matches the change.
- [ ] The security model in [architecture.md](architecture.md) is unchanged or updated.

**Before you release:**

- [ ] The editor smoke check passed on the built `.vsix`.
- [ ] `npm audit --omit=dev` reports no findings.
- [ ] Manifest, lockfile, and changelog agree on the version.
- [ ] CI is green on `main`.

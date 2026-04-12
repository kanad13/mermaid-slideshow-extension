# Development Guide

A comprehensive guide to developing, testing, and releasing the Markdown Slideshow extension.

## 1. The Big Picture: Who Does What?

We use a fully automated Continuous Integration and Continuous Deployment (CI/CD) pipeline on the `markmaid-slideshow` branch.

| Responsibility | Who handles it? | How it happens |
| --- | --- | --- |
| **Writing & Testing Code** | **Developer** | Write code locally, verify via F5 debug host. |
| **Quality Checks** | **GitHub Actions** | Pushing to the branch triggers `ci.yml` which runs `npm run lint` and verifies the package builds. |
| **Creating Releases** | **GitHub Actions** | When a commit contains a version bump in `package.json`, the CI automatically creates the `vX.Y.Z` tag and GitHub Release. |
| **Publishing to Marketplace** | **GitHub Actions** | The CI automatically uploads the packaged `.vsix` to the VS Code Marketplace using repository secrets. |

> **Note for Developers:** You **do not** need to install `vsce` or `gh` CLI tools globally, and you do not need to manually push git tags.

---

## 2. Local Environment Setup

```bash
# Clone the repository
git clone https://github.com/kanad13/mermaid-slideshow-extension.git
cd mermaid-slideshow-extension

# Switch to the active development branch
git checkout markmaid-slideshow

# Install exact dependencies from lock file
npm ci

# Optional: Run local checks to ensure baseline is solid
npm run lint
npm run package
```

---

## 3. Daily Development Flow

1. **Edit Code:** Modify files (typically `src/extension.js`).
2. **Test Locally:** Press `F5` in VS Code to launch the Extension Development Host.
   - Open `examples/test.md`
   - Run the command `Mermaid: Show Mermaid Slideshow`
   - Verify changes apply correctly.
3. **Code Style & Standards:**
   - Run `npm run lint` before committing. ESLint enforces tab indentation and clean code.
   - Use `const`/`let` only (no `var`).
   - Ensure all exported functions have clear JSDoc comments.
   - Do not leave `console.log` statements in production code.

**Committing:**
Commit your changes normally to the `markmaid-slideshow` branch.
```bash
git add .
git commit -m "feat: add new hotkey for navigation"
git push origin markmaid-slideshow
```

---

## 4. Releasing a New Version

Because the CI pipeline handles the actual publishing, releasing a new version is simply a matter of telling the pipeline that the version has changed.

**Step 1: Decide the new version**
Follow semantic versioning (MAJOR.MINOR.PATCH).

**Step 2: Update the Version Files**
Update the version number in both `package.json` and `package-lock.json`:
```bash
# You can use npm to bump both files automatically:
npm version patch --no-git-tag-version  # Use 'minor' or 'major' as needed
```

**Step 3: Update the Changelog**
Add your new release notes at the top of `CHANGELOG.md`:
```markdown
## [X.Y.Z] - YYYY-MM-DD
### Added
- Your new feature here
### Fixed
- A bug you resolved
```

**Step 4: Commit and Push**
Commit these specific tracking files to trigger the release pipeline.
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release vX.Y.Z"
git push origin markmaid-slideshow
```

**What happens next?**
1. GitHub Actions will detect the `version` change in `package.json`.
2. It will run all linting and packaging checks.
3. If successful, it will create a Git Tag (e.g., `v1.2.3`).
4. It will create a GitHub Release with the `.vsix` file attached.
5. It will publish the newly built extension directly to the Visual Studio Marketplace.

6. **Tag and push — this triggers the release workflow:**
   ```bash
   git tag -a vX.Y.Z -m "Release version X.Y.Z"
   git push origin main && git push origin vX.Y.Z
   ```

After pushing, the `release.yml` workflow runs automatically: builds the `.vsix`, creates the GitHub Release with the artifact attached, and publishes to the VS Code Marketplace.

Check progress in the **Actions** tab. Marketplace updates may take 5–10 minutes to appear.

---

## 4. Troubleshooting

**Version mismatch: workflow fails with "Tag does not match package.json version"**
The tag and `package.json` must be in sync. Fix:
```bash
git tag -d vX.Y.Z                      # delete local tag
git push origin :refs/tags/vX.Y.Z      # delete remote tag
# update package.json to match, commit
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin vX.Y.Z
```

**VSCE PAT expired: publish step fails with "authorization failed"**
1. Create a new PAT (Marketplace > Manage scope)
2. Update the `VSCE_PAT` secret in repo Settings → Secrets → Actions

**gh CLI not authenticated:**
```bash
gh auth login
gh auth status
```

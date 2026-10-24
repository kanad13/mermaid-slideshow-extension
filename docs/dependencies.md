# Dependencies

This document holds the policy for choosing, configuring, and reviewing dependencies, and the security limits that follow from it. It contains no version numbers. Versions live in the files named under "Where versions live".

## Overview

The extension has three groups of dependencies, and each group follows its own rules.

| Group                    | Examples                                        | How it arrives                      |
| ------------------------ | ----------------------------------------------- | ----------------------------------- |
| Bundled runtime          | None                                            | The package ships only source files |
| Runtime-loaded libraries | Mermaid                                         | The webview imports it from a CDN   |
| Tooling                  | ESLint, Prettier, `vsce`, and the type packages | `devDependencies` in `package.json` |

A review happens every quarter and whenever an advisory affects a dependency. The review procedure is below.

## Where versions live

**Manifest and lockfile:**

- `package.json` holds ranges for tooling and the editor engine floor.
- `package-lock.json` holds the resolved tooling versions.

**Source constant:**

- `MERMAID_VERSION` in `src/extension.js` holds the one Mermaid version.

**Documentation:**

- Documents name these files and never repeat the numbers.
- This guide holds policies and procedures only. It does not record what earlier reviews decided.

## Version selection policy

A version qualifies only when it satisfies every rule in this table.

| Rule             | Requirement                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Channel          | Stable. No alpha, beta, rc, canary, next, or nightly                                                                                |
| Major line       | The newest major line that still receives fixes. A line without a release for 12 months is abandoned unless it is declared complete |
| Age              | A new major version is at least 30 days old. A minor or patch version is at least 14 days old                                       |
| Advisories       | The production dependency tree has no known advisories                                                                              |
| Compatibility    | It runs on the current stable editor, on the support floor, and on the minimum Node version                                         |
| Browser baseline | The Chromium in the support-floor editor release meets the library's documented browser baseline                                    |

Additional rules by group:

**Runtime-loaded libraries:**

- Use an exact `x.y.z` version. Never use a floating or major-only tag.

**Registry packages:**

- Use a caret range and a committed lockfile.
- Keep the resolved version in the lockfile at or below the newest qualifying version, because a caret range alone can resolve to a release that is too young.

**Build tools:**

- Stay on the current major version unless an advisory or an engine requirement forces a change.

**Type packages:**

- `@types/node` follows the minimum Node major version.
- `@types/vscode` is an exact pin equal to the engine floor.

## Editor and Node support policy

**Editor releases:**

- Test on the current stable release. Insiders builds are not a target.
- The engine floor is the newest editor release that is at least 12 months old.
- Move the floor and the `@types/vscode` pin together at each quarterly review.

**Editor forks:**

- Before you raise the floor, check the base editor version of each fork the README advertises.
- A floor above a fork's base blocks installation there. Present that trade-off to the maintainer when the floor would exclude a named fork.

**Node:**

- The minimum Node version is the oldest maintained Node line that every tool supports.
- CI runs the exact minimum version, and `package.json` `engines.node` states it.

## Configuration policy

**Defaults first:**

- Configure libraries with their defaults.
- Override a setting only for security, for matching the editor theme, or for aligning syntax with the extraction code.
- Never override a library's visual defaults.

**Content Security Policy:**

- Keep the policy strict.
- Never loosen it to silence a console message.

**Package overrides:**

- Add an override only when no upgrade path clears an advisory.
- State the reason in the commit message that adds it.
- Re-test every override at each review, and remove it when the audit is clean without it.

## Review procedure

1. List every dependency in the three groups.
2. Look up the current versions and release dates in the registry with `npm view <package> time`.
3. Apply the selection policy to each item with the same rules.
4. Run `npm audit --omit=dev`, then `npm audit`.
5. Apply in-range updates, then `npm audit fix`.
6. Check each tool's `engines` field against the minimum Node version.
7. Check the browser baseline of the Mermaid version against the Chromium shipped in the support-floor editor.
8. For a Mermaid change, run `node scripts/webview-harness.js` and open `examples/test.md` in a browser with a light and a dark scheme, as described in [testing.md](testing.md).
9. Run `npm test` on the minimum Node version.
10. Update this guide only when a policy changes.

## Security limits

**Runtime code from a CDN:**

- The webview executes Mermaid code from `cdn.jsdelivr.net`, so a compromise of that host or of the Mermaid package reaches every user.
- The exact version pin reduces the risk of silent change and leaves the host trust in place.

**No integrity check on the import:**

- The page loads Mermaid with a dynamic `import()`, which has no `integrity` attribute.
- Subresource Integrity needs a different loading mechanism, and [decisions.md](decisions.md) records why it is not built.

**Network requirement:**

- The slideshow needs network access to the CDN when it renders.
- A load failure shows a notice and leaves the panel usable.

**Mermaid sanitization:**

- The extension relies on Mermaid's default `strict` security level to sanitize labels.
- An advisory against Mermaid's sanitizer weakens that layer, and the Content Security Policy remains as the second layer.

**Tooling advisories:**

- Advisories in tooling never reach users because the package contains no tooling.
- They still matter for publishing, because `vsce` runs with the maintainer's credentials.

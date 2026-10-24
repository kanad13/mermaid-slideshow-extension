# Testing

This is the canonical testing guide. It maps each user workflow to the evidence that proves it, lists the commands, and names the checks that stay manual.

## Overview

Automated tests cover the extension host code and the generated page text. Rendering in a real browser and behavior in a real editor stay manual, because the project keeps no browser or editor-host test dependency.

| Layer                | What it proves                                                                 | How it runs                                 |
| -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| Unit and lifecycle   | Extraction, escaping, nonce, theme handling, debounce, disposal                | `npm test`, using a shared fake of `vscode` |
| Manifest consistency | Version, engine floor, type pin, CI Node version, icon                         | `npm test`                                  |
| Package artifact     | The `.vsix` has no development files and the unpacked `extension.js` activates | `npm test`, which builds the package        |
| Browser harness      | Rendering, navigation, themes, failure and empty states                        | Manual, `node scripts/webview-harness.js`   |
| Editor host          | Install and use in a real editor                                               | Manual smoke check before a release         |

## Commands

```bash
npm test               # unit tests, then lint, then format check
npm run lint
npm run format:check
npm run format         # rewrites files with Prettier
node --test test/lifecycle.test.js   # one suite
node scripts/webview-harness.js 8731 # browser harness
```

**Lowest supported Node version:**

- `npm test` must pass on the minimum version in `package.json` `engines.node`, because glob handling and runner behavior differ between Node versions.
- CI runs that exact version.

## Workflow map

| Workflow                             | Start and action                                     | Expected result                                                                                | Evidence                                                 |
| ------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Open the slideshow                   | Markdown editor active, run the command              | One panel opens beside the editor with all diagrams in document order                          | `test/lifecycle.test.js`, `test/extract.test.js`         |
| Run the command in a wrong state     | No editor, or a non-markdown file                    | An error message appears and no panel opens                                                    | `test/lifecycle.test.js`                                 |
| Switch files                         | Panel open, run the command on another file          | The same panel shows the other file's diagrams                                                 | `test/lifecycle.test.js`                                 |
| Live edit                            | Panel open, edit the shown file                      | One update arrives 300 ms after the last edit, with the current diagrams                       | `test/lifecycle.test.js` with controlled timers          |
| Close during an edit                 | Edit, then close the panel before the timer fires    | No message is sent and nothing throws                                                          | `test/lifecycle.test.js`                                 |
| Change theme setting or editor theme | Panel open, change either                            | The page re-renders with the matching Mermaid theme and a new nonce                            | `test/lifecycle.test.js`, `test/webview-content.test.js` |
| Hostile diagram text                 | A diagram contains `</script>`, `$&`, or `{{NONCE}}` | The page script stays intact and the text appears literally                                    | `test/webview-content.test.js`, harness fixture          |
| Hostile theme setting                | A workspace sets an arbitrary theme string           | The extension uses the automatic theme                                                         | `test/webview-content.test.js`                           |
| Render and navigate                  | Open the page with several diagrams                  | Each slide renders, the counter updates, keys, wheel, and arrows move between slides           | Manual harness check                                     |
| Diagram with a syntax error          | One invalid diagram among valid ones                 | A failure notice for that slide, other slides unaffected, no leftover DOM                      | Manual harness check, `test/fixtures/hostile.md`         |
| CDN unreachable                      | The Mermaid import fails                             | A notice appears, navigation works                                                             | Manual harness check with `?break=1`                     |
| Empty file gains a diagram           | Open a file without diagrams, add a diagram          | The empty message appears, then the slide appears                                              | Manual harness check using a posted update message       |
| Package contents                     | Build the `.vsix`                                    | Only runtime files ship, and the unpacked entry point activates                                | `test/package.test.js`                                   |
| Release metadata                     | Prepare a release                                    | Versions agree across manifest, lockfile, and changelog; the engine floor matches the type pin | `test/manifest.test.js`                                  |

## Manual harness check

Run this check after any change to `src/webview.html`, the Mermaid version, or the Content Security Policy.

1. Start the harness with `node scripts/webview-harness.js 8731`.
2. Open `http://127.0.0.1:8731/?file=examples/test.md&theme=default&scheme=light` in a browser.
3. Step through every slide and confirm that each one renders.
4. Repeat with `scheme=dark&theme=dark`, then with `theme=forest` and `theme=neutral`.
5. Open `?file=test/fixtures/hostile.md` and confirm three results:
    - The page title never changes.
    - The syntax-error slide shows a failure notice.
    - The browser console reports blocked image loads and no executed script.
6. Open `?file=examples/test.md&break=1` and confirm the CDN failure notice.
7. Open `?file=CHANGELOG.md`, post an update message from the console, and confirm that the slide appears.
8. Compare a Mermaid upgrade against the previous version with `&mermaid=x.y.z`.

## Editor smoke check

Run this check before you hand a release package to the maintainer.

1. Install the `.vsix` with `code --install-extension <file>`.
2. Open `examples/test.md` and run **Mermaid: Show Mermaid Slideshow**.
3. Step through the slides and edit a diagram to watch the live update.
4. Switch the editor between a light and a dark theme.
5. Change `mermaidSlideshow.theme` in settings.
6. Close and reopen the panel.

## Test design rules

**Isolation:**

- Suites share one fake in `test/helpers/vscode-fake.js`.
- Tests control timers with `mock.timers`, so no test waits in real time.

**Defect sensitivity:**

- Break the behavior and confirm that each new test fails, then restore the code.
- Never weaken an assertion to obtain a green run.

**Artifact testing:**

- The package test loads the unpacked `extension.js`, not the source tree.

## Known gaps

**Browser behavior:**

- No automated test renders the webview, because that needs a browser dependency. The manual harness check covers it.

**Editor host:**

- No automated test runs inside a real editor. [decisions.md](decisions.md) records the reopen condition.

**Continuous integration:**

- The workflows run the same `npm test` command as developers, and the first run on the hosted runner shows any environment difference.

# Decision log

This log is context. It is not a backlog, and nothing in it is scheduled. Each entry records an idea that the project did not build, why, and what would reopen it.

## How to read an entry

| Field       | Meaning                                                   |
| ----------- | --------------------------------------------------------- |
| Verdict     | pursue, scoped pursue, counter-proposal, defer, or reject |
| What it is  | The feature in one or two sentences                       |
| Why not now | What it costs compared with what it returns today         |
| Reopen when | The condition that would change the verdict               |

## Entries awaiting a maintainer decision

### Declare Workspace Trust support

**Verdict:** scoped pursue

**What it is:**

- VS Code opens unfamiliar folders in Restricted Mode. An extension that declares no support for it is disabled there.
- A `capabilities.untrustedWorkspaces` entry in `package.json` would let the slideshow run in Restricted Mode.

**Why not now:**

- The change widens where the extension runs, which changes the supported audience.
- The code review found that the extension is safe to run in untrusted folders: the theme setting is allowlisted, diagram text is escaped, and Mermaid runs at its default security level. A real-editor check of Restricted Mode has not been done.

**Reopen when:**

- The maintainer agrees to widen the audience and a Restricted Mode check in a real editor passes.

### Mermaid major line

**Verdict:** scoped pursue (applied)

**What it is:**

- The extension loads the newest qualifying Mermaid release, which belongs to a new major line.
- That line changes the default diagram layout and edge routing, which users can see.

**Why it is listed:**

- The dependency policy selects the newest major line that still receives fixes, so the code follows it.
- A visible change in diagram appearance needs the maintainer's approval.

**Reopen when:**

- The maintainer prefers the previous look. Setting `MERMAID_VERSION` back to the last release of the previous line restores it, and the browser harness compares both with `&mermaid=x.y.z`.

## Deferred ideas

### Keep the slide position across full re-renders

**Verdict:** defer

**What it is:**

- A change of the theme setting or the editor color theme reloads the page and returns to slide one.
- The webview could store the slide index, keyed by the file's URI, and restore it.

**Why not now:**

- Theme changes are rare during a presentation.
- Stored state must be keyed to its file, or a position from one file applies to another, so the feature needs a state key, a restore path, and tests.

**Reopen when:**

- Users report losing their place, or the extension gains other state that needs the same key.

### Fence-aware extraction

**Verdict:** defer

**What it is:**

- The extractor reads raw text with a regular expression, so a mermaid fence inside an outer fence, such as the README's syntax examples, becomes a slide.
- A fence-aware scanner would skip those.

**Why not now:**

- A scanner must follow CommonMark rules for fence length, indentation, and tilde fences, which is a larger and riskier component than the current expression.
- The effect appears only in documents that show Mermaid syntax as an example.

**Reopen when:**

- Users report phantom slides, or the extension adds another extraction syntax.

### Bundle Mermaid with the extension

**Verdict:** defer

**What it is:**

- The package would ship Mermaid and the webview would load it from the extension's own files.
- That would work offline and remove the CDN trust.

**Why not now:**

- The Mermaid package is large, and the project's central trade-off is a small package without runtime dependencies.
- A bundled library needs a bundler or a vendored copy and a webview resource policy.

**Reopen when:**

- Offline use becomes a stated goal, or a CDN incident shows the trust is too costly.

### Subresource Integrity for the Mermaid import

**Verdict:** defer

**What it is:**

- The browser could verify the Mermaid file against a hash before it runs.

**Why not now:**

- A dynamic `import()` cannot carry an integrity attribute.
- Mermaid loads further chunks from the same host, so hashes would have to cover every chunk and change with each release.

**Reopen when:**

- Bundling is chosen, which removes the question.

### Test inside a real editor host

**Verdict:** defer

**What it is:**

- A test runner would download VS Code, install the extension, and drive the command.

**Why not now:**

- It adds a dependency and a large download to every CI run.
- The editor smoke check in [testing.md](testing.md) covers the same ground before each release.

**Reopen when:**

- Activation or the webview bridge gains logic that the fake of `vscode` cannot represent.

### Browser tests for the webview page

**Verdict:** defer

**What it is:**

- An automated browser would load the page and check rendering and navigation.

**Why not now:**

- It adds a browser dependency and network access to CI, and it checks the same things as the manual harness check.

**Reopen when:**

- The page script grows beyond navigation and rendering, or manual checks start to miss regressions.

### Activate only on the command

**Verdict:** defer

**What it is:**

- The extension activates on every markdown file today.
- Recent editor versions activate an extension when one of its commands runs, so the activation event could be removed.

**Why not now:**

- The gain is a small startup saving, and the change needs a check in a real editor.

**Reopen when:**

- The real-editor check becomes part of the release routine.

### Newer GitHub Action versions

**Verdict:** defer

**What it is:**

- The workflows use older major versions of the checkout, Node setup, and release actions.

**Why not now:**

- A new major version cannot be tested before a push, and the current ones work.

**Reopen when:**

- GitHub announces the end of support for the runtime of an action in use, or at the next quarterly dependency review.

## Rejected ideas

### Export slides as images or a PDF

**Verdict:** reject

**What it is:**

- A command would save the rendered slides as files.

**Why not:**

- It adds file access, permissions, and a rendering path beside the one that exists, and the product is a viewer.

**Reopen when:**

- Several users ask for it and a design keeps the webview without file access.

### Zoom and pan for large diagrams

**Verdict:** reject

**What it is:**

- Mouse controls would scale and move the slide.

**Why not:**

- Wheel and arrow keys already navigate, and zoom would compete with them.
- Large diagrams are better split in the source.

**Reopen when:**

- A navigation design exists that does not conflict with the wheel.

# Mermaid Slideshow

A VS Code extension that turns Mermaid diagrams, images, and markdown content into a distraction-free slideshow.

Each piece of content gets its own full-panel slide - no surrounding noise, no tiny inline renders, no clutter.

![](/assets/simple-start.gif)

## Why This Extension?

VS Code's built-in markdown preview renders everything inline - small diagrams buried in text, images squeezed between paragraphs. Mermaid Slideshow extracts your content and presents it full-screen, one slide at a time.

- **Review architecture docs** - step through complex diagrams one at a time without scrolling past walls of text
- **Present in meetings** - navigate with arrow keys or mouse scroll like a slide deck, right inside VS Code
- **Iterate on diagrams** - live preview updates instantly as you edit the source, keeping you in flow
- **Image slides** - photos, screenshots, and diagrams are centered and scaled to fit without distortion
- **Markdown slides** - bullet points, tables, code blocks, and formatted text rendered as presentation slides
- **Both syntaxes supported** - GitHub-style (```) and Azure DevOps-style (:::) Mermaid blocks
- **Fully configurable** - enable or disable image and markdown slides via settings
- **Secure** - Content Security Policy with nonce-based script execution, no user HTML passthrough

![](/assets/present.gif)

## Install

1. Open VS Code (or any VS Code-based editor)
2. Go to Extensions
3. Search for "Mermaid Slideshow" or `KunalPathak.mermaid-slideshow`
4. Click Install

## Usage

1. Open any markdown file containing Mermaid diagrams, images, or markdown content
2. Click the presentation icon in the editor title bar (or use Command Palette: `Mermaid: Show Mermaid Slideshow`)
3. Navigate slides with:
   - Left/Right arrow keys
   - Up/Down arrow keys
   - Mouse scroll wheel
   - Click the `‹` `›` navigation arrows

The slide counter in the bottom-right shows your position (e.g., "2 / 5").

## Slide Types

### Mermaid Diagrams

Any `mermaid` code block is rendered as a diagram slide:

````markdown
```mermaid
graph TD
    A --> B
```
````

Azure DevOps syntax is also supported:

```markdown
::: mermaid
graph TD
    A --> B
:::
```

### Image Slides

Standard markdown images become full-screen slides, centered and scaled to fit:

```markdown
![Architecture diagram](images/architecture.png)
```

Images of any size or aspect ratio are handled — large images scale down, small images are centered without upscaling, and aspect ratio is always preserved.

### Markdown Content Slides

Use horizontal rules (`---`) to separate your markdown into presentation slides:

```markdown
## Introduction

This bullet list becomes its own slide:

- Point one
- Point two
- Point three

---

## Code Example

Code blocks are syntax-styled:

\```javascript
function hello() {
    return "world";
}
\```

---

## Summary

| Feature | Status |
|---------|--------|
| Diagrams | ✅ |
| Images | ✅ |
| Markdown | ✅ |
```

Markdown slides support full formatting: headings, bold, italic, bullet/numbered lists, nested lists, code blocks, blockquotes, tables, and links.

## Configuration

Open VS Code Settings (`Cmd+,` on macOS, `Ctrl+,` on Windows/Linux) and search for **"Mermaid Slideshow"**.

| Setting | Options | Default | Description |
|---|---|---|---|
| `mermaidSlideshow.theme` | `default`, `dark`, `forest`, `neutral` | `default` | Color theme for rendered diagrams |
| `mermaidSlideshow.enableImages` | `true`, `false` | `true` | Include images as presentation slides |
| `mermaidSlideshow.enableMarkdownSlides` | `true`, `false` | `true` | Include markdown sections as presentation slides |

**Themes:**

- **default** - Clean and simple
- **dark** - Dark background with light text, matches dark VS Code themes
- **forest** - Green-toned, nature-inspired palette
- **neutral** - Grayscale, high-contrast, print-friendly

Changing any setting takes effect immediately on the open slideshow.

**Tip:** To use Mermaid Slideshow as a pure Mermaid diagram viewer (original behavior), disable both `enableImages` and `enableMarkdownSlides`.

## For Developers

- [architecture.md](docs/architecture.md) - Design decisions and security model
- [development.md](docs/development.md) - Setup, workflow, and release process
- [CHANGELOG.md](CHANGELOG.md) - Version history

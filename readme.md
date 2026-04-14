# Markdown Presentation & Slideshow for VS Code

**Transform your Markdown files into interactive slide decks instantly. Present your documents directly from VS Code—just like PowerPoint, but powered by Markdown.**

[Markdown Presentation Tool](https://marketplace.visualstudio.com/items?itemName=KunalPathak.markdown-slideshow) is a lightweight extension for developers and writers who need to present documentation, meeting notes, or architecture diagrams without the friction of external software.

Stop wasting time exporting to PDF or building clunky PPT files. Write your content in plain text and launch a beautiful, navigable slideshow with a single click.

## Key Features

- **The "PowerPoint" Experience for Markdown:** Ditch heavy presentation software. Present your `.md` files directly within the VS Code interface.
- **Familiar Preview Workflow:** If you know how to use the VS Code Markdown preview, you already know how to use this. One click turns your notes into slides.
- **Works with Any Markdown File:** No special formatting required. Just add `<!-- slide -->` comments to define your slides, and the extension does the rest.
- **Native Mermaid Diagrams:** Full support for Mermaid.js (flowcharts, sequence diagrams, gantt charts) rendered perfectly within your slides.
- **Integrated Presentation Notes:** Keep your private talking points and public slides in a single file. Only content within slide tags is shown during the presentation.
- **Real-Time Live Sync:** Changes you make in the editor reflect instantly in the slideshow view.
- **Theme Awareness:** Automatically syncs with your VS Code color theme (Light/Dark) for a seamless visual experience.
- **Zero-Config Mode:** If your file contains Mermaid blocks but no slide tags, the extension automatically generates a slide for every diagram.

## Getting Started

1. **Install** the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=KunalPathak.markdown-slideshow).
2. **Open** any Markdown (`.md`) file.
3. **Launch the Presentation:**
   - Click the **Presentation Icon** in the editor title bar (top right).
   - **OR** use the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type `Markdown: Show Markdown Presentation`.

## How to Create Slides

Defining a slide is as easy as using a code fence. Simply wrap the content you want to present in `<!-- slide -->` comments.

````markdown
# My Project Notes

This text is a private note. It stays in your editor but won't show on the slide.

<!-- slide -->
## Slide 1: Introduction
Text placed between two tags becomes a single slide.
<!-- slide -->

More private notes here...

<!-- slide -->
## Slide 2: Architecture
Everything here is on the second slide!
<!-- slide -->
````

## Pro-Tip: Interleaved Presentation Notes

You no longer need a separate "Presenter View" window.

Write your detailed background info, reminders, or script directly in the Markdown file outside of the `<!-- slide -->` tags.

You can read your notes in the editor while your audience sees the clean, rendered slides in the preview panel.

## Navigation & Controls

| Action              | Input                                                            |
| :------------------ | :--------------------------------------------------------------- |
| **Next Slide**      | `Right Arrow`, `Down Arrow`, `PageDown`, `Space`, or Scroll Down |
| **Previous Slide**  | `Left Arrow`, `Up Arrow`, `PageUp`, or Scroll Up                 |
| **Internal Scroll** | `Shift` + `Scroll` (for slides taller than the screen)           |
| **Click Nav**       | Use the interactive arrow overlays on the edges                  |

## Configuration

Tailor the visual output in your VS Code Settings:

- `markdownSlideshow.theme`: Choose your Mermaid theme (`default`, `dark`, `forest`, or `neutral`). By default, it auto-detects based on your VS Code theme.

## Contributing & Support

- We welcome contributions! Check out our [Development Guide](docs/development.md) to get started with local setup and testing.
- And check [Architecture Guide](docs/architecture.md) to understand the code structure and design decisions.

**License:** [MIT](LICENSE)

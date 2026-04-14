const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * Extracts Mermaid diagram code blocks from raw markdown text.
 *
 * Supports two syntaxes:
 * - Backtick style: ```mermaid ... ```
 * - Azure DevOps / Fenced Div style: ::: mermaid ... :::
 *
 * Operates on raw text via regex - no markdown parsing required.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {string[]} Array of Mermaid diagram code strings (trimmed)
 */
function extractMermaidBlocks(rawText) {
	const blocks = [];

	// Backtick style: ```mermaid ... ```
	const backtickRegex = /```mermaid\s*\n([\s\S]*?)```/g;
	let match;
	while ((match = backtickRegex.exec(rawText)) !== null) {
		const code = match[1].trim();
		if (code) {
			blocks.push(code);
		}
	}

	// Azure DevOps style: ::: mermaid ... :::
	const colonRegex = /:::\s*mermaid\s*\n([\s\S]*?):::/g;
	while ((match = colonRegex.exec(rawText)) !== null) {
		const code = match[1].trim();
		if (code) {
			blocks.push(code);
		}
	}

	return blocks;
}

/**
 * Detects whether a markdown document contains slide delimiters.
 *
 * A slide delimiter is a line containing only <!-- slide --> (case-insensitive,
 * optional surrounding whitespace). This is the opt-in signal for slide mode;
 * files without it use the classic mermaid-only path.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {boolean} True if at least one slide delimiter is present
 */
function hasSlideDelimiter(rawText) {
	return /^<!--\s*slide\s*-->\s*$/im.test(rawText);
}

/**
 * Splits a markdown document into logical slides using paired fence semantics.
 *
 * Delimiters (<!-- slide -->, case-insensitive) work like code fences:
 * the 1st opens a slide, the 2nd closes it, the 3rd opens the next, etc.
 * Only content inside an open/close pair becomes a slide. Content outside
 * any pair (preamble, gaps between pairs, trailing text after a close) is
 * ignored. This lets authors keep notes, titles, or documentation in the
 * same file without it appearing in the slideshow.
 *
 * If the file ends while a slide is still open (odd number of delimiters),
 * the open slide is implicitly closed at EOF.
 *
 * Delimiters inside fenced code blocks (``` or ::: mermaid) are ignored.
 * Empty slides (open immediately followed by close) are skipped.
 *
 * A leading YAML front matter block (line 0 = "---", closed by "---" or "...")
 * is detected and excluded from slide content.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {string[]} Array of per-slide markdown strings
 */
function splitSlides(rawText) {
	if (!rawText) {
		return [];
	}

	const DELIMITER = /^<!--\s*slide\s*-->\s*$/i;
	const lines = rawText.split(/\r?\n/);
	let startLine = 0;

	// Skip YAML front matter if present (file starts with ---)
	if (/^---\s*$/.test(lines[0])) {
		for (let j = 1; j < lines.length; j++) {
			if (/^---\s*$/.test(lines[j]) || /^\.\.\.\s*$/.test(lines[j])) {
				startLine = j + 1;
				break;
			}
		}
	}

	const slides = [];
	let current = [];
	let insideFence = false;
	let insideColonMermaid = false;
	let insideSlide = false;

	for (let i = startLine; i < lines.length; i++) {
		const line = lines[i];

		// Track triple-backtick code fences (any language)
		if (/^```/.test(line)) {
			insideFence = !insideFence;
			if (insideSlide) {
				current.push(line);
			}
			continue;
		}

		// Track Azure DevOps style mermaid fences ::: mermaid ... :::
		if (!insideFence && /^:::\s*mermaid/.test(line)) {
			insideColonMermaid = true;
			if (insideSlide) {
				current.push(line);
			}
			continue;
		}
		if (insideColonMermaid && /^:::\s*$/.test(line)) {
			insideColonMermaid = false;
			if (insideSlide) {
				current.push(line);
			}
			continue;
		}

		// Slide delimiters are only recognized outside of fenced blocks
		if (!insideFence && !insideColonMermaid && DELIMITER.test(line)) {
			if (insideSlide) {
				// Closing delimiter — save the accumulated slide
				const slideText = current.join("\n").trim();
				if (slideText) {
					slides.push(slideText);
				}
				current = [];
				insideSlide = false;
			} else {
				// Opening delimiter — start accumulating a new slide
				current = [];
				insideSlide = true;
			}
		} else if (insideSlide) {
			current.push(line);
		}
		// Lines outside an open slide pair are silently discarded
	}

	// If file ends with an unclosed slide, treat EOF as implicit close
	if (insideSlide) {
		const last = current.join("\n").trim();
		if (last) {
			slides.push(last);
		}
	}

	return slides;
}

/**
 * Returns slides for a document, auto-detecting the appropriate mode.
 *
 * Slide mode (<!-- slide --> delimiter present): splits by delimiter,
 * each slide is raw markdown that may contain text and Mermaid blocks.
 *
 * Classic mode (no delimiter): extracts only Mermaid diagram blocks,
 * one per slide, identical to pre-slide-mode behaviour. Each block is
 * wrapped in a mermaid fence so the webview's unified renderer handles
 * both modes with the same code path.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {string[]} Array of slide strings (markdown)
 */
function getSlides(rawText) {
	if (hasSlideDelimiter(rawText)) {
		return splitSlides(rawText);
	}
	return extractMermaidBlocks(rawText).map(function (d) {
		return "```mermaid\n" + d + "\n```";
	});
}

/**
 * Generates a random nonce for Content Security Policy.
 *
 * @returns {string} Random 32-character alphanumeric string
 */
function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

/**
 * Resolves the effective Mermaid theme based on user setting and VS Code color theme.
 *
 * When the user setting is "default", auto-detects VS Code's color theme kind
 * and returns "dark" for dark/high-contrast themes, "default" for light themes.
 * Explicit user choices (dark, forest, neutral) are returned as-is.
 *
 * @returns {string} Resolved Mermaid theme name
 */
function resolveTheme() {
	const setting = vscode.workspace.getConfiguration("markdownPresentation").get("theme", "default");
	if (setting !== "default") {
		return setting;
	}
	const kind = vscode.window.activeColorTheme.kind;
	const isDark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
	return isDark ? "dark" : "default";
}

/**
 * Generates the slideshow webview HTML from a template file.
 *
 * Reads src/webview.html and replaces placeholder tokens with runtime values.
 * Returns an empty-state page when no slides are found.
 *
 * Supports both classic mode (one Mermaid diagram per slide) and slide mode
 * (mixed markdown and Mermaid content per slide, split by <!-- slide --> delimiters).
 *
 * @param {string[]} slides - Array of slide strings (raw markdown)
 * @param {string} nonce - CSP nonce token
 * @param {string} theme - Mermaid theme name (default, dark, forest, neutral)
 * @returns {string} Complete HTML page
 */
function getWebviewContent(slides, nonce, theme) {
	if (slides.length === 0) {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
	<title>Markdown Presentation</title>
	<style>
		body {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100vh;
			margin: 0;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			color: var(--vscode-descriptionForeground);
			background: var(--vscode-editor-background);
		}
		.empty { text-align: center; }
		.empty p { font-size: 1.1em; margin: 8px 0; }
	</style>
</head>
<body>
	<div class="empty">
		<p>No slides found in this file. Add &lt;!-- slide --&gt; delimiters to create slides, or include Mermaid code blocks for automatic diagram slides.</p>
	</div>
</body>
</html>`;
	}

	const templatePath = path.join(__dirname, "webview.html");
	let html = fs.readFileSync(templatePath, "utf8");

	html = html.replace(/\{\{NONCE\}\}/g, nonce);
	html = html.replace("{{THEME}}", theme);
	html = html.replace("{{SLIDES_JSON}}", JSON.stringify(slides).replace(/</g, "\\u003c"));
	html = html.replace("{{SINGLE_SLIDE_CLASS}}", slides.length === 1 ? "single-slide" : "");

	return html;
}

/**
 * Sends updated slides to the webview via postMessage.
 *
 * @param {vscode.WebviewPanel} panel - The webview panel
 * @param {string[]} slides - Updated array of slide strings (raw markdown)
 */
function postSlidesUpdate(panel, slides) {
	panel.webview.postMessage({
		type: "update",
		slides: slides
	});
}

/**
 * Activation function - called when the extension loads.
 *
 * Registers the "Show Markdown Presentation Preview" command and manages
 * a single webview panel that displays slides as a navigable slideshow.
 * Supports two modes: classic (one Mermaid diagram per slide) and slide
 * mode (mixed markdown and Mermaid content split by <!-- slide --> delimiters).
 *
 * @param {vscode.ExtensionContext} context - Extension context provided by VS Code
 */
function activate(context) {
	console.log("markdownPresentation extension activated");

	let currentPanel = undefined;
	let currentDocument = undefined;
	let debounceTimer = undefined;

	const disposable = vscode.commands.registerCommand(
		"markdownPresentation.showPreview",
		function () {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage("No active editor");
				return;
			}

			const doc = editor.document;
			if (doc.languageId !== "markdown") {
				vscode.window.showErrorMessage("Not a Markdown file");
				return;
			}

			const slides = getSlides(doc.getText());
			const theme = resolveTheme();
			const nonce = getNonce();

			if (currentPanel) {
				currentPanel.reveal(vscode.ViewColumn.Beside);
				currentDocument = doc;
				currentPanel.webview.html = getWebviewContent(slides, nonce, theme);
			} else {
				currentPanel = vscode.window.createWebviewPanel(
					"markdownPresentation",
					"Markdown Presentation",
					vscode.ViewColumn.Beside,
					{ enableScripts: true }
				);

				currentDocument = doc;
				currentPanel.webview.html = getWebviewContent(slides, nonce, theme);

				currentPanel.onDidDispose(
					() => {
						currentPanel = undefined;
						currentDocument = undefined;
					},
					null,
					context.subscriptions
				);
			}
		}
	);

	// Live-update preview when source file changes (debounced)
	const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
		(e) => {
			if (
				currentPanel &&
				currentDocument &&
				e.document.uri.toString() === currentDocument.uri.toString()
			) {
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					const slides = getSlides(e.document.getText());
					postSlidesUpdate(currentPanel, slides);
				}, 300);
			}
		}
	);

	// Re-render webview when theme configuration changes
	const changeConfigSubscription = vscode.workspace.onDidChangeConfiguration(
		(e) => {
			if (
				e.affectsConfiguration("markdownPresentation.theme") &&
				currentPanel &&
				currentDocument
			) {
				const theme = resolveTheme();
				const nonce = getNonce();
				const slides = getSlides(currentDocument.getText());
				currentPanel.webview.html = getWebviewContent(slides, nonce, theme);
			}
		}
	);

	// Re-render when VS Code color theme changes (affects auto-detected Mermaid theme)
	const changeColorThemeSubscription = vscode.window.onDidChangeActiveColorTheme(
		() => {
			if (currentPanel && currentDocument) {
				const theme = resolveTheme();
				const nonce = getNonce();
				const slides = getSlides(currentDocument.getText());
				currentPanel.webview.html = getWebviewContent(slides, nonce, theme);
			}
		}
	);

	context.subscriptions.push(disposable);
	context.subscriptions.push(changeDocumentSubscription);
	context.subscriptions.push(changeConfigSubscription);
	context.subscriptions.push(changeColorThemeSubscription);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate,
	extractMermaidBlocks,
	hasSlideDelimiter,
	splitSlides,
	getSlides,
};

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
 * Splits a markdown document into logical slides.
 *
 * Uses a horizontal rule style separator: a line that contains
 * only three dashes ("---") plus optional whitespace. Separators
 * that appear inside fenced code blocks (``` or ::: mermaid ... :::)
 * are ignored so code samples are preserved intact.
 *
 * Empty slides (whitespace only) are skipped.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {string[]} Array of per-slide markdown strings
 */
function splitSlides(rawText) {
	if (!rawText) {
		return [];
	}

	const lines = rawText.split(/\r?\n/);
	const slides = [];
	let current = [];
	let insideFence = false;
	let insideColonMermaid = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Track triple-backtick code fences (any language)
		if (line.match(/^```/)) {
			insideFence = !insideFence;
			current.push(line);
			continue;
		}

		// Track Azure DevOps style mermaid fences ::: mermaid ... :::
		if (!insideFence && line.match(/^:::\s*mermaid/)) {
			insideColonMermaid = true;
			current.push(line);
			continue;
		}
		if (insideColonMermaid && line.match(/^:::\s*$/)) {
			insideColonMermaid = false;
			current.push(line);
			continue;
		}

		// Slide separators are only recognized outside of fenced blocks
		if (!insideFence && !insideColonMermaid && /^---\s*$/.test(line)) {
			const slideText = current.join("\n").trim();
			if (slideText) {
				slides.push(slideText);
			}
			current = [];
		} else {
			current.push(line);
		}
	}

	const last = current.join("\n").trim();
	if (last) {
		slides.push(last);
	}

	return slides;
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
	const setting = vscode.workspace.getConfiguration("mermaidSlideshow").get("theme", "default");
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
 * Each slide is kept as raw markdown; the webview contains a
 * minimal markdown renderer that turns headings/paragraphs and
 * Mermaid blocks into HTML so that diagrams and text share a slide.
 *
 * @param {string[]} slides - Array of markdown slide strings
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
	<title>Mermaid Slideshow</title>
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
		<p>No slides found in this file.</p>
		<p style="font-size: 0.85em;">Add content to your markdown file and separate slides with a line containing only <code>---</code>.</p>
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
 * @param {string[]} slides - Updated array of markdown slide strings
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
 * Registers the "Show Mermaid Slideshow Preview" command and manages
 * a single webview panel that displays markdown-based slides. Each
 * slide is separated by a line containing only "---" and can contain
 * regular markdown content and Mermaid diagrams.
 *
 * @param {vscode.ExtensionContext} context - Extension context provided by VS Code
 */
function activate(context) {
	console.log("mermaidSlideshow extension activated");

	let currentPanel = undefined;
	let currentDocument = undefined;
	let debounceTimer = undefined;

	const disposable = vscode.commands.registerCommand(
		"mermaidSlideshow.showPreview",
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
		
			const slides = splitSlides(doc.getText());
			const theme = resolveTheme();
			const nonce = getNonce();

			if (currentPanel) {
				currentPanel.reveal(vscode.ViewColumn.Beside);
				currentDocument = doc;
				currentPanel.webview.html = getWebviewContent(slides, nonce, theme);
			} else {
				currentPanel = vscode.window.createWebviewPanel(
					"mermaidSlideshow",
					"Mermaid Slideshow",
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
					const slides = splitSlides(e.document.getText());
					postSlidesUpdate(currentPanel, slides);
				}, 300);
			}
		}
	);

	// Re-render webview when theme configuration changes
	const changeConfigSubscription = vscode.workspace.onDidChangeConfiguration(
		(e) => {
			if (
				e.affectsConfiguration("mermaidSlideshow.theme") &&
				currentPanel &&
				currentDocument
			) {
				const theme = resolveTheme();
				const nonce = getNonce();
				const slides = splitSlides(currentDocument.getText());
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
				const slides = splitSlides(currentDocument.getText());
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
	splitSlides,
};

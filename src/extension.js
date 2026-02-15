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
 * Returns an empty-state page when no diagrams are found.
 *
 * @param {string[]} diagrams - Array of Mermaid diagram code strings
 * @param {string} nonce - CSP nonce token
 * @param {string} theme - Mermaid theme name (default, dark, forest, neutral)
 * @returns {string} Complete HTML page
 */
function getWebviewContent(diagrams, nonce, theme) {
	if (diagrams.length === 0) {
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
		<p>No Mermaid diagrams found in this file.</p>
		<p style="font-size: 0.85em;">Add a \`\`\`mermaid code block to get started.</p>
	</div>
</body>
</html>`;
	}

	const templatePath = path.join(__dirname, "webview.html");
	let html = fs.readFileSync(templatePath, "utf8");

	html = html.replace(/\{\{NONCE\}\}/g, nonce);
	html = html.replace("{{THEME}}", theme);
	html = html.replace("{{DIAGRAMS_JSON}}", JSON.stringify(diagrams));
	html = html.replace("{{SINGLE_SLIDE_CLASS}}", diagrams.length === 1 ? "single-slide" : "");

	return html;
}

/**
 * Sends updated diagrams to the webview via postMessage.
 *
 * @param {vscode.WebviewPanel} panel - The webview panel
 * @param {string[]} diagrams - Updated array of Mermaid diagram strings
 */
function postDiagramUpdate(panel, diagrams) {
	panel.webview.postMessage({
		type: "update",
		diagrams: diagrams
	});
}

/**
 * Activation function - called when the extension loads.
 *
 * Registers the "Show Mermaid Slideshow Preview" command and manages
 * a single webview panel that displays Mermaid diagrams as a slideshow.
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

			const diagrams = extractMermaidBlocks(doc.getText());
			const theme = resolveTheme();
			const nonce = getNonce();

			if (currentPanel) {
				currentPanel.reveal(vscode.ViewColumn.Beside);
				currentDocument = doc;
				currentPanel.webview.html = getWebviewContent(diagrams, nonce, theme);
			} else {
				currentPanel = vscode.window.createWebviewPanel(
					"mermaidSlideshow",
					"Mermaid Slideshow",
					vscode.ViewColumn.Beside,
					{ enableScripts: true }
				);

				currentDocument = doc;
				currentPanel.webview.html = getWebviewContent(diagrams, nonce, theme);

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
					const diagrams = extractMermaidBlocks(e.document.getText());
					postDiagramUpdate(currentPanel, diagrams);
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
				const diagrams = extractMermaidBlocks(currentDocument.getText());
				currentPanel.webview.html = getWebviewContent(diagrams, nonce, theme);
			}
		}
	);

	// Re-render when VS Code color theme changes (affects auto-detected Mermaid theme)
	const changeColorThemeSubscription = vscode.window.onDidChangeActiveColorTheme(
		() => {
			if (currentPanel && currentDocument) {
				const theme = resolveTheme();
				const nonce = getNonce();
				const diagrams = extractMermaidBlocks(currentDocument.getText());
				currentPanel.webview.html = getWebviewContent(diagrams, nonce, theme);
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
};

/**
 * Mermaid Slideshow extension host.
 *
 * Why it exists: VS Code's markdown preview renders diagrams inline; this module
 * presents each Mermaid diagram of a markdown file as one slide in a webview.
 *
 * Approach: diagram text is extracted with a regular expression, embedded in
 * src/webview.html through single-pass substitution, and refreshed by posted
 * messages while the file changes. Invariants: one panel at a time, no global
 * state, every render uses a fresh nonce, and diagram text and settings are
 * treated as untrusted when they enter the page.
 */

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Exact Mermaid version loaded from the CDN. Floating tags would let an
 * upstream release change rendering or security behavior without a review.
 */
const MERMAID_VERSION = "12.1.0";

/** Mermaid themes the settings UI offers; anything else is rejected. */
const MERMAID_THEMES = ["default", "dark", "forest", "neutral"];

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

	// One alternation keeps slides in document order across both syntaxes.
	const blockRegex = /```mermaid\s*\n([\s\S]*?)```|:::\s*mermaid\s*\n([\s\S]*?):::/g;
	let match;
	while ((match = blockRegex.exec(rawText)) !== null) {
		const code = (match[1] !== undefined ? match[1] : match[2]).trim();
		if (code) {
			blocks.push(code);
		}
	}

	return blocks;
}

/**
 * Generates a random nonce for Content Security Policy.
 *
 * Uses the operating system's random source because a predictable nonce
 * would let injected markup satisfy the policy.
 *
 * @returns {string} Random 32-character hexadecimal string
 */
function getNonce() {
	return crypto.randomBytes(16).toString("hex");
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
	// Workspace settings come from the repository being opened, so the value is
	// untrusted. It is written into a script, hence the allowlist.
	if (MERMAID_THEMES.includes(setting) && setting !== "default") {
		return setting;
	}
	return resolveAutoTheme();
}

/**
 * Maps the VS Code color theme kind to a Mermaid theme.
 *
 * @returns {string} "dark" for dark and high-contrast themes, otherwise "default"
 */
function resolveAutoTheme() {
	const kind = vscode.window.activeColorTheme.kind;
	const isDark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
	return isDark ? "dark" : "default";
}

/**
 * Serializes a value as JSON that is safe inside an inline script element.
 *
 * Diagram text is attacker-controlled; a literal "</script>" or an HTML
 * comment opener inside it would otherwise end the script element early.
 * U+2028/U+2029 are escaped for engines that treat them as line terminators.
 *
 * @param {unknown} value - JSON-serializable value
 * @returns {string} JSON text with "<", ">", "&", U+2028 and U+2029 escaped
 */
function toScriptJson(value) {
	return JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
}

/**
 * Generates the slideshow webview HTML from a template file.
 *
 * Reads src/webview.html and replaces placeholder tokens with runtime values
 * in a single pass, so substituted text is never scanned for further
 * placeholders. The template also renders the empty state, which keeps the
 * live-update listener present when a file gains its first diagram.
 *
 * @param {string[]} diagrams - Array of Mermaid diagram code strings
 * @param {string} nonce - CSP nonce token
 * @param {string} theme - Mermaid theme name (default, dark, forest, neutral)
 * @returns {string} Complete HTML page
 */
function getWebviewContent(diagrams, nonce, theme) {
	const templatePath = path.join(__dirname, "webview.html");
	const template = fs.readFileSync(templatePath, "utf8");

	const values = {
		NONCE: nonce,
		THEME: MERMAID_THEMES.includes(theme) ? theme : "default",
		MERMAID_URL: `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.esm.min.mjs`,
		DIAGRAMS_JSON: toScriptJson(diagrams),
		SINGLE_SLIDE_CLASS: diagrams.length === 1 ? "single-slide" : ""
	};

	return template.replace(/\{\{([A-Z_]+)\}\}/g, (token, key) =>
		Object.prototype.hasOwnProperty.call(values, key) ? values[key] : token
	);
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

	const disposable = vscode.commands.registerCommand("mermaidSlideshow.showPreview", function () {
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
				// No local files are loaded into the webview, so grant access to none.
				{ enableScripts: true, localResourceRoots: [] }
			);

			currentDocument = doc;
			currentPanel.webview.html = getWebviewContent(diagrams, nonce, theme);

			currentPanel.onDidDispose(
				() => {
					clearTimeout(debounceTimer);
					currentPanel = undefined;
					currentDocument = undefined;
				},
				null,
				context.subscriptions
			);
		}
	});

	// Live-update preview when source file changes (debounced)
	const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
		if (currentPanel && currentDocument && e.document.uri.toString() === currentDocument.uri.toString()) {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				// The panel may have been closed or pointed at another file during the delay.
				if (currentPanel && currentDocument && currentDocument.uri.toString() === e.document.uri.toString()) {
					postDiagramUpdate(currentPanel, extractMermaidBlocks(e.document.getText()));
				}
			}, 300);
		}
	});

	// Re-render webview when theme configuration changes
	const changeConfigSubscription = vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration("mermaidSlideshow.theme") && currentPanel && currentDocument) {
			const theme = resolveTheme();
			const nonce = getNonce();
			const diagrams = extractMermaidBlocks(currentDocument.getText());
			currentPanel.webview.html = getWebviewContent(diagrams, nonce, theme);
		}
	});

	// Re-render when VS Code color theme changes (affects auto-detected Mermaid theme)
	const changeColorThemeSubscription = vscode.window.onDidChangeActiveColorTheme(() => {
		if (currentPanel && currentDocument) {
			const theme = resolveTheme();
			const nonce = getNonce();
			const diagrams = extractMermaidBlocks(currentDocument.getText());
			currentPanel.webview.html = getWebviewContent(diagrams, nonce, theme);
		}
	});

	context.subscriptions.push({ dispose: () => clearTimeout(debounceTimer) });
	context.subscriptions.push(disposable);
	context.subscriptions.push(changeDocumentSubscription);
	context.subscriptions.push(changeConfigSubscription);
	context.subscriptions.push(changeColorThemeSubscription);
}

/**
 * Deactivation hook. Cleanup runs through context.subscriptions.
 */
function deactivate() {}

module.exports = {
	activate,
	deactivate,
	extractMermaidBlocks,
	getNonce,
	getWebviewContent,
	resolveTheme,
	MERMAID_VERSION
};

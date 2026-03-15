const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * @typedef {Object} Slide
 * @property {"mermaid"|"image"|"markdown"} type - The slide content type
 * @property {string} content - Mermaid code, image URI, or raw markdown text
 */

/**
 * Extracts presentation slides from raw markdown text.
 *
 * Splits the document on horizontal rules (---) into sections, then classifies
 * each section as a mermaid diagram, image, or markdown content slide.
 * Within a section, mermaid blocks and images are pulled out as individual slides;
 * remaining text (if non-trivial) becomes a markdown slide.
 *
 * Respects feature toggles: when a content type is disabled, those slides are omitted.
 *
 * @param {string} rawText - Raw markdown file content
 * @param {Object} [options] - Feature toggles
 * @param {boolean} [options.enableMermaid=true] - Include mermaid diagram slides
 * @param {boolean} [options.enableImages=true] - Include image slides
 * @param {boolean} [options.enableMarkdown=true] - Include markdown content slides
 * @returns {Slide[]} Array of typed slide objects in document order
 */
function extractSlides(rawText, options) {
	const enableMermaid = options?.enableMermaid !== false;
	const enableImages = options?.enableImages !== false;
	const enableMarkdown = options?.enableMarkdown !== false;

	const slides = [];

	// Split on horizontal rules (---, ***, ___) that are on their own line
	const sections = rawText.split(/^(?:---|\*\*\*|___)\s*$/m);

	for (const section of sections) {
		extractSlidesFromSection(section, slides, enableMermaid, enableImages, enableMarkdown);
	}

	return slides;
}

/**
 * Extracts slides from a single section of markdown (between --- separators).
 *
 * Finds mermaid blocks and images in order, and treats leftover non-empty text
 * as a markdown slide.
 *
 * @param {string} section - Raw markdown section text
 * @param {Slide[]} slides - Array to push slides into (mutated)
 * @param {boolean} enableMermaid - Whether to include mermaid slides
 * @param {boolean} enableImages - Whether to include image slides
 * @param {boolean} enableMarkdown - Whether to include markdown slides
 */
function extractSlidesFromSection(section, slides, enableMermaid, enableImages, enableMarkdown) {
	// Collect all special blocks with their positions
	const tokens = [];

	// Mermaid backtick blocks: ```mermaid ... ```
	const backtickRegex = /```mermaid\s*\n([\s\S]*?)```/g;
	let match;
	while ((match = backtickRegex.exec(section)) !== null) {
		const code = match[1].trim();
		if (code && enableMermaid) {
			tokens.push({ type: "mermaid", content: code, start: match.index, end: match.index + match[0].length });
		} else {
			// Still mark position so leftover text excludes the raw fence
			tokens.push({ type: "_skip", content: "", start: match.index, end: match.index + match[0].length });
		}
	}

	// Mermaid Azure DevOps blocks: ::: mermaid ... :::
	const colonRegex = /:::\s*mermaid\s*\n([\s\S]*?):::/g;
	while ((match = colonRegex.exec(section)) !== null) {
		const code = match[1].trim();
		if (code && enableMermaid) {
			tokens.push({ type: "mermaid", content: code, start: match.index, end: match.index + match[0].length });
		} else {
			tokens.push({ type: "_skip", content: "", start: match.index, end: match.index + match[0].length });
		}
	}

	// Non-mermaid fenced code blocks: ```lang ... ``` (exclude from markdown leftover to avoid double-rendering)
	const codeBlockRegex = /```(?!mermaid)[\s\S]*?```/g;
	const codeBlockPositions = [];
	while ((match = codeBlockRegex.exec(section)) !== null) {
		codeBlockPositions.push({ start: match.index, end: match.index + match[0].length });
	}

	// Images: ![alt](path) — only outside code blocks
	const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
	while ((match = imageRegex.exec(section)) !== null) {
		// Skip images inside code blocks
		const pos = match.index;
		const insideCode = codeBlockPositions.some(b => pos >= b.start && pos < b.end);
		if (insideCode) continue;

		const src = match[2].trim();
		if (src && enableImages) {
			tokens.push({ type: "image", content: src, start: match.index, end: match.index + match[0].length });
		} else {
			tokens.push({ type: "_skip", content: "", start: match.index, end: match.index + match[0].length });
		}
	}

	// Sort tokens by position
	tokens.sort((a, b) => a.start - b.start);

	// Emit slides in document order, interleaving markdown leftovers
	let cursor = 0;
	for (const token of tokens) {
		if (enableMarkdown) {
			const before = section.slice(cursor, token.start).trim();
			if (before && !isBlankMarkdown(before)) {
				slides.push({ type: "markdown", content: before });
			}
		}
		if (token.type !== "_skip") {
			slides.push({ type: token.type, content: token.content });
		}
		cursor = token.end;
	}

	// Trailing text after last token (only when tokens exist)
	if (enableMarkdown && tokens.length > 0) {
		const trailing = section.slice(cursor).trim();
		if (trailing && !isBlankMarkdown(trailing)) {
			slides.push({ type: "markdown", content: trailing });
		}
	}

	// If no tokens were found at all and markdown is enabled, treat entire section as markdown
	if (tokens.length === 0 && enableMarkdown) {
		const trimmed = section.trim();
		if (trimmed && !isBlankMarkdown(trimmed)) {
			slides.push({ type: "markdown", content: trimmed });
		}
	}
}

/**
 * Checks if a markdown string is effectively blank (only whitespace or headings with no content).
 *
 * @param {string} text - Markdown text to check
 * @returns {boolean} True if the text has no meaningful content
 */
function isBlankMarkdown(text) {
	// Strip headings and whitespace — if nothing remains, it's blank
	const stripped = text.replace(/^#+\s+.*$/gm, "").trim();
	return stripped.length === 0;
}

/**
 * Extracts Mermaid diagram code blocks from raw markdown text.
 *
 * Legacy wrapper around extractSlides for backward compatibility.
 * Returns only mermaid diagram content strings.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {string[]} Array of Mermaid diagram code strings (trimmed)
 */
function extractMermaidBlocks(rawText) {
	const slides = extractSlides(rawText, { enableMermaid: true, enableImages: false, enableMarkdown: false });
	return slides.map(s => s.content);
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
 * Reads the current feature toggle settings.
 *
 * @returns {{ enableImages: boolean, enableMarkdown: boolean }} Current settings
 */
function resolveSettings() {
	const config = vscode.workspace.getConfiguration("mermaidSlideshow");
	return {
		enableImages: config.get("enableImages", true),
		enableMarkdown: config.get("enableMarkdownSlides", true),
	};
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
 *
 * Converts local image paths to webview-safe URIs and passes the document
 * directory so relative paths can be resolved.
 *
 * @param {Slide[]} slides - Array of typed slide objects
 * @param {string} nonce - CSP nonce token
 * @param {string} theme - Mermaid theme name (default, dark, forest, neutral)
 * @param {vscode.Webview} webview - The webview for URI conversion
 * @param {vscode.Uri} docUri - URI of the source markdown document
 * @returns {string} Complete HTML page
 */
function getWebviewContent(slides, nonce, theme, webview, docUri) {
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
		<p>No presentation slides found in this file.</p>
		<p style="font-size: 0.85em;">Add Mermaid diagrams, images, or markdown sections separated by --- to get started.</p>
	</div>
</body>
</html>`;
	}

	// Convert local image paths to webview-safe URIs
	const docDir = vscode.Uri.joinPath(docUri, "..");
	const resolvedSlides = slides.map(slide => {
		if (slide.type === "image") {
			const src = slide.content;
			// Absolute URL — pass through
			if (/^https?:\/\//i.test(src)) {
				return slide;
			}
			// Resolve relative path from the markdown file's directory
			const imageUri = vscode.Uri.joinPath(docDir, src);
			return { type: "image", content: webview.asWebviewUri(imageUri).toString() };
		}
		return slide;
	});

	const templatePath = path.join(__dirname, "webview.html");
	let html = fs.readFileSync(templatePath, "utf8");

	const cspSource = webview.cspSource;

	html = html.replace(/\{\{NONCE\}\}/g, nonce);
	html = html.replace("{{THEME}}", theme);
	html = html.replace("{{SLIDES_JSON}}", JSON.stringify(resolvedSlides));
	html = html.replace("{{SINGLE_SLIDE_CLASS}}", slides.length === 1 ? "single-slide" : "");
	html = html.replace("{{CSP_SOURCE}}", cspSource);

	return html;
}

/**
 * Sends updated slides to the webview via postMessage.
 *
 * @param {vscode.WebviewPanel} panel - The webview panel
 * @param {Slide[]} slides - Updated array of typed slide objects
 */
function postSlideUpdate(panel, slides) {
	panel.webview.postMessage({
		type: "update",
		slides: slides
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

	/**
	 * Builds slides from the current document using active settings.
	 *
	 * @param {vscode.TextDocument} doc - The markdown document
	 * @returns {Slide[]} Extracted slides
	 */
	function buildSlides(doc) {
		const { enableImages, enableMarkdown } = resolveSettings();
		return extractSlides(doc.getText(), {
			enableMermaid: true,
			enableImages,
			enableMarkdown,
		});
	}

	/**
	 * Performs a full HTML render of the webview with current slides.
	 */
	function fullRender() {
		if (!currentPanel || !currentDocument) return;
		const slides = buildSlides(currentDocument);
		const theme = resolveTheme();
		const nonce = getNonce();
		currentPanel.webview.html = getWebviewContent(
			slides, nonce, theme, currentPanel.webview, currentDocument.uri
		);
	}

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

			if (currentPanel) {
				currentPanel.reveal(vscode.ViewColumn.Beside);
				currentDocument = doc;
				fullRender();
			} else {
				currentPanel = vscode.window.createWebviewPanel(
					"mermaidSlideshow",
					"Mermaid Slideshow",
					vscode.ViewColumn.Beside,
					{ enableScripts: true }
				);

				currentDocument = doc;
				fullRender();

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
					const slides = buildSlides(e.document);
					// For live updates, resolve image URIs before sending
					const docDir = vscode.Uri.joinPath(currentDocument.uri, "..");
					const resolvedSlides = slides.map(slide => {
						if (slide.type === "image" && !/^https?:\/\//i.test(slide.content)) {
							const imageUri = vscode.Uri.joinPath(docDir, slide.content);
							return { type: "image", content: currentPanel.webview.asWebviewUri(imageUri).toString() };
						}
						return slide;
					});
					postSlideUpdate(currentPanel, resolvedSlides);
				}, 300);
			}
		}
	);

	// Re-render webview when any mermaidSlideshow configuration changes
	const changeConfigSubscription = vscode.workspace.onDidChangeConfiguration(
		(e) => {
			if (
				(e.affectsConfiguration("mermaidSlideshow.theme") ||
				 e.affectsConfiguration("mermaidSlideshow.enableImages") ||
				 e.affectsConfiguration("mermaidSlideshow.enableMarkdownSlides")) &&
				currentPanel &&
				currentDocument
			) {
				fullRender();
			}
		}
	);

	// Re-render when VS Code color theme changes (affects auto-detected Mermaid theme)
	const changeColorThemeSubscription = vscode.window.onDidChangeActiveColorTheme(
		() => {
			if (currentPanel && currentDocument) {
				fullRender();
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
	extractSlides,
};

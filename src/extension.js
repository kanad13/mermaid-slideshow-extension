const vscode = require("vscode");

/**
 * Extracts Mermaid diagram code blocks from raw markdown text.
 *
 * Supports two syntaxes:
 * - Backtick style: ```mermaid ... ```
 * - Azure DevOps / Fenced Div style: ::: mermaid ... :::
 *
 * Operates on raw text via regex — no markdown parsing required.
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
 * Generates the slideshow webview HTML.
 *
 * Renders one Mermaid diagram at a time, centered in the panel.
 * Navigation via arrow keys and mouse scroll. Slide counter overlay.
 *
 * @param {string[]} diagrams - Array of Mermaid diagram code strings
 * @param {string} nonce - CSP nonce token
 * @returns {string} Complete HTML page
 */
function getWebviewContent(diagrams, nonce) {
	if (diagrams.length === 0) {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
	<title>Mermaid Slides</title>
	<style>
		body {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100vh;
			margin: 0;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			color: #666;
			background: #fff;
		}
		.empty { text-align: center; }
		.empty p { font-size: 1.1em; margin: 8px 0; }
	</style>
</head>
<body>
	<div class="empty">
		<p>No Mermaid diagrams found in this file.</p>
		<p style="font-size: 0.85em; color: #999;">Add a \`\`\`mermaid code block to get started.</p>
	</div>
</body>
</html>`;
	}

	// Serialize diagrams as JSON for the client-side script
	const diagramsJson = JSON.stringify(diagrams);

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; style-src 'unsafe-inline';">
	<title>Mermaid Slides</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }

		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: #fff;
			height: 100vh;
			overflow: hidden;
			user-select: none;
		}

		.slide-container {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100vh;
			padding: 40px 60px;
			position: relative;
		}

		.slide-content {
			width: 100%;
			max-height: calc(100vh - 120px);
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: auto;
		}

		.slide-content .mermaid {
			background: transparent;
			border: none;
			text-align: center;
			width: 100%;
		}

		.slide-content .mermaid svg {
			max-width: 100%;
			max-height: calc(100vh - 140px);
			height: auto;
		}

		/* Slide counter */
		.slide-counter {
			position: fixed;
			bottom: 16px;
			right: 20px;
			font-size: 0.85em;
			color: #999;
			background: rgba(255, 255, 255, 0.9);
			padding: 4px 12px;
			border-radius: 12px;
			border: 1px solid #e0e0e0;
		}

		/* Navigation arrows */
		.nav-arrow {
			position: fixed;
			top: 50%;
			transform: translateY(-50%);
			background: transparent;
			border: 1px solid #d0d0d0;
			color: #666;
			font-size: 1.4em;
			width: 36px;
			height: 36px;
			border-radius: 50%;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: background 0.15s ease, border-color 0.15s ease;
			z-index: 10;
		}

		.nav-arrow:hover {
			background: #f5f5f5;
			border-color: #999;
		}

		.nav-arrow.prev { left: 10px; }
		.nav-arrow.next { right: 10px; }

		.nav-arrow:disabled {
			opacity: 0.3;
			cursor: default;
		}

		.nav-arrow:disabled:hover {
			background: transparent;
			border-color: #d0d0d0;
		}

		/* Hide nav when only one slide */
		.single-slide .nav-arrow,
		.single-slide .slide-counter {
			display: none;
		}
	</style>
</head>
<body class="${diagrams.length === 1 ? "single-slide" : ""}">
	<button class="nav-arrow prev" aria-label="Previous slide">&#8249;</button>
	<button class="nav-arrow next" aria-label="Next slide">&#8250;</button>
	<div class="slide-container">
		<div class="slide-content">
			<pre class="mermaid"></pre>
		</div>
	</div>
	<div class="slide-counter"></div>

	<script type="module" nonce="${nonce}">
		import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

		const diagrams = ${diagramsJson};
		let currentIndex = 0;

		mermaid.initialize({
			startOnLoad: false,
			theme: 'default',
			securityLevel: 'loose'
		});

		const container = document.querySelector('.slide-content');
		const counter = document.querySelector('.slide-counter');
		const prevBtn = document.querySelector('.nav-arrow.prev');
		const nextBtn = document.querySelector('.nav-arrow.next');

		async function renderSlide(index) {
			currentIndex = index;

			// Clear previous render and create fresh element
			container.innerHTML = '<pre class="mermaid">' + diagrams[currentIndex] + '</pre>';

			try {
				await mermaid.run({ querySelector: '.mermaid' });
			} catch (error) {
				console.error('Mermaid rendering failed:', error);
				container.innerHTML = '<p style="color: #c00;">Failed to render diagram ' + (currentIndex + 1) + '</p>';
			}

			counter.textContent = (currentIndex + 1) + ' / ' + diagrams.length;
			prevBtn.disabled = currentIndex === 0;
			nextBtn.disabled = currentIndex === diagrams.length - 1;
		}

		function goNext() {
			if (currentIndex < diagrams.length - 1) {
				renderSlide(currentIndex + 1);
			}
		}

		function goPrev() {
			if (currentIndex > 0) {
				renderSlide(currentIndex - 1);
			}
		}

		// Keyboard navigation
		document.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
				e.preventDefault();
				goNext();
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
				e.preventDefault();
				goPrev();
			}
		});

		// Mouse scroll navigation (debounced to prevent rapid firing)
		let scrollCooldown = false;
		document.addEventListener('wheel', (e) => {
			if (scrollCooldown) return;
			scrollCooldown = true;
			setTimeout(() => { scrollCooldown = false; }, 300);

			if (e.deltaY > 0) {
				goNext();
			} else if (e.deltaY < 0) {
				goPrev();
			}
		});

		// Click navigation
		prevBtn.addEventListener('click', goPrev);
		nextBtn.addEventListener('click', goNext);

		// Listen for messages from the extension (live updates)
		window.addEventListener('message', (event) => {
			const message = event.data;
			if (message.type === 'update') {
				diagrams.length = 0;
				diagrams.push(...message.diagrams);

				if (diagrams.length === 0) {
					container.innerHTML = '<p style="color: #666;">No Mermaid diagrams found.</p>';
					counter.textContent = '';
					document.body.classList.add('single-slide');
					return;
				}

				document.body.classList.toggle('single-slide', diagrams.length === 1);

				// Clamp current index if diagrams were removed
				const newIndex = Math.min(currentIndex, diagrams.length - 1);
				renderSlide(newIndex);
			}
		});

		// Render first slide
		renderSlide(0);
	</script>
</body>
</html>`;
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
 * Activation function — called when the extension loads.
 *
 * Registers the "Show Mermaid Slides Preview" command and manages
 * a single webview panel that displays Mermaid diagrams as a slideshow.
 *
 * @param {vscode.ExtensionContext} context - Extension context provided by VS Code
 */
function activate(context) {
	console.log("mermaidSlides extension activated");

	let currentPanel = undefined;
	let currentDocument = undefined;

	const disposable = vscode.commands.registerCommand(
		"mermaidSlides.showPreview",
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

			if (currentPanel) {
				currentPanel.reveal(vscode.ViewColumn.Beside);
				currentDocument = doc;
				postDiagramUpdate(currentPanel, diagrams);
			} else {
				const nonce = getNonce();

				currentPanel = vscode.window.createWebviewPanel(
					"mermaidSlidesPreview",
					"Mermaid Slides",
					vscode.ViewColumn.Beside,
					{
						enableScripts: true,
						retainContextWhenHidden: true,
					}
				);

				currentDocument = doc;
				currentPanel.webview.html = getWebviewContent(diagrams, nonce);

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

	// Live-update preview when source file changes
	const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
		(e) => {
			if (
				currentPanel &&
				currentDocument &&
				e.document.uri.toString() === currentDocument.uri.toString()
			) {
				const diagrams = extractMermaidBlocks(e.document.getText());
				postDiagramUpdate(currentPanel, diagrams);
			}
		}
	);

	context.subscriptions.push(disposable);
	context.subscriptions.push(changeDocumentSubscription);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate,
};

/**
 * Serves the real webview HTML on localhost so the slideshow can be checked
 * in an ordinary browser (themes, CDN loading, navigation) without launching
 * the extension host.
 *
 * Usage: node scripts/webview-harness.js [port]
 *   http://127.0.0.1:<port>/?file=examples/test.md&theme=default&scheme=dark[&break=1][&mermaid=x.y.z]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { installVscodeFake } = require("../test/helpers/vscode-fake");

installVscodeFake();
const { extractMermaidBlocks, getNonce, getWebviewContent } = require("../src/extension");

const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2]) || 8731;

// VS Code injects these variables into real webviews; fixed values stand in for a light and a dark theme.
const palettes = {
	light: "--vscode-editor-background:#fff;--vscode-editor-foreground:#333;--vscode-descriptionForeground:#717171;--vscode-errorForeground:#a1260d;--vscode-editorWidget-background:#f3f3f3;--vscode-list-hoverBackground:#e8e8e8;--vscode-focusBorder:#0090f1;",
	dark: "--vscode-editor-background:#1e1e1e;--vscode-editor-foreground:#ccc;--vscode-descriptionForeground:#9d9d9d;--vscode-errorForeground:#f48771;--vscode-editorWidget-background:#252526;--vscode-list-hoverBackground:#2a2d2e;--vscode-focusBorder:#007fd4;"
};

http.createServer((req, res) => {
	const url = new URL(req.url, "http://127.0.0.1");
	const file = path.resolve(root, url.searchParams.get("file") || "examples/test.md");
	if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
		res.writeHead(404).end("File must exist inside the repository");
		return;
	}
	const theme = url.searchParams.get("theme") || "default";
	const scheme = url.searchParams.get("scheme") === "dark" ? "dark" : "light";
	const diagrams = extractMermaidBlocks(fs.readFileSync(file, "utf8"));
	let html = getWebviewContent(diagrams, getNonce(), theme).replace(
		"</head>",
		`<style>:root{${palettes[scheme]}}</style></head>`
	);
	// ?break=1 points the import at a missing CDN path to exercise the load-failure notice.
	if (url.searchParams.get("break")) {
		html = html.replace("/npm/mermaid@", "/npm/mermaid-missing@");
	}
	// ?mermaid=x.y.z compares another Mermaid release against the pinned one.
	const other = url.searchParams.get("mermaid");
	if (other && /^\d+\.\d+\.\d+$/.test(other)) {
		html = html.replace(/\/npm\/mermaid@[\d.]+\//, `/npm/mermaid@${other}/`);
	}
	res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);
}).listen(port, "127.0.0.1", () => console.log(`Harness at http://127.0.0.1:${port}/`));

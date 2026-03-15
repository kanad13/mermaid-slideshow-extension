const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Minimal vscode stub - extension.js requires vscode at module level
const Module = require("node:module");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
	if (request === "vscode") return "vscode";
	return originalResolve.call(this, request, ...args);
};
require.cache["vscode"] = {
	id: "vscode", filename: "vscode", loaded: true,
	exports: {
		workspace: { getConfiguration: () => ({ get: () => "default" }), onDidChangeTextDocument: () => ({ dispose() {} }), onDidChangeConfiguration: () => ({ dispose() {} }) },
		window: { activeColorTheme: { kind: 1 }, onDidChangeActiveColorTheme: () => ({ dispose() {} }) },
		commands: { registerCommand: () => ({ dispose() {} }) },
		ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
		ViewColumn: { Beside: 2 },
	}
};

const { extractMermaidBlocks, extractSlides } = require("../src/extension");

describe("extractMermaidBlocks", () => {

	it("extracts a single backtick-fenced mermaid block", () => {
		const input = "# Title\n\n```mermaid\ngraph TD\n  A --> B\n```\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 1);
		assert.equal(result[0], "graph TD\n  A --> B");
	});

	it("extracts multiple backtick-fenced blocks", () => {
		const input = "```mermaid\ngraph TD\n  A --> B\n```\n\nSome text\n\n```mermaid\nsequenceDiagram\n  Alice->>Bob: Hi\n```\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 2);
		assert.match(result[0], /graph TD/);
		assert.match(result[1], /sequenceDiagram/);
	});

	it("extracts Azure DevOps triple-colon syntax", () => {
		const input = "::: mermaid\ngraph LR\n  A --> B\n:::\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 1);
		assert.equal(result[0], "graph LR\n  A --> B");
	});

	it("extracts mixed backtick and Azure DevOps syntax", () => {
		const input = "```mermaid\ngraph TD\n  A --> B\n```\n\n::: mermaid\nsequenceDiagram\n  Alice->>Bob: Hi\n:::\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 2);
		assert.match(result[0], /graph TD/);
		assert.match(result[1], /sequenceDiagram/);
	});

	it("returns empty array when no mermaid blocks exist", () => {
		const input = "# Just a heading\n\nSome paragraph text.\n";
		const result = extractMermaidBlocks(input);
		assert.deepEqual(result, []);
	});

	it("ignores non-mermaid code fences", () => {
		const input = "```javascript\nconsole.log('hello');\n```\n\n```python\nprint('hi')\n```\n";
		const result = extractMermaidBlocks(input);
		assert.deepEqual(result, []);
	});

	it("skips empty mermaid blocks", () => {
		const input = "```mermaid\n\n```\n\n```mermaid\ngraph TD\n  A --> B\n```\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /graph TD/);
	});

	it("trims whitespace from extracted blocks", () => {
		const input = "```mermaid\n\n  graph TD\n    A --> B\n\n```\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /^graph TD/);
	});

	it("handles empty input", () => {
		assert.deepEqual(extractMermaidBlocks(""), []);
	});

	it("handles Azure DevOps syntax without space before mermaid", () => {
		const input = ":::mermaid\ngraph LR\n  X --> Y\n:::\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /graph LR/);
	});
});

describe("extractSlides", () => {

	it("extracts mermaid blocks as mermaid slides", () => {
		const input = "```mermaid\ngraph TD\n  A --> B\n```\n";
		const result = extractSlides(input);
		assert.equal(result.length, 1);
		assert.equal(result[0].type, "mermaid");
		assert.match(result[0].content, /graph TD/);
	});

	it("extracts images as image slides", () => {
		const input = "![My photo](images/photo.png)\n";
		const result = extractSlides(input);
		const imageSlides = result.filter(s => s.type === "image");
		assert.equal(imageSlides.length, 1);
		assert.equal(imageSlides[0].content, "images/photo.png");
	});

	it("extracts markdown text as markdown slides", () => {
		const input = "# Hello World\n\nThis is a paragraph with **bold** text.\n\n- Item 1\n- Item 2\n";
		const result = extractSlides(input);
		const mdSlides = result.filter(s => s.type === "markdown");
		assert.ok(mdSlides.length >= 1);
		assert.match(mdSlides[0].content, /Hello World/);
	});

	it("splits on --- horizontal rules into separate slides", () => {
		const input = "# Slide One\n\nContent one.\n\n---\n\n# Slide Two\n\nContent two.\n";
		const result = extractSlides(input);
		const mdSlides = result.filter(s => s.type === "markdown");
		assert.equal(mdSlides.length, 2);
		assert.match(mdSlides[0].content, /Slide One/);
		assert.match(mdSlides[1].content, /Slide Two/);
	});

	it("preserves document order for mixed content", () => {
		const input = "# Intro\n\nSome text.\n\n```mermaid\ngraph TD\n  A --> B\n```\n\n![pic](img.png)\n\nMore text.\n";
		const result = extractSlides(input);
		assert.ok(result.length >= 3);
		// First should be markdown (intro text), then mermaid, then image or markdown
		const types = result.map(s => s.type);
		const mermaidIdx = types.indexOf("mermaid");
		const imageIdx = types.indexOf("image");
		assert.ok(mermaidIdx > 0, "mermaid should not be first (intro text comes first)");
		assert.ok(imageIdx > mermaidIdx, "image should come after mermaid");
	});

	it("respects enableImages=false", () => {
		const input = "![pic](img.png)\n\n```mermaid\ngraph TD\n  A --> B\n```\n";
		const result = extractSlides(input, { enableImages: false });
		const imageSlides = result.filter(s => s.type === "image");
		assert.equal(imageSlides.length, 0);
		const mermaidSlides = result.filter(s => s.type === "mermaid");
		assert.equal(mermaidSlides.length, 1);
	});

	it("respects enableMarkdown=false", () => {
		const input = "# Title\n\nSome text.\n\n```mermaid\ngraph TD\n  A --> B\n```\n";
		const result = extractSlides(input, { enableMarkdown: false });
		const mdSlides = result.filter(s => s.type === "markdown");
		assert.equal(mdSlides.length, 0);
		const mermaidSlides = result.filter(s => s.type === "mermaid");
		assert.equal(mermaidSlides.length, 1);
	});

	it("respects enableMermaid=false", () => {
		const input = "# Title\n\n```mermaid\ngraph TD\n  A --> B\n```\n";
		const result = extractSlides(input, { enableMermaid: false });
		const mermaidSlides = result.filter(s => s.type === "mermaid");
		assert.equal(mermaidSlides.length, 0);
	});

	it("skips blank sections from multiple --- separators", () => {
		const input = "---\n\n---\n\n# Actual content\n\nHello.\n";
		const result = extractSlides(input);
		assert.ok(result.length >= 1);
		const mdSlides = result.filter(s => s.type === "markdown");
		assert.ok(mdSlides.some(s => s.content.includes("Hello")));
	});

	it("does not treat images inside code blocks as image slides", () => {
		const input = "```javascript\n// ![not an image](fake.png)\nconsole.log('hi');\n```\n";
		const result = extractSlides(input);
		const imageSlides = result.filter(s => s.type === "image");
		assert.equal(imageSlides.length, 0);
	});

	it("handles Azure DevOps mermaid with mixed content", () => {
		const input = "Some text.\n\n::: mermaid\ngraph LR\n  A --> B\n:::\n\nMore text.\n";
		const result = extractSlides(input);
		const types = result.map(s => s.type);
		assert.ok(types.includes("mermaid"));
	});

	it("handles empty input", () => {
		const result = extractSlides("");
		assert.deepEqual(result, []);
	});

	it("handles mermaid-only mode (all other features disabled)", () => {
		const input = "# Title\n\n![pic](img.png)\n\n```mermaid\ngraph TD\n  A --> B\n```\n\nText.\n";
		const result = extractSlides(input, { enableImages: false, enableMarkdown: false });
		assert.equal(result.length, 1);
		assert.equal(result[0].type, "mermaid");
	});

	it("extracts multiple images from a section", () => {
		const input = "![a](one.png)\n\n![b](two.jpg)\n";
		const result = extractSlides(input);
		const imageSlides = result.filter(s => s.type === "image");
		assert.equal(imageSlides.length, 2);
		assert.equal(imageSlides[0].content, "one.png");
		assert.equal(imageSlides[1].content, "two.jpg");
	});

	it("handles sections with only headings as blank", () => {
		const input = "## Just a heading\n";
		const result = extractSlides(input);
		// A heading alone with no body content is considered blank
		assert.equal(result.length, 0);
	});
});

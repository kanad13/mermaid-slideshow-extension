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

const { extractMermaidBlocks, hasSlideDelimiter, splitSlides, getSlides } = require("../src/extension");

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

describe("splitSlides (paired fence semantics)", () => {

	it("extracts content between a single open/close pair", () => {
		const input = "<!-- slide -->\n# Slide 1\nContent here\n<!-- slide -->";
		const result = splitSlides(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /Slide 1/);
		assert.match(result[0], /Content here/);
	});

	it("extracts multiple paired slides", () => {
		const input = "<!-- slide -->\n# Slide 1\n<!-- slide -->\n<!-- slide -->\n# Slide 2\n<!-- slide -->";
		const result = splitSlides(input);
		assert.equal(result.length, 2);
		assert.match(result[0], /Slide 1/);
		assert.match(result[1], /Slide 2/);
	});

	it("discards content outside pairs (preamble, gaps, trailing)", () => {
		const input = "# Preamble\n<!-- slide -->\n# Slide 1\n<!-- slide -->\nGap text\n<!-- slide -->\n# Slide 2\n<!-- slide -->\nTrailing";
		const result = splitSlides(input);
		assert.equal(result.length, 2);
		assert.match(result[0], /Slide 1/);
		assert.doesNotMatch(result[0], /Preamble/);
		assert.match(result[1], /Slide 2/);
		assert.doesNotMatch(result[1], /Gap text/);
		assert.doesNotMatch(result[1], /Trailing/);
	});

	it("implicitly closes a slide at EOF (odd number of delimiters)", () => {
		const input = "<!-- slide -->\n# Slide 1\n<!-- slide -->\n<!-- slide -->\n# Slide 2";
		const result = splitSlides(input);
		assert.equal(result.length, 2);
		assert.match(result[1], /Slide 2/);
	});

	it("is case-insensitive on the delimiter", () => {
		const input = "<!-- SLIDE -->\nSlide A\n<!-- SLIDE -->";
		const result = splitSlides(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /Slide A/);
	});

	it("ignores delimiter inside fenced code block", () => {
		const input = "<!-- slide -->\n# Slide 1\n```js\n<!-- slide -->\n```\n<!-- slide -->\n<!-- slide -->\n# Slide 2\n<!-- slide -->";
		const result = splitSlides(input);
		assert.equal(result.length, 2);
		assert.match(result[0], /Slide 1/);
		assert.match(result[1], /Slide 2/);
	});

	it("ignores delimiter inside ::: mermaid block", () => {
		const input = "<!-- slide -->\n# Slide 1\n::: mermaid\ngraph TD\n  A-->B\n:::\n<!-- slide -->";
		const result = splitSlides(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /Slide 1/);
		assert.match(result[0], /graph TD/);
	});

	it("skips empty slides (open immediately followed by close)", () => {
		const input = "<!-- slide -->\n<!-- slide -->\n<!-- slide -->\n# Real slide\n<!-- slide -->";
		const result = splitSlides(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /Real slide/);
	});

	it("returns empty array when no delimiter present", () => {
		const input = "# Just a heading\nSome text.";
		const result = splitSlides(input);
		assert.equal(result.length, 0);
	});

	it("returns empty array for empty input", () => {
		assert.deepEqual(splitSlides(""), []);
	});

	it("skips YAML front matter at start of file", () => {
		const input = "---\ntitle: My Notes\ndate: 2024-01-01\n---\n# Preamble\n<!-- slide -->\n# Slide 1\n<!-- slide -->";
		const result = splitSlides(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /Slide 1/);
		assert.doesNotMatch(result[0], /title:/);
		assert.doesNotMatch(result[0], /Preamble/);
	});

	it("does not treat --- as a slide delimiter", () => {
		const input = "<!-- slide -->\n# Slide 1\n---\nMore content\n<!-- slide -->";
		const result = splitSlides(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /Slide 1/);
		assert.match(result[0], /More content/);
	});

});

describe("hasSlideDelimiter", () => {

	it("detects <!-- slide --> in a document", () => {
		assert.equal(hasSlideDelimiter("# Title\n<!-- slide -->\n## Slide 2"), true);
	});

	it("returns false when no delimiter present", () => {
		assert.equal(hasSlideDelimiter("# Title\n---\nsome text"), false);
	});

	it("returns false for empty input", () => {
		assert.equal(hasSlideDelimiter(""), false);
	});

	it("is case-insensitive", () => {
		assert.equal(hasSlideDelimiter("content\n<!-- SLIDE -->\nmore"), true);
	});

	it("requires delimiter to be on its own line", () => {
		// inline comment should not trigger slide mode
		assert.equal(hasSlideDelimiter("some <!-- slide --> inline text"), false);
	});

});

describe("getSlides", () => {

	it("classic mode: returns one slide per mermaid block when no delimiter", () => {
		const input = "# Heading\n```mermaid\ngraph TD\n  A-->B\n```\ntext\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n```";
		const result = getSlides(input);
		assert.equal(result.length, 2);
		// Each slide should be a mermaid-fence-wrapped string
		assert.match(result[0], /^```mermaid/);
		assert.match(result[0], /graph TD/);
		assert.match(result[1], /sequenceDiagram/);
	});

	it("classic mode: returns empty array for file with no mermaid and no delimiter", () => {
		assert.deepEqual(getSlides("# Just markdown, no diagrams"), []);
	});

	it("slide mode: extracts paired slides", () => {
		const input = "# Preamble\n<!-- slide -->\n# Slide 1\n```mermaid\ngraph TD\n  A-->B\n```\n<!-- slide -->\nGap\n<!-- slide -->\n# Slide 2\nParagraph\n<!-- slide -->";
		const result = getSlides(input);
		assert.equal(result.length, 2);
		assert.match(result[0], /Slide 1/);
		assert.match(result[1], /Slide 2/);
	});

	it("slide mode: discards content outside pairs", () => {
		const input = "<!-- slide -->\n# Title\nSome text.\n<!-- slide -->\nIgnored gap.\n<!-- slide -->\n## Second\nMore text.\n<!-- slide -->";
		const result = getSlides(input);
		assert.equal(result.length, 2);
		assert.match(result[0], /Some text/);
		assert.match(result[1], /More text/);
		assert.doesNotMatch(result[0], /Ignored gap/);
	});

	it("slide mode: preserves mermaid-only slides", () => {
		const input = "<!-- slide -->\n# Intro\n<!-- slide -->\n<!-- slide -->\n```mermaid\ngraph TD\n  A-->B\n```\n<!-- slide -->";
		const result = getSlides(input);
		assert.equal(result.length, 2);
		assert.match(result[1], /graph TD/);
	});

	it("slide mode: implicitly closes unclosed slide at EOF", () => {
		const input = "# Preamble\n<!-- slide -->\n# Actual slide";
		const result = getSlides(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /Actual slide/);
		assert.doesNotMatch(result[0], /Preamble/);
	});

});

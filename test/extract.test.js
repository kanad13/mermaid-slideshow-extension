const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { installVscodeFake } = require("./helpers/vscode-fake");

installVscodeFake();
const { extractMermaidBlocks } = require("../src/extension");

describe("extractMermaidBlocks", () => {
	it("extracts a single backtick-fenced mermaid block", () => {
		const input = "# Title\n\n```mermaid\ngraph TD\n  A --> B\n```\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 1);
		assert.equal(result[0], "graph TD\n  A --> B");
	});

	it("extracts multiple backtick-fenced blocks", () => {
		const input =
			"```mermaid\ngraph TD\n  A --> B\n```\n\nSome text\n\n```mermaid\nsequenceDiagram\n  Alice->>Bob: Hi\n```\n";
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

	it("keeps slides in document order when syntaxes are mixed", () => {
		const input =
			"::: mermaid\ngraph LR\n  first --> a\n:::\n\n```mermaid\ngraph TD\n  second --> b\n```\n\n::: mermaid\ngraph LR\n  third --> c\n:::\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 3);
		assert.match(result[0], /first/);
		assert.match(result[1], /second/);
		assert.match(result[2], /third/);
	});

	it("handles CRLF line endings", () => {
		const input = "```mermaid\r\ngraph TD\r\n  A --> B\r\n```\r\n";
		const result = extractMermaidBlocks(input);
		assert.equal(result.length, 1);
		assert.match(result[0], /^graph TD/);
	});

	it("does not treat a mermaid-prefixed language name as mermaid", () => {
		assert.deepEqual(extractMermaidBlocks("```mermaidjs\ngraph TD\n```\n"), []);
	});
});

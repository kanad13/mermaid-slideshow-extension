const { describe, it, before, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { installVscodeFake, loadExtension } = require("./helpers/vscode-fake");

const ENTRY = path.resolve(__dirname, "../src/extension.js");

describe("webview content", () => {
	let fake;
	let ext;
	before(() => {
		fake = installVscodeFake();
		ext = loadExtension(ENTRY);
	});
	after(() => fake.uninstall());

	/** Extracts the diagram array the page script receives. */
	function embeddedDiagrams(html) {
		const match = html.match(/const diagrams = (\[.*\]);/);
		assert.ok(match, "diagram literal present");
		return JSON.parse(match[1]);
	}

	it("generates 32 hex characters and a new value on each call", () => {
		const a = ext.getNonce();
		const b = ext.getNonce();
		assert.match(a, /^[0-9a-f]{32}$/);
		assert.notEqual(a, b);
	});

	it("draws the nonce from the operating system random source", () => {
		const crypto = require("node:crypto");
		const spy = mock.method(crypto, "randomBytes", () => Buffer.alloc(16, 0xab));
		try {
			assert.equal(ext.getNonce(), "ab".repeat(16));
			assert.equal(spy.mock.calls[0].arguments[0], 16);
		} finally {
			spy.mock.restore();
		}
	});

	it("puts the nonce in the policy-governed script tag and the policy", () => {
		const html = ext.getWebviewContent(["graph TD\n A-->B"], "abc123", "dark");
		assert.match(html, /script-src 'nonce-abc123' https:\/\/cdn\.jsdelivr\.net;/);
		assert.match(html, /<script type="module" nonce="abc123">/);
		assert.match(html, /default-src 'none'/);
		assert.doesNotMatch(html, /unsafe-eval/);
	});

	it("loads Mermaid from an exact pinned version", () => {
		const html = ext.getWebviewContent(["graph TD\n A-->B"], "n", "default");
		assert.match(ext.MERMAID_VERSION, /^\d+\.\d+\.\d+$/);
		assert.ok(html.includes(`mermaid@${ext.MERMAID_VERSION}/dist/mermaid.esm.min.mjs`));
	});

	it("does not set a Mermaid security level, leaving the strict default", () => {
		const html = ext.getWebviewContent(["graph TD\n A-->B"], "n", "default");
		assert.doesNotMatch(html, /securityLevel/);
	});

	it("keeps a closing script tag in diagram text from ending the script", () => {
		const hostile = 'graph TD\n  A["</script><img src=x onerror=alert(1)>"] --> B';
		const html = ext.getWebviewContent([hostile], "n", "default");
		assert.equal(html.match(/<\/script>/g).length, 1, "only the template's own closing tag");
		assert.doesNotMatch(html, /<img/);
		assert.deepEqual(embeddedDiagrams(html), [hostile]);
	});

	it("escapes line separators that JSON allows but older script parsers reject", () => {
		const html = ext.getWebviewContent(["a\u2028b\u2029c"], "n", "default");
		assert.ok(!html.includes("\u2028") && !html.includes("\u2029"));
		assert.deepEqual(embeddedDiagrams(html), ["a\u2028b\u2029c"]);
	});

	it("inserts replacement-pattern text literally", () => {
		const text = 'graph TD\n  A["$& $1 $` $\'"] --> B';
		const html = ext.getWebviewContent([text], "n", "default");
		assert.deepEqual(embeddedDiagrams(html), [text]);
	});

	it("does not expand template placeholders that appear inside diagram text", () => {
		const text = 'graph TD\n  A["{{NONCE}} {{THEME}} {{SINGLE_SLIDE_CLASS}} {{MERMAID_URL}}"] --> B';
		const html = ext.getWebviewContent([text], "secret-nonce", "dark");
		assert.deepEqual(embeddedDiagrams(html), [text]);
		assert.doesNotMatch(embeddedDiagrams(html)[0], /secret-nonce/);
	});

	it("leaves no unresolved placeholder in the page", () => {
		const html = ext.getWebviewContent(["graph TD\n A-->B", "graph LR\n C-->D"], "n", "forest");
		assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
		assert.match(html, /const theme = 'forest';/);
	});

	it("marks a single diagram so navigation is hidden", () => {
		assert.match(ext.getWebviewContent(["graph TD\n A-->B"], "n", "default"), /<body class="single-slide">/);
		assert.match(ext.getWebviewContent(["a", "b"], "n", "default"), /<body class="">/);
	});

	it("renders the empty state through the same page so live updates can arrive", () => {
		const html = ext.getWebviewContent([], "n", "default");
		assert.deepEqual(embeddedDiagrams(html), []);
		assert.match(html, /addEventListener\('message'/);
	});

	it("replaces an unknown theme name with the default", () => {
		const html = ext.getWebviewContent(["a"], "n", "x';alert(1);//");
		assert.match(html, /const theme = 'default';/);
	});
});

describe("resolveTheme", () => {
	let fake;
	let ext;
	before(() => {
		fake = installVscodeFake();
		ext = loadExtension(ENTRY);
	});
	after(() => fake.uninstall());

	it("follows the editor theme kind when the setting is default", () => {
		fake.config.theme = "default";
		fake.colorThemeKind = 1;
		assert.equal(ext.resolveTheme(), "default");
		fake.colorThemeKind = 2;
		assert.equal(ext.resolveTheme(), "dark");
		fake.colorThemeKind = 3;
		assert.equal(ext.resolveTheme(), "dark");
	});

	it("returns an explicit choice regardless of the editor theme", () => {
		fake.colorThemeKind = 2;
		for (const theme of ["forest", "neutral", "dark"]) {
			fake.config.theme = theme;
			assert.equal(ext.resolveTheme(), theme);
		}
	});

	it("falls back to automatic detection for a value outside the allowlist", () => {
		fake.colorThemeKind = 1;
		fake.config.theme = "x');alert(1);//";
		assert.equal(ext.resolveTheme(), "default");
	});
});

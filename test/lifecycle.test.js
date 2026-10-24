/** Tests for the panel lifecycle with a fake editor and controlled timers. */

const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { installVscodeFake, loadExtension, activateExtension, createDocument } = require("./helpers/vscode-fake");

const ENTRY = path.resolve(__dirname, "../src/extension.js");
const COMMAND = "mermaidSlideshow.showPreview";
const ONE = "```mermaid\ngraph TD\n  A --> B\n```\n";
const TWO = ONE + "\n```mermaid\ngraph LR\n  C --> D\n```\n";

describe("extension lifecycle", () => {
	let fake;
	let activation;

	beforeEach(() => {
		mock.timers.enable({ apis: ["setTimeout"] });
		fake = installVscodeFake();
		activation = activateExtension(loadExtension(ENTRY));
	});

	afterEach(() => {
		activation.dispose();
		fake.uninstall();
		mock.timers.reset();
	});

	/** Opens the slideshow for a document and returns the panel. */
	function open(doc) {
		fake.setEditor(doc);
		fake.runCommand(COMMAND);
		return fake.panels[fake.panels.length - 1];
	}

	describe("command", () => {
		it("registers the show-preview command", () => {
			assert.ok(fake.commands.has(COMMAND));
		});

		it("reports an error when no editor is active", () => {
			fake.setEditor(undefined);
			fake.runCommand(COMMAND);
			assert.deepEqual(fake.errors, ["No active editor"]);
			assert.equal(fake.panels.length, 0);
		});

		it("reports an error for a non-markdown document", () => {
			fake.setEditor(createDocument(ONE, "file:///a.txt", "plaintext"));
			fake.runCommand(COMMAND);
			assert.deepEqual(fake.errors, ["Not a Markdown file"]);
			assert.equal(fake.panels.length, 0);
		});

		it("opens one panel beside the editor with scripts on and no local resource access", () => {
			const panel = open(createDocument(ONE));
			assert.equal(fake.panels.length, 1);
			assert.equal(panel.options.enableScripts, true);
			assert.deepEqual(panel.options.localResourceRoots, []);
			assert.match(panel.webview.html, /const diagrams = \["graph TD/);
		});

		it("reuses the panel and swaps content when another file is opened", () => {
			const first = createDocument(ONE, "file:///one.md");
			const second = createDocument("```mermaid\ngraph LR\n  X --> Y\n```\n", "file:///two.md");
			const panel = open(first);
			open(second);
			assert.equal(fake.panels.length, 1);
			assert.equal(panel.revealed.length, 1);
			const shown = JSON.parse(panel.webview.html.match(/const diagrams = (\[.*\]);/)[1]);
			assert.deepEqual(shown, ["graph LR\n  X --> Y"]);
		});

		it("creates a new panel after the previous one is closed", () => {
			const doc = createDocument(ONE);
			const panel = open(doc);
			panel.dispose();
			open(doc);
			assert.equal(fake.panels.length, 2);
		});
	});

	describe("live updates", () => {
		it("posts the current diagrams after the 300 ms debounce", () => {
			const doc = createDocument(ONE);
			const panel = open(doc);
			doc.text = TWO;
			fake.fireDocumentChange(doc);
			mock.timers.tick(299);
			assert.equal(panel.messages.length, 0);
			mock.timers.tick(1);
			assert.equal(panel.messages.length, 1);
			assert.equal(panel.messages[0].type, "update");
			assert.equal(panel.messages[0].diagrams.length, 2);
		});

		it("coalesces a burst of edits into one message with the latest text", () => {
			const doc = createDocument(ONE);
			const panel = open(doc);
			for (let i = 0; i < 5; i++) {
				doc.text = ONE + "\n".repeat(i);
				fake.fireDocumentChange(doc);
				mock.timers.tick(100);
			}
			doc.text = TWO;
			fake.fireDocumentChange(doc);
			mock.timers.tick(300);
			assert.equal(panel.messages.length, 1);
			assert.equal(panel.messages[0].diagrams.length, 2);
		});

		it("ignores edits to a document that is not being shown", () => {
			const panel = open(createDocument(ONE, "file:///shown.md"));
			fake.fireDocumentChange(createDocument(TWO, "file:///other.md"));
			mock.timers.tick(1000);
			assert.equal(panel.messages.length, 0);
		});

		it("cancels a pending update when the panel closes", () => {
			const doc = createDocument(ONE);
			const panel = open(doc);
			fake.fireDocumentChange(doc);
			panel.dispose();
			assert.doesNotThrow(() => mock.timers.tick(1000));
			assert.equal(panel.messages.length, 0);
		});

		it("drops a pending update when the panel switches to another file", () => {
			const first = createDocument(ONE, "file:///one.md");
			const panel = open(first);
			first.text = TWO;
			fake.fireDocumentChange(first);
			open(createDocument(ONE, "file:///two.md"));
			mock.timers.tick(1000);
			assert.equal(panel.messages.length, 0);
		});

		it("sends an empty list when the last diagram is removed", () => {
			const doc = createDocument(ONE);
			const panel = open(doc);
			doc.text = "# no diagrams\n";
			fake.fireDocumentChange(doc);
			mock.timers.tick(300);
			assert.deepEqual(panel.messages[0].diagrams, []);
		});

		it("does nothing when no panel is open", () => {
			const doc = createDocument(ONE);
			assert.doesNotThrow(() => {
				fake.fireDocumentChange(doc);
				mock.timers.tick(1000);
			});
		});
	});

	describe("re-render triggers", () => {
		it("re-renders with the new theme when the setting changes", () => {
			const panel = open(createDocument(ONE));
			fake.config.theme = "forest";
			fake.fireConfigChange();
			assert.match(panel.webview.html, /const theme = 'forest';/);
		});

		it("ignores changes to other settings", () => {
			const panel = open(createDocument(ONE));
			const before = panel.webview.html;
			fake.config.theme = "forest";
			fake.fireConfigChange("editor.fontSize");
			assert.equal(panel.webview.html, before);
		});

		it("re-renders when the editor color theme changes", () => {
			const panel = open(createDocument(ONE));
			assert.match(panel.webview.html, /const theme = 'default';/);
			fake.colorThemeKind = 2;
			fake.fireColorThemeChange();
			assert.match(panel.webview.html, /const theme = 'dark';/);
		});

		it("issues a fresh nonce for each render", () => {
			const panel = open(createDocument(ONE));
			const nonce = (html) => html.match(/nonce="([0-9a-f]+)"/)[1];
			const first = nonce(panel.webview.html);
			fake.fireColorThemeChange();
			assert.notEqual(nonce(panel.webview.html), first);
		});

		it("does nothing when no panel is open", () => {
			assert.doesNotThrow(() => {
				fake.fireConfigChange();
				fake.fireColorThemeChange();
			});
		});
	});

	describe("disposal", () => {
		it("leaves no event listener behind after the subscriptions are disposed", () => {
			activation.dispose();
			const { docChange, configChange, colorChange } = fake.emitters;
			assert.equal(docChange.count(), 0);
			assert.equal(configChange.count(), 0);
			assert.equal(colorChange.count(), 0);
			assert.equal(fake.commands.size, 0);
		});

		it("cancels a pending update when the extension deactivates", () => {
			const doc = createDocument(ONE);
			const panel = open(doc);
			fake.fireDocumentChange(doc);
			activation.dispose();
			mock.timers.tick(1000);
			assert.equal(panel.messages.length, 0);
		});
	});
});

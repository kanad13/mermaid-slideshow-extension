/** Tests the built .vsix: file list and activation of the unpacked entry point. */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { installVscodeFake, loadExtension, activateExtension, createDocument } = require("./helpers/vscode-fake");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const vsce = path.join(root, "node_modules/@vscode/vsce/vsce");

/** Files the marketplace package may contain; anything else is a development file leaking out. */
const ALLOWED = [
	/^extension\/package\.json$/,
	/^extension\/readme\.md$/i,
	/^extension\/LICENSE(\.txt)?$/,
	/^extension\/changelog\.md$/i,
	/^extension\/assets\/icon\.png$/,
	/^extension\/src\/extension\.js$/,
	/^extension\/src\/webview\.html$/,
	/^extension\.vsixmanifest$/,
	/^\[Content_Types\]\.xml$/
];

describe("packaged extension", () => {
	let dir;
	let files;

	before(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "mermaid-slideshow-pack-"));
		const vsix = path.join(dir, "out.vsix");
		execFileSync(process.execPath, [vsce, "package", "--out", vsix], { cwd: root, stdio: "pipe" });
		execFileSync("unzip", ["-q", vsix, "-d", path.join(dir, "unzipped")]);
		files = execFileSync("unzip", ["-Z1", vsix], { encoding: "utf8" }).split("\n").filter(Boolean);
	});

	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	it("contains only the documented runtime files", () => {
		const unexpected = files.filter((f) => !ALLOWED.some((re) => re.test(f)));
		assert.deepEqual(unexpected, []);
	});

	it("contains the entry point and the webview template", () => {
		assert.ok(files.includes("extension/src/extension.js"));
		assert.ok(files.includes("extension/src/webview.html"));
	});

	it("activates and renders from the unpacked package, not the source tree", () => {
		const entry = path.join(dir, "unzipped/extension", pkg.main);
		const fake = installVscodeFake();
		try {
			const activation = activateExtension(loadExtension(entry));
			const doc = createDocument("```mermaid\ngraph TD\n  A --> B\n```\n");
			fake.setEditor(doc);
			fake.runCommand("mermaidSlideshow.showPreview");
			assert.equal(fake.panels.length, 1);
			assert.match(fake.panels[0].webview.html, /mermaid@\d+\.\d+\.\d+\/dist/);
			activation.dispose();
		} finally {
			fake.uninstall();
		}
	});
});

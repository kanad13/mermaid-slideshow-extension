/** Tests that keep package metadata, CI, and source constants consistent. */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

describe("manifest and release metadata", () => {
	it("keeps the editor floor and the @types/vscode pin on the same version", () => {
		const floor = pkg.engines.vscode.replace(/^\^/, "");
		assert.match(floor, /^\d+\.\d+\.\d+$/);
		assert.equal(pkg.devDependencies["@types/vscode"], floor);
	});

	it("uses the same version in the manifest, the lockfile and the newest changelog entry", () => {
		assert.equal(lock.version, pkg.version);
		assert.equal(lock.packages[""].version, pkg.version);
		const newest = read("CHANGELOG.md").match(/^## \[(\d+\.\d+\.\d+)\]/m);
		assert.equal(newest[1], pkg.version);
	});

	it("declares the minimum Node version the toolchain needs", () => {
		assert.match(pkg.engines.node, /^>=22\.\d+\.\d+$/);
		const nodeVersion = pkg.engines.node.replace(">=", "");
		assert.equal(read(".nvmrc").trim(), nodeVersion, "CI reads .nvmrc, which names the lowest supported Node");
	});

	it("declares support for untrusted workspaces because no setting or file can run code", () => {
		assert.deepEqual(pkg.capabilities.untrustedWorkspaces, { supported: true });
	});

	it("has no runtime dependencies", () => {
		assert.equal(pkg.dependencies, undefined);
	});

	it("lists every dev dependency with a caret range, except the exact @types/vscode pin", () => {
		for (const [name, range] of Object.entries(pkg.devDependencies)) {
			if (name === "@types/vscode") {
				assert.match(range, /^\d+\.\d+\.\d+$/, name);
			} else {
				assert.match(range, /^\^\d+\.\d+\.\d+$/, name);
			}
		}
	});

	it("registers the commands and settings the manifest contributes", () => {
		const source = read("src/extension.js");
		for (const command of pkg.contributes.commands) {
			assert.ok(source.includes(`"${command.command}"`), command.command);
		}
		const themeSetting = pkg.contributes.configuration.properties["mermaidSlideshow.theme"];
		const mermaidThemes = source.match(/const MERMAID_THEMES = (\[.*?\]);/)[1];
		assert.deepEqual(JSON.parse(mermaidThemes), themeSetting.enum);
	});

	it("ships a square icon between 256 px (high-density minimum) and 1024 px (Marketplace maximum)", () => {
		const png = fs.readFileSync(path.join(root, pkg.icon));
		assert.equal(png.subarray(1, 4).toString(), "PNG");
		const width = png.readUInt32BE(16);
		const height = png.readUInt32BE(20);
		assert.equal(width, height);
		assert.ok(width >= 256, `icon is ${width}px`);
		assert.ok(width <= 1024, `icon is ${width}px, above the Marketplace maximum`);
	});

	it("loads Mermaid with an exact x.y.z version from a single constant", () => {
		const source = read("src/extension.js");
		assert.match(source, /const MERMAID_VERSION = "\d+\.\d+\.\d+";/);
		assert.doesNotMatch(read("src/webview.html"), /mermaid@/);
	});
});

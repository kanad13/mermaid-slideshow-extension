/** Tests that documentation links resolve and every guide is reachable. */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const docs = fs.readdirSync(path.join(root, "docs")).filter((f) => f.endsWith(".md"));
const markdownFiles = ["readme.md", "CHANGELOG.md", "AGENTS.md", ...docs.map((f) => `docs/${f}`)];

/** Returns relative link targets (anchors removed) found in a markdown file. */
function relativeLinks(file) {
	const text = fs.readFileSync(path.join(root, file), "utf8");
	const targets = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
	return targets.filter((t) => !/^[a-z]+:/i.test(t) && !t.startsWith("#")).map((t) => t.split("#")[0]);
}

describe("documentation links", () => {
	for (const file of markdownFiles) {
		it(`resolves every relative link in ${file}`, () => {
			for (const target of relativeLinks(file)) {
				// README images use root-relative paths that vsce rewrites to the repository.
				const base = target.startsWith("/") ? root : path.dirname(path.join(root, file));
				const resolved = path.join(base, target.startsWith("/") ? target.slice(1) : target);
				assert.ok(fs.existsSync(resolved), `${file} links to missing ${target}`);
			}
		});
	}

	it("links every guide from the README and from AGENTS.md", () => {
		for (const guide of docs) {
			assert.ok(relativeLinks("readme.md").includes(`docs/${guide}`), `readme.md misses ${guide}`);
			assert.ok(relativeLinks("AGENTS.md").includes(`docs/${guide}`), `AGENTS.md misses ${guide}`);
		}
	});

	it("links the guides to each other where they depend on one another", () => {
		assert.ok(relativeLinks("docs/architecture.md").includes("dependencies.md"));
		assert.ok(relativeLinks("docs/development.md").includes("dependencies.md"));
		assert.ok(relativeLinks("docs/dependencies.md").includes("testing.md"));
		assert.ok(relativeLinks("docs/testing.md").includes("decisions.md"));
	});
});

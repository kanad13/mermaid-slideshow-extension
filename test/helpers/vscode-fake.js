const Module = require("node:module");

/**
 * Minimal in-memory stand-in for the `vscode` module.
 *
 * One shared fake keeps every suite and the browser harness on the same
 * contract: it records what the extension asks VS Code to do and exposes
 * hooks (fire*, setEditor) to drive the events VS Code would raise.
 */

/**
 * Creates an event emitter that mirrors the `vscode.Event` call shape.
 *
 * @returns {{event: Function, fire: Function, count: Function}} Emitter parts
 */
function createEmitter() {
	const listeners = new Set();
	return {
		event: (listener) => {
			listeners.add(listener);
			return { dispose: () => listeners.delete(listener) };
		},
		fire: (arg) => [...listeners].forEach((listener) => listener(arg)),
		count: () => listeners.size
	};
}

/**
 * Builds a fake text document.
 *
 * @param {string} text - Initial document text
 * @param {string} [uri] - Document URI string
 * @param {string} [languageId] - VS Code language id
 * @returns {object} Document with getText/setText helpers
 */
function createDocument(text, uri = "file:///notes.md", languageId = "markdown") {
	const doc = {
		languageId,
		uri: { toString: () => uri },
		getText: () => doc.text,
		text
	};
	return doc;
}

/**
 * Creates a fresh fake and registers it as the `vscode` module.
 *
 * @returns {object} The fake: state, recorders and event triggers
 */
function installVscodeFake() {
	const fake = {
		commands: new Map(),
		panels: [],
		errors: [],
		config: { theme: "default" },
		colorThemeKind: 1,
		activeTextEditor: undefined
	};

	const docChange = createEmitter();
	const configChange = createEmitter();
	const colorChange = createEmitter();
	fake.emitters = { docChange, configChange, colorChange };

	fake.setEditor = (doc) => {
		fake.activeTextEditor = doc ? { document: doc } : undefined;
	};
	fake.fireDocumentChange = (document) => docChange.fire({ document });
	fake.fireConfigChange = (key = "mermaidSlideshow.theme") =>
		configChange.fire({ affectsConfiguration: (k) => k === key });
	fake.fireColorThemeChange = () => colorChange.fire({});
	fake.runCommand = (id) => fake.commands.get(id)();

	const exports = {
		workspace: {
			getConfiguration: () => ({ get: (key, fallback) => (key in fake.config ? fake.config[key] : fallback) }),
			onDidChangeTextDocument: docChange.event,
			onDidChangeConfiguration: configChange.event
		},
		window: {
			get activeTextEditor() {
				return fake.activeTextEditor;
			},
			get activeColorTheme() {
				return { kind: fake.colorThemeKind };
			},
			onDidChangeActiveColorTheme: colorChange.event,
			showErrorMessage: (message) => {
				fake.errors.push(message);
			},
			createWebviewPanel: (viewType, title, column, options) => {
				const disposeEmitter = createEmitter();
				const panel = {
					viewType,
					title,
					column,
					options,
					disposed: false,
					revealed: [],
					messages: [],
					webview: {
						html: "",
						postMessage: (message) => {
							if (panel.disposed) throw new Error("Webview is disposed");
							panel.messages.push(message);
							return Promise.resolve(true);
						}
					},
					reveal: (col) => panel.revealed.push(col),
					onDidDispose: (listener, thisArg, disposables) => {
						const d = disposeEmitter.event(listener);
						if (disposables) disposables.push(d);
						return d;
					},
					dispose: () => {
						panel.disposed = true;
						disposeEmitter.fire();
					}
				};
				fake.panels.push(panel);
				return panel;
			}
		},
		commands: {
			registerCommand: (id, handler) => {
				fake.commands.set(id, handler);
				return { dispose: () => fake.commands.delete(id) };
			}
		},
		ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
		ViewColumn: { Beside: -2 }
	};

	const originalResolve = Module._resolveFilename;
	Module._resolveFilename = function (request, ...args) {
		if (request === "vscode") return "vscode";
		return originalResolve.call(this, request, ...args);
	};
	require.cache["vscode"] = { id: "vscode", filename: "vscode", loaded: true, exports };

	fake.uninstall = () => {
		Module._resolveFilename = originalResolve;
		delete require.cache["vscode"];
	};
	return fake;
}

/**
 * Loads an extension entry file with a clean module cache.
 *
 * @param {string} entryPath - Absolute path to extension.js
 * @returns {object} The module's exports
 */
function loadExtension(entryPath) {
	delete require.cache[require.resolve(entryPath)];
	return require(entryPath);
}

/**
 * Activates an extension module against a fresh context.
 *
 * @param {object} extension - Module exports containing activate()
 * @returns {{context: {subscriptions: Array}, dispose: Function}} Activation context
 */
function activateExtension(extension) {
	const context = { subscriptions: [] };
	extension.activate(context);
	return {
		context,
		dispose: () => context.subscriptions.forEach((s) => s && s.dispose && s.dispose())
	};
}

module.exports = { installVscodeFake, loadExtension, activateExtension, createDocument };

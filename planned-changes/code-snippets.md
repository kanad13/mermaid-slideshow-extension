# Code Snippets

Use `planned-changes/plan.md` for sequencing. This file groups snippets by target file / concern so related code stays together even if the headings are not in exact phase order.

---

## Functions for `src/extension.js`

These go after `extractMermaidBlocks()` (~line 40 in extension.js).

### `hasSlideDelimiter`

```javascript
/**
 * Detects whether a markdown document contains slide delimiters.
 *
 * A slide delimiter is a line containing only <!-- slide --> (case-insensitive,
 * optional surrounding whitespace). This is the opt-in signal for slide mode;
 * files without it use the classic mermaid-only path.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {boolean} True if at least one slide delimiter is present
 */
function hasSlideDelimiter(rawText) {
	return /^<!--\s*slide\s*-->\s*$/im.test(rawText);
}
```

### `splitSlides`

```javascript
/**
 * Splits a markdown document into logical slides.
 *
 * Splits on lines containing only <!-- slide --> (case-insensitive,
 * optional surrounding whitespace). Delimiters inside fenced code blocks
 * (``` or ::: mermaid) are ignored. Empty slides are skipped.
 *
 * A leading YAML front matter block (line 0 = "---", closed by "---" or "...")
 * is detected and excluded from slide content.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {string[]} Array of per-slide markdown strings
 */
function splitSlides(rawText) {
	if (!rawText) {
		return [];
	}

	const DELIMITER = /^<!--\s*slide\s*-->\s*$/i;
	const lines = rawText.split(/\r?\n/);
	let startLine = 0;

	// Skip YAML front matter if present (file starts with ---)
	if (/^---\s*$/.test(lines[0])) {
		for (let j = 1; j < lines.length; j++) {
			if (/^---\s*$/.test(lines[j]) || /^\.\.\.\s*$/.test(lines[j])) {
				startLine = j + 1;
				break;
			}
		}
	}

	const slides = [];
	let current = [];
	let insideFence = false;
	let insideColonMermaid = false;

	for (let i = startLine; i < lines.length; i++) {
		const line = lines[i];

		// Track triple-backtick code fences (any language)
		if (/^```/.test(line)) {
			insideFence = !insideFence;
			current.push(line);
			continue;
		}

		// Track Azure DevOps style mermaid fences ::: mermaid ... :::
		if (!insideFence && /^:::\s*mermaid/.test(line)) {
			insideColonMermaid = true;
			current.push(line);
			continue;
		}
		if (insideColonMermaid && /^:::\s*$/.test(line)) {
			insideColonMermaid = false;
			current.push(line);
			continue;
		}

		// Slide delimiters are only recognized outside of fenced blocks
		if (!insideFence && !insideColonMermaid && DELIMITER.test(line)) {
			const slideText = current.join("\n").trim();
			if (slideText) {
				slides.push(slideText);
			}
			current = [];
		} else {
			current.push(line);
		}
	}

	const last = current.join("\n").trim();
	if (last) {
		slides.push(last);
	}

	return slides;
}
```

### `getSlides`

```javascript
/**
 * Returns slides for a document, auto-detecting the appropriate mode.
 *
 * Slide mode (<!-- slide --> delimiter present): splits by delimiter,
 * each slide is raw markdown that may contain text and Mermaid blocks.
 *
 * Classic mode (no delimiter): extracts only Mermaid diagram blocks,
 * one per slide, identical to pre-slide-mode behaviour. Each block is
 * wrapped in a mermaid fence so the webview's unified renderer handles
 * both modes with the same code path.
 *
 * @param {string} rawText - Raw markdown file content
 * @returns {string[]} Array of slide strings (markdown)
 */
function getSlides(rawText) {
	if (hasSlideDelimiter(rawText)) {
		return splitSlides(rawText);
	}
	return extractMermaidBlocks(rawText).map(function (d) {
		return "```mermaid\n" + d + "\n```";
	});
}
```

---

## CSS additions for `src/webview.html`

These replace the old `.slide-content .mermaid` selector block and extend `.slide-content`.

### Change to `.slide-container`

```css
.slide-container {
    display: flex;
    align-items: flex-start;   /* was: center */
    justify-content: center;
    height: 100vh;
    padding: 40px 60px;
    position: relative;
}
```

### Change to `.slide-content`

```css
/* .slide-content remains the vertical scroll container for tall slides */
.slide-content {
    width: 100%;
    max-height: calc(100vh - 120px);
    display: flex;
    align-items: flex-start;   /* was: center — NOT stretch: stretch fixes child height to container height, preventing tall-slide scrolling */
    justify-content: center;
    overflow: auto;
}
```

### Remove from `body`

```css
/* REMOVE this line: */
user-select: none;
```

### Replace `.slide-content .mermaid` and `.slide-content .mermaid svg` with:

```css
.slide-inner {
    width: 100%;
    max-width: 960px;
    padding: 24px 32px;
    background: var(--vscode-editor-background);
    border-radius: 8px;
    box-shadow: 0 0 0 1px var(--vscode-widget-border, rgba(128,128,128,0.35));
    overflow: visible;   /* PR had overflow: hidden which clips tall slides — fixed */
}

.slide-inner h1,
.slide-inner h2,
.slide-inner h3,
.slide-inner h4,
.slide-inner h5,
.slide-inner h6 {
    margin: 0 0 0.4em 0;
}

.slide-inner p {
    margin: 0 0 0.6em 0;
}

.slide-inner ul,
.slide-inner ol {
    margin-left: 1.3em;
    margin-bottom: 0.7em;
}

.slide-inner pre {
    margin: 0.6em 0;
    background-color: var(--vscode-textCodeBlock-background);
    border-radius: 4px;
    padding: 10px 12px;
    overflow-x: auto;
}

.slide-inner code {
    background-color: var(--vscode-textCodeBlock-background);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9em;
}

.slide-inner pre code {
    background: transparent;
    padding: 0;
}

/* <hr> now supported since --- is no longer the slide separator */
.slide-inner hr {
    border: none;
    border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35));
    margin: 0.8em 0;
}

.slide-inner .mermaid {
    background: transparent;
    border: none;
    text-align: center;
    width: 100%;
    margin: 0.6em 0;
}

.slide-inner .mermaid svg {
    max-width: 100%;
    max-height: calc(100vh - 180px);   /* PR increased from 140px to 180px — keep */
    height: auto;
}
```

---

## JavaScript functions for `src/webview.html`

Add these inside the `<script type="module">` block, before `renderSlide`.

### `escapeHtml`

```javascript
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
```

### `renderInline`

```javascript
function renderInline(text) {
    let out = escapeHtml(text);
    // Inline code
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold (** or __)
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // Italic (* or _)
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');
    return out;
}
```

### `renderMarkdownToHtml`


```javascript
function renderMarkdownToHtml(markdown) {
    const lines = markdown.split(/\r?\n/);
    let html = '';
    let inMermaid = false;
    let inCode = false;
    let inMermaidColon = false;
    let inList = false;
    let listType = '';

    function closeList() {
        if (inList) {
            html += listType === 'ol' ? '</ol>' : '</ul>';
            inList = false;
            listType = '';
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // ── Mermaid backtick fences — NOT HTML-escaped (Mermaid reads raw textContent)
        if (!inCode && !inMermaid && /^```mermaid\s*$/.test(line)) {
            closeList();
            inMermaid = true;
            html += '<pre class="mermaid">';
            continue;
        }
        if (inMermaid && /^```\s*$/.test(line)) {
            inMermaid = false;
            html += '</pre>';
            continue;
        }
        if (inMermaid) {
            html += line + '\n';   // raw — no escapeHtml here
            continue;
        }

        // ── Generic fenced code — IS HTML-escaped (display as text)
        if (!inCode && /^```/.test(line)) {
            closeList();
            inCode = true;
            html += '<pre><code>';
            continue;
        }
        if (inCode && /^```\s*$/.test(line)) {
            inCode = false;
            html += '</code></pre>';
            continue;
        }
        if (inCode) {
            html += escapeHtml(line) + '\n';
            continue;
        }

        // ── Azure DevOps ::: mermaid — NOT HTML-escaped
        if (!inMermaidColon && /^:::\s*mermaid/.test(line)) {
            closeList();
            inMermaidColon = true;
            html += '<pre class="mermaid">';
            continue;
        }
        if (inMermaidColon && /^:::\s*$/.test(line)) {
            inMermaidColon = false;
            html += '</pre>';
            continue;
        }
        if (inMermaidColon) {
            html += line + '\n';   // raw — no escapeHtml here
            continue;
        }

        // ── Lists
        const bulletMatch = line.match(/^\s*[-+*]\s+(.+)/);
        const orderedMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
        if (bulletMatch) {
            if (!inList || listType !== 'ul') { closeList(); html += '<ul>'; inList = true; listType = 'ul'; }
            html += '<li>' + renderInline(bulletMatch[1]) + '</li>';
            continue;
        }
        if (orderedMatch) {
            if (!inList || listType !== 'ol') { closeList(); html += '<ol>'; inList = true; listType = 'ol'; }
            html += '<li>' + renderInline(orderedMatch[2]) + '</li>';
            continue;
        }
        closeList();

        // ── Blockquotes
        const quoteMatch = line.match(/^\s*>\s?(.*)/);
        if (quoteMatch) {
            html += '<blockquote>' + renderInline(quoteMatch[1]) + '</blockquote>';
            continue;
        }

        // ── Horizontal rules (---, ***, ___)
        // NOTE: only possible because --- is no longer the slide separator
        if (/^\s*[-*_]{3,}\s*$/.test(line)) {
            html += '<hr />';
            continue;
        }

        // ── Headings
        const hMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (hMatch) {
            html += '<h' + hMatch[1].length + '>' + renderInline(hMatch[2]) + '</h' + hMatch[1].length + '>';
            continue;
        }

        // ── Blank line or paragraph
        if (line.trim().length === 0) {
            html += '<br />';
        } else {
            html += '<p>' + renderInline(line) + '</p>';
        }
    }

    closeList();
    return html;
}
```

---

## HTML change for `src/webview.html`

```html
<!-- Replace: -->
<pre class="mermaid"></pre>

<!-- With: -->
<div class="slide-inner"></div>
```

---

## Selector updates for `src/webview.html`

```javascript
const container = document.querySelector('.slide-inner');
const counter = document.querySelector('.slide-counter');
const prevBtn = document.querySelector('.nav-arrow.prev');
const nextBtn = document.querySelector('.nav-arrow.next');
const scrollContainer = document.querySelector('.slide-content');
```

---

## `renderSlide` update for `src/webview.html`

```javascript
async function renderSlide(index) {
    currentIndex = index;
    const markdown = slides[currentIndex];
    container.innerHTML = renderMarkdownToHtml(markdown);
    scrollContainer.scrollTop = 0;
    try {
        await mermaid.run({ querySelector: '.mermaid' });
    } catch (error) {
        console.error('Mermaid rendering failed:', error);
        container.innerHTML = '<p style="color: var(--vscode-errorForeground);">Failed to render slide ' + (currentIndex + 1) + ' — check the Mermaid syntax.</p>';
    }
    counter.textContent = (currentIndex + 1) + ' / ' + slides.length;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === slides.length - 1;
}
```

---

## Wheel navigation and internal scrolling for `src/webview.html`

```javascript
let scrollCooldown = false;
document.addEventListener('wheel', (e) => {
    // Shift + wheel: scroll within the current slide only.
    if (e.shiftKey) {
        if (!scrollContainer) {
            return;
        }
        // On many platforms Shift + wheel produces horizontal delta (deltaX)
        // instead of vertical (deltaY). Use whichever axis has the larger magnitude.
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (!delta) {
            return;
        }
        const before = scrollContainer.scrollTop;
        scrollContainer.scrollTop += delta;
        const after = scrollContainer.scrollTop;
        if (after !== before) {
            e.preventDefault();
            e.stopPropagation();
        }
        return;
    }

    // Plain wheel: change slides.
    const canGoNext = e.deltaY > 0 && currentIndex < slides.length - 1;
    const canGoPrev = e.deltaY < 0 && currentIndex > 0;
    if (!canGoNext && !canGoPrev) {
        return;
    }

    if (scrollCooldown) {
        return;
    }
    scrollCooldown = true;
    setTimeout(() => {
        scrollCooldown = false;
    }, 300);

    if (canGoNext) {
        e.preventDefault();
        goNext();
    } else if (canGoPrev) {
        e.preventDefault();
        goPrev();
    }
});
```

---

## Message event handler update for `src/webview.html`

```javascript
window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'update') {
        slides.length = 0;
        slides.push(...message.slides);

        if (slides.length === 0) {
            container.innerHTML = '<p style="color: var(--vscode-descriptionForeground);">No slides found.</p>';
            counter.textContent = '';
            document.body.classList.add('single-slide');
            return;
        }

        document.body.classList.toggle('single-slide', slides.length === 1);
        const newIndex = Math.min(currentIndex, slides.length - 1);
        renderSlide(newIndex);
    }
});
```

---

## Tests for `test/extension.test.js`

Add these as new `describe` blocks AFTER the existing `extractMermaidBlocks` block.

```javascript
describe("splitSlides", () => {

    it("splits slides on <!-- slide --> delimiter", () => {
        const input = "# Slide 1\ncontent\n<!-- slide -->\n# Slide 2\nmore";
        const result = splitSlides(input);
        assert.equal(result.length, 2);
        assert.match(result[0], /Slide 1/);
        assert.match(result[1], /Slide 2/);
    });

    it("is case-insensitive on the delimiter", () => {
        const input = "Slide A\n<!-- SLIDE -->\nSlide B";
        assert.equal(splitSlides(input).length, 2);
    });

    it("ignores delimiter inside fenced code block", () => {
        const input = "# Slide 1\n```js\n<!-- slide -->\n```\n<!-- slide -->\n# Slide 2";
        const result = splitSlides(input);
        assert.equal(result.length, 2);
        assert.match(result[0], /Slide 1/);
        assert.match(result[1], /Slide 2/);
    });

    it("ignores delimiter inside ::: mermaid block", () => {
        const input = "# Slide 1\n::: mermaid\ngraph TD\n  A-->B\n:::\n<!-- slide -->\n# Slide 2";
        const result = splitSlides(input);
        assert.equal(result.length, 2);
        assert.match(result[0], /Slide 1/);
        assert.match(result[1], /Slide 2/);
    });

    it("skips empty slides between delimiters", () => {
        const input = "# Slide 1\n<!-- slide -->\n\n<!-- slide -->\n# Slide 2";
        const result = splitSlides(input);
        assert.equal(result.length, 2);
    });

    it("returns entire document as one slide when no delimiter present", () => {
        const input = "# Just a heading\nSome text.";
        const result = splitSlides(input);
        assert.equal(result.length, 1);
        assert.match(result[0], /Just a heading/);
    });

    it("returns empty array for empty input", () => {
        assert.deepEqual(splitSlides(""), []);
    });

    it("skips YAML front matter at start of file", () => {
        const input = "---\ntitle: My Notes\ndate: 2024-01-01\n---\n# Real Content\n<!-- slide -->\n# Slide 2";
        const result = splitSlides(input);
        assert.equal(result.length, 2);
        assert.match(result[0], /Real Content/);
        // Front matter must not appear in any slide
        assert.doesNotMatch(result[0], /title:/);
        assert.doesNotMatch(result[0], /date:/);
    });

    it("does not treat --- as a slide delimiter", () => {
        // --- is a horizontal rule in this implementation, not a separator
        const input = "# Slide 1\n---\nMore content";
        const result = splitSlides(input);
        assert.equal(result.length, 1);  // entire content is one slide
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

    it("slide mode: splits by <!-- slide --> when delimiter is present", () => {
        const input = "# Slide 1\n```mermaid\ngraph TD\n  A-->B\n```\n<!-- slide -->\n# Slide 2\nParagraph";
        const result = getSlides(input);
        assert.equal(result.length, 2);
        assert.match(result[0], /Slide 1/);
        assert.match(result[1], /Slide 2/);
    });

    it("slide mode: preserves markdown content in each slide", () => {
        const input = "# Title\nSome text.\n<!-- slide -->\n## Second\nMore text.";
        const result = getSlides(input);
        assert.match(result[0], /Some text/);
        assert.match(result[1], /More text/);
    });

    it("slide mode: preserves mermaid-only slides", () => {
        const input = "# Intro\n<!-- slide -->\n```mermaid\ngraph TD\n  A-->B\n```";
        const result = getSlides(input);
        assert.equal(result.length, 2);
        assert.match(result[1], /graph TD/);
    });

});
```

---

## Keyboard shortcuts change for `src/webview.html`

```javascript
// Replace:
if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
// With:
if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {

// Replace:
} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
// With:
} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
```

---

## JSON XSS protection for `src/extension.js`

```javascript
// In getWebviewContent, change:
html = html.replace("{{DIAGRAMS_JSON}}", JSON.stringify(diagrams));

// To:
html = html.replace("{{SLIDES_JSON}}", JSON.stringify(slides).replace(/</g, "\\u003c"));
```

---

## Initial render null-check for `src/webview.html`

```javascript
// Replace the bare renderSlide(0) at the bottom of the script with:
if (slides.length === 0) {
    container.innerHTML = '<p style="color: var(--vscode-descriptionForeground);">No slides found.</p>';
    counter.textContent = '';
    document.body.classList.add('single-slide');
} else {
    document.body.classList.toggle('single-slide', slides.length === 1);
    renderSlide(0);
}
```

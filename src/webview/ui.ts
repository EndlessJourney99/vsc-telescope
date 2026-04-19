import { ResultItem, ContentResultItem } from '../types/messages';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('plaintext', plaintext);

const LANG_MAP: Record<string, string> = {
	typescript: 'typescript',
	javascript: 'javascript',
	typescriptreact: 'typescript',
	javascriptreact: 'javascript',
	python: 'python',
	java: 'java',
	html: 'xml',
	xml: 'xml',
	css: 'css',
	json: 'json',
	jsonc: 'json',
	shellscript: 'bash',
	bash: 'bash',
	go: 'go',
	rust: 'rust',
	cpp: 'cpp',
	c: 'cpp',
	csharp: 'csharp',
	yaml: 'yaml',
	markdown: 'markdown',
	sql: 'sql',
};

function highlight(code: string, vscodeLang: string): string {
	const lang = LANG_MAP[vscodeLang] ?? 'plaintext';
	try {
		return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
	} catch {
		return escapeHtml(code);
	}
}

const ITEM_HEIGHT = 42;
const OVERSCAN = 5;

export class TelescopeUI {
	private allItems: ResultItem[] = [];
	private filteredItems: ResultItem[] = [];
	private selectedIndex = 0;

	private resultsList!: HTMLElement;
	private scrollTrack!: HTMLElement;
	private scrollViewport!: HTMLElement;
	private statusLine!: HTMLElement;
	private previewHeader!: HTMLElement;
	private previewContent!: HTMLElement;
	private searchInput!: HTMLInputElement;

	private onFocus!: (filePath: string) => void;
	private onSelect!: (filePath: string) => void;

	build(
		container: HTMLElement,
		onFocus: (filePath: string) => void,
		onSelect: (filePath: string) => void
	): HTMLInputElement {
		this.onFocus = onFocus;
		this.onSelect = onSelect;

		container.innerHTML = `
			<div id="backdrop">
				<div id="modal">
					<div id="input-container">
						<input id="search-input" type="text" placeholder="Find files..." autocomplete="off" spellcheck="false" />
					</div>
					<div id="status-line">0 results</div>
					<div id="content">
						<div id="results-list">
							<div id="scroll-track">
								<div id="scroll-viewport"></div>
							</div>
						</div>
						<div id="preview-pane">
							<div id="preview-header"></div>
							<pre id="preview-content"></pre>
						</div>
					</div>
				</div>
			</div>
		`;

		this.resultsList = document.getElementById('results-list')!;
		this.scrollTrack = document.getElementById('scroll-track')!;
		this.scrollViewport = document.getElementById('scroll-viewport')!;
		this.statusLine = document.getElementById('status-line')!;
		this.previewHeader = document.getElementById('preview-header')!;
		this.previewContent = document.getElementById('preview-content')!;
		this.searchInput = document.getElementById('search-input') as HTMLInputElement;

		this.resultsList.addEventListener('scroll', () => this.render());

		return this.searchInput;
	}

	appendItems(items: ResultItem[]): void {
		this.filteredItems.push(...items);
		this.allItems.push(...items);
		this.updateStatus();
		if (this.filteredItems.length <= items.length) {
			// first batch — auto-focus first item
			this.selectedIndex = 0;
			if (this.filteredItems[0]) {
				this.onFocus(this.filteredItems[0].filePath);
			}
		}
		this.render();
	}

	clearItems(): void {
		this.allItems = [];
		this.filteredItems = [];
		this.selectedIndex = 0;
		this.previewContent.textContent = '';
		this.previewHeader.textContent = '';
		this.updateStatus();
		this.render();
	}

	setPreview(filePath: string, content: string): void {
		const filename = filePath.split('/').pop() ?? filePath;
		this.previewHeader.textContent = filename;
		this.previewContent.textContent = content;
	}

	moveSelection(direction: 'up' | 'down'): void {
		if (this.filteredItems.length === 0) { return; }
		if (direction === 'down') {
			this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
		} else {
			this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
		}
		this.scrollToSelected();
		const item = this.filteredItems[this.selectedIndex];
		if (item) { this.onFocus(item.filePath); }
		this.render();
	}

	getSelectedItem(): ResultItem | undefined {
		return this.filteredItems[this.selectedIndex];
	}

	private updateStatus(): void {
		this.statusLine.textContent = `${this.filteredItems.length} files`;
	}

	private scrollToSelected(): void {
		const top = this.selectedIndex * ITEM_HEIGHT;
		const bottom = top + ITEM_HEIGHT;
		const scrollTop = this.resultsList.scrollTop;
		const height = this.resultsList.clientHeight;
		if (top < scrollTop) {
			this.resultsList.scrollTop = top;
		} else if (bottom > scrollTop + height) {
			this.resultsList.scrollTop = bottom - height;
		}
	}

	private render(): void {
		const count = this.filteredItems.length;
		this.scrollTrack.style.height = `${count * ITEM_HEIGHT}px`;

		const scrollTop = this.resultsList.scrollTop;
		const visibleHeight = this.resultsList.clientHeight;
		const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
		const end = Math.min(count, Math.ceil((scrollTop + visibleHeight) / ITEM_HEIGHT) + OVERSCAN);

		this.scrollViewport.style.transform = `translateY(${start * ITEM_HEIGHT}px)`;
		this.scrollViewport.innerHTML = '';

		for (let i = start; i < end; i++) {
			const item = this.filteredItems[i];
			const el = document.createElement('div');
			el.className = 'result-item' + (i === this.selectedIndex ? ' selected' : '');
			el.dataset.index = String(i);

			const filename = item.relativePath.split('/').pop() ?? item.relativePath;
			const dir = item.relativePath.includes('/')
				? item.relativePath.slice(0, item.relativePath.lastIndexOf('/'))
				: '';

			el.innerHTML = `<span class="filename">${escapeHtml(filename)}</span>${dir ? `<span class="filepath">${escapeHtml(dir)}</span>` : ''}`;

			el.addEventListener('mouseenter', () => {
				this.selectedIndex = i;
				this.onFocus(item.filePath);
				this.render();
			});
			el.addEventListener('click', () => {
				this.selectedIndex = i;
				this.onSelect(item.filePath);
			});

			this.scrollViewport.appendChild(el);
		}
	}
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const CONTENT_ITEM_HEIGHT = 52;

export class ContentUI {
	private items: ContentResultItem[] = [];
	private selectedIndex = 0;

	private resultsList!: HTMLElement;
	private scrollTrack!: HTMLElement;
	private scrollViewport!: HTMLElement;
	private statusLine!: HTMLElement;
	private previewHeader!: HTMLElement;
	private previewLines!: HTMLElement;
	private searchInput!: HTMLInputElement;

	private onFocus!: (filePath: string, lineNumber: number) => void;
	private onSelect!: (filePath: string, lineNumber: number) => void;

	build(
		container: HTMLElement,
		onFocus: (filePath: string, lineNumber: number) => void,
		onSelect: (filePath: string, lineNumber: number) => void
	): HTMLInputElement {
		this.onFocus = onFocus;
		this.onSelect = onSelect;

		container.innerHTML = `
			<div id="backdrop">
				<div id="modal">
					<div id="input-container">
						<input id="search-input" type="text" placeholder="Search in files..." autocomplete="off" spellcheck="false" />
					</div>
					<div id="status-line">Type to search file contents</div>
					<div id="content">
						<div id="results-list">
							<div id="scroll-track">
								<div id="scroll-viewport"></div>
							</div>
						</div>
						<div id="preview-pane">
							<div id="preview-header"></div>
							<div id="preview-lines"></div>
						</div>
					</div>
				</div>
			</div>
		`;

		this.resultsList = document.getElementById('results-list')!;
		this.scrollTrack = document.getElementById('scroll-track')!;
		this.scrollViewport = document.getElementById('scroll-viewport')!;
		this.statusLine = document.getElementById('status-line')!;
		this.previewHeader = document.getElementById('preview-header')!;
		this.previewLines = document.getElementById('preview-lines')!;
		this.searchInput = document.getElementById('search-input') as HTMLInputElement;

		this.resultsList.addEventListener('scroll', () => this.render());

		return this.searchInput;
	}

	appendItems(items: ContentResultItem[]): void {
		this.items.push(...items);
		this.statusLine.textContent = `${this.items.length} matches`;
		if (this.items.length <= items.length && items[0]) {
			this.selectedIndex = 0;
			this.onFocus(items[0].filePath, items[0].lineNumber);
		}
		this.render();
	}

	clearItems(): void {
		this.items = [];
		this.selectedIndex = 0;
		this.previewLines.innerHTML = '';
		this.previewHeader.textContent = '';
		this.statusLine.textContent = 'Type to search file contents';
		this.render();
	}

	setPreview(filePath: string, content: string, language: string, lineNumber: number): void {
		this.previewHeader.innerHTML =
			`<span class="preview-path">${escapeHtml(filePath)}</span>` +
			`<span class="preview-lang">${escapeHtml(language)}</span>`;

		const highlightedHtml = highlight(content, language);
		const lines = highlightedHtml.split('\n');

		const rows = lines.map((lineHtml, idx) => {
			const n = idx + 1;
			const isMatch = n === lineNumber;
			return `<tr class="code-row${isMatch ? ' code-row-match' : ''}">` +
				`<td class="line-num" data-line="${n}">${n}</td>` +
				`<td class="line-code">${lineHtml || ' '}</td>` +
				`</tr>`;
		}).join('');

		this.previewLines.innerHTML = `<table class="code-table"><tbody>${rows}</tbody></table>`;

		const matchRow = this.previewLines.querySelector('.code-row-match') as HTMLElement | null;
		if (matchRow) {
			matchRow.scrollIntoView({ block: 'center' });
		}
	}

	moveSelection(direction: 'up' | 'down'): void {
		if (this.items.length === 0) { return; }
		if (direction === 'down') {
			this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
		} else {
			this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
		}
		this.scrollToSelected();
		const item = this.items[this.selectedIndex];
		if (item) { this.onFocus(item.filePath, item.lineNumber); }
		this.render();
	}

	getSelectedItem(): ContentResultItem | undefined {
		return this.items[this.selectedIndex];
	}

	private scrollToSelected(): void {
		const top = this.selectedIndex * CONTENT_ITEM_HEIGHT;
		const bottom = top + CONTENT_ITEM_HEIGHT;
		const scrollTop = this.resultsList.scrollTop;
		const height = this.resultsList.clientHeight;
		if (top < scrollTop) {
			this.resultsList.scrollTop = top;
		} else if (bottom > scrollTop + height) {
			this.resultsList.scrollTop = bottom - height;
		}
	}

	private render(): void {
		const count = this.items.length;
		this.scrollTrack.style.height = `${count * CONTENT_ITEM_HEIGHT}px`;

		const scrollTop = this.resultsList.scrollTop;
		const visibleHeight = this.resultsList.clientHeight;
		const start = Math.max(0, Math.floor(scrollTop / CONTENT_ITEM_HEIGHT) - OVERSCAN);
		const end = Math.min(count, Math.ceil((scrollTop + visibleHeight) / CONTENT_ITEM_HEIGHT) + OVERSCAN);

		this.scrollViewport.style.transform = `translateY(${start * CONTENT_ITEM_HEIGHT}px)`;
		this.scrollViewport.innerHTML = '';

		for (let i = start; i < end; i++) {
			const item = this.items[i];
			const el = document.createElement('div');
			el.className = 'result-item content-item' + (i === this.selectedIndex ? ' selected' : '');

			const filename = item.relativePath.split('/').pop() ?? item.relativePath;
			el.innerHTML = `
				<span class="content-meta">${escapeHtml(filename)}<span class="content-line-num">:${item.lineNumber}</span></span>
				<span class="content-text">${escapeHtml(item.lineText.trim())}</span>
			`;

			el.addEventListener('mouseenter', () => {
				this.selectedIndex = i;
				this.onFocus(item.filePath, item.lineNumber);
				this.render();
			});
			el.addEventListener('click', () => {
				this.selectedIndex = i;
				this.onSelect(item.filePath, item.lineNumber);
			});

			this.scrollViewport.appendChild(el);
		}
	}
}

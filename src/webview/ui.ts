import { ResultItem } from '../types/messages';

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

import * as vscode from 'vscode';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { spawnRipgrep } from './ripgrep';
import { parseQuery } from './queryParser';
import { fuzzyFilter } from './fuzzy';
import { ResultItem } from '../types/messages';

interface FilePickItem extends vscode.QuickPickItem {
	filePath: string;
}

export class TelescopePanel {
	private static instance: TelescopePanel | undefined;

	private readonly quickPick: vscode.QuickPick<FilePickItem>;
	private rgProcess: ChildProcess | undefined;
	private allItems: ResultItem[] = [];
	private currentGlob: string | null = null;

	private constructor() {
		const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

		this.quickPick = vscode.window.createQuickPick<FilePickItem>();
		this.quickPick.placeholder = 'Find files... append {ext} to filter by type';
		this.quickPick.matchOnDescription = true;

		this.quickPick.onDidChangeValue((value) => {
			const { text, glob } = parseQuery(value);

			if (glob !== this.currentGlob) {
				this.currentGlob = glob;
				this.quickPick.title = glob ? `Filter: ${glob}` : undefined;
				this.startSearch(workspacePath);
			} else if (glob !== null) {
				// Glob unchanged, text changed — re-filter without restarting rg
				this.quickPick.items = this.buildItems(text);
			}
		});

		this.quickPick.onDidAccept(() => {
			const selected = this.quickPick.activeItems[0];
			if (selected) {
				vscode.window.showTextDocument(vscode.Uri.file(selected.filePath), { preview: false });
			}
			this.close();
		});

		this.quickPick.onDidHide(() => this.close());

		this.quickPick.show();
		this.startSearch(workspacePath);
	}

	static open(_context: vscode.ExtensionContext): void {
		if (TelescopePanel.instance) { return; }
		TelescopePanel.instance = new TelescopePanel();
	}

	static dispose(): void {
		TelescopePanel.instance?.close();
	}

	static moveDown(): void {
		const qp = TelescopePanel.instance?.quickPick;
		if (!qp || qp.items.length === 0) { return; }
		const current = qp.activeItems[0];
		const idx = current ? qp.items.indexOf(current) : -1;
		const next = qp.items[Math.min(idx + 1, qp.items.length - 1)];
		if (next) { qp.activeItems = [next]; }
	}

	static moveUp(): void {
		const qp = TelescopePanel.instance?.quickPick;
		if (!qp || qp.items.length === 0) { return; }
		const current = qp.activeItems[0];
		const idx = current ? qp.items.indexOf(current) : 1;
		const prev = qp.items[Math.max(idx - 1, 0)];
		if (prev) { qp.activeItems = [prev]; }
	}

	private startSearch(cwd: string): void {
		if (!cwd) { return; }

		this.killRg();
		this.allItems = [];
		this.quickPick.items = [];
		this.quickPick.busy = true;

		this.rgProcess = spawnRipgrep(
			this.currentGlob,
			cwd,
			(items) => {
				this.allItems.push(...items);
				const { text } = parseQuery(this.quickPick.value);
				this.quickPick.items = this.buildItems(text);
			},
			() => {
				this.quickPick.busy = false;
			}
		);
	}

	private buildItems(text: string): FilePickItem[] {
		if (this.currentGlob !== null) {
			// Glob active: apply our own fuzzy filter on the text part and mark
			// all returned items as alwaysShow so VS Code's built-in filter (which
			// can't match '{' / '}' in filenames) doesn't hide them.
			return fuzzyFilter(text, this.allItems).map(item => ({
				...this.toPickItem(item),
				alwaysShow: true,
			}));
		}
		// No glob: return everything and let VS Code's native filter run.
		return this.allItems.map(item => this.toPickItem(item));
	}

	private toPickItem(item: ResultItem): FilePickItem {
		const basename = path.basename(item.relativePath);
		const dir = path.dirname(item.relativePath);
		return {
			label: `$(file) ${basename}`,
			description: dir === '.' ? '' : dir,
			filePath: item.filePath,
		};
	}

	private killRg(): void {
		if (this.rgProcess) {
			this.rgProcess.kill();
			this.rgProcess = undefined;
		}
	}

	private close(): void {
		if (!TelescopePanel.instance) { return; }
		TelescopePanel.instance = undefined;
		this.killRg();
		this.quickPick.dispose();
	}
}

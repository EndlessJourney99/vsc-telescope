import * as vscode from 'vscode';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { spawnRipgrep } from './ripgrep';
import { ResultItem } from '../types/messages';

interface FilePickItem extends vscode.QuickPickItem {
	filePath: string;
}

export class TelescopePanel {
	private static instance: TelescopePanel | undefined;

	private readonly quickPick: vscode.QuickPick<FilePickItem>;
	private rgProcess: ChildProcess | undefined;
	private allItems: ResultItem[] = [];

	private constructor() {
		const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

		this.quickPick = vscode.window.createQuickPick<FilePickItem>();
		this.quickPick.placeholder = 'Find files...';
		this.quickPick.matchOnDescription = true;

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

	private startSearch(cwd: string): void {
		if (!cwd) { return; }

		this.killRg();
		this.allItems = [];
		this.quickPick.items = [];
		this.quickPick.busy = true;

		this.rgProcess = spawnRipgrep(
			'',
			cwd,
			(items) => {
				this.allItems.push(...items);
				this.quickPick.items = this.allItems.map(item => this.toPickItem(item));
			},
			() => {
				this.quickPick.busy = false;
			}
		);
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

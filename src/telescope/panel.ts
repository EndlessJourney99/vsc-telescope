import * as vscode from 'vscode';
import { ChildProcess } from 'child_process';
import { spawnRipgrep } from './ripgrep';
import { fuzzyFilter } from './fuzzy';
import { getFilePreview } from './preview';
import { ResultItem, WebviewMessage } from '../types/messages';

function generateNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export class TelescopePanel {
	private static instance: TelescopePanel | undefined;

	private readonly panel: vscode.WebviewPanel;
	private readonly context: vscode.ExtensionContext;
	private rgProcess: ChildProcess | undefined;
	private debounceTimer: ReturnType<typeof setTimeout> | undefined;
	private allItems: ResultItem[] = [];
	private currentQuery = '';

	private constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.panel = vscode.window.createWebviewPanel(
			'vsc-telescope',
			'Telescope',
			{ viewColumn: vscode.ViewColumn.One, preserveFocus: false },
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
				retainContextWhenHidden: false,
			}
		);

		this.panel.webview.html = this.getHtml();
		this.panel.webview.onDidReceiveMessage(this.handleMessage, this, context.subscriptions);
		this.panel.onDidDispose(this.dispose.bind(this), null, context.subscriptions);

		const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
		this.panel.webview.postMessage({ type: 'init', workspacePath });
		this.startSearch('', workspacePath);
	}

	static open(context: vscode.ExtensionContext): void {
		if (TelescopePanel.instance) {
			TelescopePanel.instance.panel.reveal(vscode.ViewColumn.One);
			return;
		}
		TelescopePanel.instance = new TelescopePanel(context);
	}

	static dispose(): void {
		TelescopePanel.instance?.panel.dispose();
	}

	private handleMessage = async (msg: WebviewMessage) => {
		switch (msg.type) {
			case 'query:change': {
				this.currentQuery = msg.query;
				if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
				this.debounceTimer = setTimeout(() => {
					const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
					this.startSearch(msg.query, workspacePath);
				}, 80);
				break;
			}
			case 'item:focus': {
				const preview = await getFilePreview(msg.filePath);
				this.panel.webview.postMessage({
					type: 'preview:content',
					content: preview.content,
					language: preview.language,
					filePath: msg.filePath,
				});
				break;
			}
			case 'item:select': {
				const uri = vscode.Uri.file(msg.filePath);
				await vscode.window.showTextDocument(uri, { preview: false });
				this.panel.dispose();
				break;
			}
			case 'close': {
				this.panel.dispose();
				break;
			}
		}
	};

	private startSearch(query: string, cwd: string): void {
		if (!cwd) { return; }

		this.killRg();
		this.allItems = [];
		this.panel.webview.postMessage({ type: 'results:clear' });

		this.rgProcess = spawnRipgrep(
			query,
			cwd,
			(items) => {
				this.allItems.push(...items);
				const filtered = fuzzyFilter(this.currentQuery, items);
				if (filtered.length > 0) {
					this.panel.webview.postMessage({ type: 'results:stream', items: filtered });
				}
			},
			() => {
				this.panel.webview.postMessage({ type: 'results:done' });
			}
		);
	}

	private killRg(): void {
		if (this.rgProcess) {
			this.rgProcess.kill();
			this.rgProcess = undefined;
		}
	}

	private dispose(): void {
		this.killRg();
		if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
		TelescopePanel.instance = undefined;
	}

	private getHtml(): string {
		const webview = this.panel.webview;
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
		);
		const nonce = generateNonce();
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy"
		content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>Telescope</title>
</head>
<body style="margin:0;padding:0;overflow:hidden;background:transparent;">
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}
}


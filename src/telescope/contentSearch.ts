import * as vscode from 'vscode';
import { ChildProcess } from 'child_process';
import { spawnRipgrepContent } from './ripgrepContent';
import { parseQuery } from './queryParser';
import { getFilePreview } from './preview';
import { WebviewMessage } from '../types/messages';

function generateNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export class ContentSearchPanel {
	private static instance: ContentSearchPanel | undefined;

	private readonly panel: vscode.WebviewPanel;
	private readonly context: vscode.ExtensionContext;
	private rgProcess: ChildProcess | undefined;
	private debounceTimer: ReturnType<typeof setTimeout> | undefined;

	private constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.panel = vscode.window.createWebviewPanel(
			'vsc-telescope-content',
			'Telescope: Search Content',
			{ viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
				retainContextWhenHidden: false,
			}
		);

		this.panel.webview.html = this.getHtml();
		this.panel.webview.onDidReceiveMessage(this.handleMessage, this, context.subscriptions);
		this.panel.onDidDispose(this.dispose.bind(this), null, context.subscriptions);
	}

	static open(context: vscode.ExtensionContext): void {
		if (ContentSearchPanel.instance) {
			ContentSearchPanel.instance.panel.reveal(vscode.ViewColumn.Active);
			return;
		}
		ContentSearchPanel.instance = new ContentSearchPanel(context);
	}

	static dispose(): void {
		ContentSearchPanel.instance?.panel.dispose();
	}

	private handleMessage = async (msg: WebviewMessage) => {
		switch (msg.type) {
			case 'webview:ready': {
				const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
				this.panel.webview.postMessage({ type: 'init', workspacePath });
				break;
			}
			case 'query:change': {
				if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
				this.debounceTimer = setTimeout(() => {
					const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
					this.startSearch(msg.query, workspacePath);
				}, 200);
				break;
			}
			case 'content:focus': {
				const preview = await getFilePreview(msg.filePath);
				this.panel.webview.postMessage({
					type: 'content:preview',
					content: preview.content,
					language: preview.language,
					filePath: msg.filePath,
					lineNumber: msg.lineNumber,
				});
				break;
			}
			case 'content:select': {
				const uri = vscode.Uri.file(msg.filePath);
				const doc = await vscode.workspace.openTextDocument(uri);
				const line = Math.max(0, msg.lineNumber - 1);
				const pos = new vscode.Position(line, 0);
				await vscode.window.showTextDocument(doc, {
					selection: new vscode.Range(pos, pos),
					preview: false,
				});
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
		this.panel.webview.postMessage({ type: 'content:clear' });

		if (!query.trim()) { return; }

		const { text, glob } = parseQuery(query);
		if (!text.trim()) { return; }

		this.rgProcess = spawnRipgrepContent(
			text,
			glob,
			cwd,
			(items) => {
				this.panel.webview.postMessage({ type: 'content:stream', items });
			},
			() => {
				this.panel.webview.postMessage({ type: 'content:done' });
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
		ContentSearchPanel.instance = undefined;
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
	<title>Telescope: Search Content</title>
</head>
<body style="margin:0;padding:0;overflow:hidden;">
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}
}

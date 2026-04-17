import * as vscode from 'vscode';
import { TelescopePanel } from './telescope/panel';
import { ContentSearchPanel } from './telescope/contentSearch';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('vsc-telescope.open', () => {
			TelescopePanel.open(context);
		}),
		vscode.commands.registerCommand('vsc-telescope.searchContent', () => {
			ContentSearchPanel.open(context);
		})
	);
}

export function deactivate() {
	TelescopePanel.dispose();
	ContentSearchPanel.dispose();
}

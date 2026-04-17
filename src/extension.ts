import * as vscode from 'vscode';
import { TelescopePanel } from './telescope/panel';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('vsc-telescope.open', () => {
			TelescopePanel.open(context);
		})
	);
}

export function deactivate() {
	TelescopePanel.dispose();
}

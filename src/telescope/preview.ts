import * as vscode from 'vscode';

export async function getFilePreview(filePath: string): Promise<{ content: string; language: string }> {
	try {
		const uri = vscode.Uri.file(filePath);
		const doc = await vscode.workspace.openTextDocument(uri);
		const content = doc.getText();
		const language = doc.languageId;
		// Limit preview to first 500 lines to avoid huge payloads
		const lines = content.split('\n').slice(0, 500);
		return { content: lines.join('\n'), language };
	} catch {
		return { content: '(Unable to preview file)', language: 'plaintext' };
	}
}

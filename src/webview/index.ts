import { ExtensionMessage, WebviewMessage } from '../types/messages';
import { TelescopeUI } from './ui';
import { attachKeybindings, vscode } from './keybindings';
import styles from './styles.css';

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

const ui = new TelescopeUI();

window.addEventListener('DOMContentLoaded', () => {
	const input = ui.build(
		document.body,
		(filePath) => {
			vscode.postMessage({ type: 'item:focus', filePath } as WebviewMessage);
		},
		(filePath) => {
			vscode.postMessage({ type: 'item:select', filePath } as WebviewMessage);
		}
	);

	attachKeybindings(input, {
		onMove: (direction) => ui.moveSelection(direction),
		onSelect: () => {
			const item = ui.getSelectedItem();
			if (item) {
				vscode.postMessage({ type: 'item:select', filePath: item.filePath } as WebviewMessage);
			}
		},
		onClose: () => { /* vscode.postMessage already called in keybindings.ts */ },
	});

	input.addEventListener('input', () => {
		vscode.postMessage({ type: 'query:change', query: input.value } as WebviewMessage);
	});

	// Ensure focus
	input.focus();

	// Signal to the extension host that the webview is ready to receive messages
	vscode.postMessage({ type: 'webview:ready' } as WebviewMessage);
});

window.addEventListener('message', (event: MessageEvent) => {
	const msg = event.data as ExtensionMessage;
	switch (msg.type) {
		case 'results:clear':
			ui.clearItems();
			break;
		case 'results:stream':
			ui.appendItems(msg.items);
			break;
		case 'results:done':
			break;
		case 'preview:content':
			ui.setPreview(msg.filePath, msg.content);
			break;
		case 'init':
			break;
	}
});

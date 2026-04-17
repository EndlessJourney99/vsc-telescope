import { ExtensionMessage, WebviewMessage } from '../types/messages';
import { ContentUI } from './ui';
import { attachKeybindings, vscode } from './keybindings';
import styles from './styles.css';

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

const ui = new ContentUI();

window.addEventListener('DOMContentLoaded', () => {
	const input = ui.build(
		document.body,
		(filePath, lineNumber) => {
			vscode.postMessage({ type: 'content:focus', filePath, lineNumber } as WebviewMessage);
		},
		(filePath, lineNumber) => {
			vscode.postMessage({ type: 'content:select', filePath, lineNumber } as WebviewMessage);
		}
	);

	attachKeybindings(input, {
		onMove: (direction) => ui.moveSelection(direction),
		onSelect: () => {
			const item = ui.getSelectedItem();
			if (item) {
				vscode.postMessage({ type: 'content:select', filePath: item.filePath, lineNumber: item.lineNumber } as WebviewMessage);
			}
		},
		onClose: () => { /* handled in keybindings.ts */ },
	});

	input.addEventListener('input', () => {
		vscode.postMessage({ type: 'query:change', query: input.value } as WebviewMessage);
	});

	input.focus();
	vscode.postMessage({ type: 'webview:ready' } as WebviewMessage);
});

window.addEventListener('message', (event: MessageEvent) => {
	const msg = event.data as ExtensionMessage;
	switch (msg.type) {
		case 'content:clear':
			ui.clearItems();
			break;
		case 'content:stream':
			ui.appendItems(msg.items);
			break;
		case 'content:done':
			break;
		case 'content:preview':
			ui.setPreview(msg.filePath, msg.content, msg.lineNumber);
			break;
		case 'init':
			break;
		default:
			break;
	}
});

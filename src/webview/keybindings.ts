import { WebviewMessage } from '../types/messages';

declare const acquireVsCodeApi: () => { postMessage: (msg: WebviewMessage) => void };
const vscode = acquireVsCodeApi();

export type Direction = 'up' | 'down';

export interface KeybindingHandlers {
	onMove: (direction: Direction) => void;
	onSelect: () => void;
	onClose: () => void;
}

export function attachKeybindings(input: HTMLInputElement, handlers: KeybindingHandlers): void {
	input.addEventListener('keydown', (e: KeyboardEvent) => {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				handlers.onMove('down');
				break;
			case 'ArrowUp':
				e.preventDefault();
				handlers.onMove('up');
				break;
			case 'Enter':
				e.preventDefault();
				handlers.onSelect();
				break;
			case 'Escape':
				e.preventDefault();
				handlers.onClose();
				vscode.postMessage({ type: 'close' });
				break;
		}
	});
}

export { vscode };

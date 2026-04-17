export interface ResultItem {
	filePath: string;
	relativePath: string;
}

export type ExtensionMessage =
	| { type: 'results:stream'; items: ResultItem[] }
	| { type: 'results:done' }
	| { type: 'results:clear' }
	| { type: 'preview:content'; content: string; language: string; filePath: string }
	| { type: 'init'; workspacePath: string };

export type WebviewMessage =
	| { type: 'webview:ready' }
	| { type: 'query:change'; query: string }
	| { type: 'item:select'; filePath: string }
	| { type: 'item:focus'; filePath: string }
	| { type: 'close' };

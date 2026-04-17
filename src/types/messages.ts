export interface ResultItem {
	filePath: string;
	relativePath: string;
}

export interface ContentResultItem {
	filePath: string;
	relativePath: string;
	lineNumber: number;
	lineText: string;
}

export type ExtensionMessage =
	| { type: 'results:stream'; items: ResultItem[] }
	| { type: 'results:done' }
	| { type: 'results:clear' }
	| { type: 'preview:content'; content: string; language: string; filePath: string }
	| { type: 'content:stream'; items: ContentResultItem[] }
	| { type: 'content:clear' }
	| { type: 'content:done' }
	| { type: 'content:preview'; content: string; language: string; filePath: string; lineNumber: number }
	| { type: 'init'; workspacePath: string };

export type WebviewMessage =
	| { type: 'webview:ready' }
	| { type: 'query:change'; query: string }
	| { type: 'item:select'; filePath: string }
	| { type: 'item:focus'; filePath: string }
	| { type: 'content:focus'; filePath: string; lineNumber: number }
	| { type: 'content:select'; filePath: string; lineNumber: number }
	| { type: 'close' };

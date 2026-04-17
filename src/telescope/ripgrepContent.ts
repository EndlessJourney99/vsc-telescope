import { spawn, ChildProcess } from 'child_process';
import { rgPath } from '@vscode/ripgrep';
import { ContentResultItem } from '../types/messages';

interface RgJsonMatch {
	type: 'match';
	data: {
		path: { text: string };
		lines: { text: string };
		line_number: number;
		submatches: { match: { text: string } }[];
	};
}

export function spawnRipgrepContent(
	query: string,
	cwd: string,
	onBatch: (items: ContentResultItem[]) => void,
	onDone: () => void
): ChildProcess {
	const args = [
		'--json',
		'--ignore-case',
		'--hidden',
		'--glob', '!.git',
		'--glob', '!node_modules',
		'--max-count', '5',
		query,
		cwd,
	];
	const proc = spawn(rgPath, args, { cwd });

	let buffer = '';
	let batchBuffer: ContentResultItem[] = [];
	let flushTimer: ReturnType<typeof setTimeout> | null = null;

	const flush = () => {
		if (batchBuffer.length > 0) {
			onBatch(batchBuffer);
			batchBuffer = [];
		}
		flushTimer = null;
	};

	proc.stdout.on('data', (chunk: Buffer) => {
		buffer += chunk.toString();
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			if (!line.trim()) { continue; }
			try {
				const parsed = JSON.parse(line) as RgJsonMatch;
				if (parsed.type !== 'match') { continue; }
				const { path, lines: lineData, line_number } = parsed.data;
				batchBuffer.push({
					filePath: path.text,
					relativePath: path.text.replace(cwd + '/', ''),
					lineNumber: line_number,
					lineText: lineData.text.replace(/\n$/, ''),
				});
				if (batchBuffer.length >= 100) {
					if (flushTimer) { clearTimeout(flushTimer); }
					flush();
				}
			} catch { /* skip malformed lines */ }
		}

		if (!flushTimer && batchBuffer.length > 0) {
			flushTimer = setTimeout(flush, 50);
		}
	});

	proc.on('close', () => {
		if (flushTimer) { clearTimeout(flushTimer); }
		flush();
		onDone();
	});

	proc.stderr.on('data', () => { /* ignore rg warnings */ });

	return proc;
}

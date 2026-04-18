import { spawn, ChildProcess } from 'child_process';
import { rgPath } from '@vscode/ripgrep';
import { ResultItem } from '../types/messages';

export function spawnRipgrep(
	glob: string | null,
	cwd: string,
	onBatch: (items: ResultItem[]) => void,
	onDone: () => void
): ChildProcess {
	const args = ['--files', '--hidden', '--glob', '!.git', '--glob', '!node_modules'];
	if (glob) { args.push('--glob', glob); }
	args.push(cwd);
	const proc = spawn(rgPath, args, { cwd });

	let buffer = '';
	let batchBuffer: ResultItem[] = [];
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
			batchBuffer.push({ filePath: line, relativePath: line.replace(cwd + '/', '') });
			if (batchBuffer.length >= 200) {
				if (flushTimer) { clearTimeout(flushTimer); }
				flush();
			}
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

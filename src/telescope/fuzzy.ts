import { ResultItem } from '../types/messages';

function score(query: string, item: ResultItem): number {
	if (!query) { return 1; }
	const lq = query.toLowerCase();
	const basename = item.relativePath.split('/').pop()?.toLowerCase() ?? '';
	const fullPath = item.relativePath.toLowerCase();

	if (basename.includes(lq)) { return 100; }
	if (fullPath.includes(lq)) { return 80; }

	// subsequence match
	let qi = 0;
	for (let i = 0; i < fullPath.length && qi < lq.length; i++) {
		if (fullPath[i] === lq[qi]) { qi++; }
	}
	if (qi === lq.length) { return 50; }

	return 0;
}

export function fuzzyFilter(query: string, items: ResultItem[]): ResultItem[] {
	if (!query) { return items; }
	return items
		.map(item => ({ item, s: score(query, item) }))
		.filter(x => x.s > 0)
		.sort((a, b) => b.s - a.s)
		.map(x => x.item);
}

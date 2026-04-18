export interface ParsedQuery {
	text: string;
	glob: string | null;
}

/**
 * Parses an optional file-type filter from the query.
 * Syntax: `<search text> {ext}`
 * Examples:
 *   "someFile {ts}"  → { text: "someFile", glob: "*.ts" }
 *   "any content {ts}" → { text: "any content", glob: "*.ts" }
 *   "someFile"       → { text: "someFile", glob: null }
 */
export function parseQuery(input: string): ParsedQuery {
	const match = input.match(/^(.*?)\s*\{(\w+)\}\s*$/);
	if (match) {
		return { text: match[1], glob: `*.${match[2]}` };
	}
	return { text: input, glob: null };
}

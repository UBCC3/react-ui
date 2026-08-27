export interface XyzAtom {
	/** 1-based, matching JSmol's preview labels and optking's constraint strings. */
	index: number;
	symbol: string;
	label: string;
	position: [number, number, number];
}

/**
 * Pulls the atom list out of raw .xyz text for the atom-picker dropdowns.
 * Returns [] for anything unparseable so the caller can just disable the picker.
 */
export const parseXyzAtoms = (data: string): XyzAtom[] => {
	if (!data) return [];

	const lines = data.split(/\r?\n/);
	const declared = parseInt(lines[0]?.trim() ?? "", 10);
	if (!Number.isFinite(declared) || declared < 1) return [];

	// Line 0 is the atom count, line 1 is the comment/cell line.
	const atoms: XyzAtom[] = [];
	for (const line of lines.slice(2)) {
		if (atoms.length === declared) break;

		const parts = line.trim().split(/\s+/);
		if (parts.length < 4) continue;

		const [symbol, ...coords] = parts;
		if (!coords.slice(0, 3).every((v) => Number.isFinite(parseFloat(v)))) continue;

		const index = atoms.length + 1;
		const position = coords.slice(0, 3).map(parseFloat) as [number, number, number];
		atoms.push({ index, symbol, label: `${index} — ${symbol}`, position });
	}

	return atoms;
};

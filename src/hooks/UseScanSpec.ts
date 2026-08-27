import { useEffect, useMemo, useState } from "react";
import { measureCoordinate } from "../utils";
import type { XyzAtom } from "../utils/parseXyz";

/** Which internal coordinate the scan varies. */
export type ScanCoordinate = "bond" | "angle" | "dihedral";

/** How the user specifies the range of values to scan over. */
export type RangeMode = "steps" | "spacing" | "values";

export const COORDINATE_OPTIONS: {
	value: ScanCoordinate;
	label: string;
	atomCount: number;
}[] = [
	{ value: "bond", label: "Bond length (2 atoms)", atomCount: 2 },
	{ value: "angle", label: "Bond angle (3 atoms)", atomCount: 3 },
	{ value: "dihedral", label: "Dihedral angle (4 atoms)", atomCount: 4 },
];

/**
 * Slot labels per coordinate, matching how scan_util.py consumes the indices:
 * for an angle the middle atom is the vertex it rotates about, and for a
 * dihedral the middle pair is the rotation axis.
 */
export const SLOT_LABELS: Record<ScanCoordinate, string[]> = {
	bond: ["Atom 1", "Atom 2"],
	angle: ["Atom 1", "Vertex atom", "Atom 3"],
	dihedral: ["Atom 1", "Axis atom 1", "Axis atom 2", "Atom 4"],
};

/** The scan specification, shaped as normalise_scan_values() accepts it. */
export interface ScanSpec {
	coordinate: ScanCoordinate;
	atoms: number[];
	relax: boolean;
	values?: number[];
	min?: number;
	max?: number;
	steps?: number;
	spacing?: number;
}

/**
 * Owns the scan specification a submit form collects.
 *
 * Shared by the workflow scan page and the custom job page so the two cannot
 * drift. Only the level of theory differs between them, and that is not part
 * of the scan specification.
 */
export function useScanSpec(atomOptions: XyzAtom[]) {
	const [coordinate, setCoordinate] = useState<ScanCoordinate>("bond");
	const [atomSlots, setAtomSlots] = useState<(number | "")[]>([]);
	const [rangeMode, setRangeMode] = useState<RangeMode>("steps");
	const [rangeMin, setRangeMin] = useState<string>("");
	const [rangeMax, setRangeMax] = useState<string>("");
	const [rangeSteps, setRangeSteps] = useState<string>("10");
	const [rangeSpacing, setRangeSpacing] = useState<string>("");
	const [rangeValues, setRangeValues] = useState<string>("");
	const [relax, setRelax] = useState<boolean>(false);

	const selectedCoordinate =
		COORDINATE_OPTIONS.find((option) => option.value === coordinate) ?? COORDINATE_OPTIONS[0];
	const expectedAtomCount = selectedCoordinate.atomCount;
	const unitLabel = coordinate === "bond" ? "Å" : "°";

	// Clear the picks whenever the atom set or the number of slots changes.
	useEffect(() => {
		setAtomSlots(Array(expectedAtomCount).fill(""));
	}, [expectedAtomCount, atomOptions]);

	const handleAtomSlotChange = (slot: number, value: number | "") => {
		setAtomSlots((previous) => {
			const next = [...previous];
			next[slot] = value;
			return next;
		});
	};

	// Order matters, so keep slot order and treat a partly filled set as invalid.
	const parsedAtoms = atomSlots.filter((atom): atom is number => atom !== "");
	const atomsValid =
		parsedAtoms.length === expectedAtomCount && new Set(parsedAtoms).size === expectedAtomCount;

	const parsedValues = rangeValues
		.split(",")
		.map((part) => parseFloat(part.trim()))
		.filter((value) => Number.isFinite(value));

	/** The coordinate's value in the uploaded structure, once enough atoms are picked. */
	const currentValue = useMemo(() => {
		if (!atomsValid) return null;
		const points = parsedAtoms.map(
			(index) => atomOptions.find((atom) => atom.index === index)!.position,
		);
		return measureCoordinate(coordinate, points);
	}, [atomsValid, parsedAtoms, atomOptions, coordinate]);

	/** Assembles the spec in the shape the cluster's normalise_scan_values() accepts. */
	const buildScanSpec = (): ScanSpec => {
		const base = { coordinate, atoms: parsedAtoms, relax };
		if (rangeMode === "values") {
			return { ...base, values: parsedValues };
		}
		if (rangeMode === "steps") {
			return {
				...base,
				min: parseFloat(rangeMin),
				max: parseFloat(rangeMax),
				steps: parseInt(rangeSteps, 10),
			};
		}
		return {
			...base,
			min: parseFloat(rangeMin),
			max: parseFloat(rangeMax),
			spacing: parseFloat(rangeSpacing),
		};
	};

	/** Returns an error message when the scan settings are incomplete. */
	const validateScan = (): string | null => {
		if (!atomsValid) {
			return `Please choose ${expectedAtomCount} distinct atoms for a ${coordinate} scan.`;
		}
		if (rangeMode === "values") {
			if (parsedValues.length < 2) return "Please enter at least two scan values.";
			return null;
		}
		if (!rangeMin || !rangeMax) return "Please enter both a minimum and a maximum.";
		if (parseFloat(rangeMin) === parseFloat(rangeMax)) {
			return "The minimum and maximum must be different.";
		}
		if (rangeMode === "steps" && parseInt(rangeSteps, 10) < 2) {
			return "A scan needs at least two steps.";
		}
		if (rangeMode === "spacing" && !(parseFloat(rangeSpacing) > 0)) {
			return "The step size must be greater than zero.";
		}
		return null;
	};

	return {
		coordinate,
		setCoordinate,
		atomSlots,
		handleAtomSlotChange,
		rangeMode,
		setRangeMode,
		rangeMin,
		setRangeMin,
		rangeMax,
		setRangeMax,
		rangeSteps,
		setRangeSteps,
		rangeSpacing,
		setRangeSpacing,
		rangeValues,
		setRangeValues,
		relax,
		setRelax,
		expectedAtomCount,
		unitLabel,
		parsedAtoms,
		atomsValid,
		currentValue,
		buildScanSpec,
		validateScan,
	};
}

export type ScanSpecState = ReturnType<typeof useScanSpec>;

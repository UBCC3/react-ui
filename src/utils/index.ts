import { ComplexNumber, Job } from "../types";
import { filterJobs } from "./filterJobs";

export const capitalizeFirstLetter = (str: string) => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatComplex = (c: ComplexNumber) => {
	const { real, imag } = c;

	if (real === 0 && imag === 0) {
		return "0";
	}
	if (imag === 0) {
		return `${real.toFixed(2)}`;
	}
	if (real === 0) {
		return `-${imag.toFixed(2)}`;
	}

	const sign = imag >= 0 ? "+" : "-";
	return `${real.toFixed(2)} ${sign} ${Math.abs(imag).toFixed(2)}i`;
};

/**
 * Convert Psi4's ASCII-safe symmetry labels (e.g. "Ap", "App") into their
 * proper typographic form (e.g. "A'", "A"") for display.
 */
export const formatSymmetryLabel = (label: string): string => {
	if (label === "None") {
		return label;
	} else if (label.endsWith("pp")) {
		return `${label.slice(0, -2)}"`;
	} else if (label.endsWith("p")) {
		return `${label.slice(0, -1)}'`;
	} else {
		return label;
	}
};

// Reversing the mapping of a dict object
export const reverseMapping = (obj: Record<string, string>): Record<string, string> =>
	Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));

export { filterJobs };

import { ComplexNumber } from "../types";
import { filterJobs } from "./filterJobs";

export const capitalizeFirstLetter = (str: string) => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatRuntime = (seconds: number | null | undefined): string => {
	if (seconds == null) return "unavailable";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
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

/** Image types a stored structure thumbnail is allowed to be rendered as. */
const ALLOWED_THUMBNAIL_MEDIA_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
]);

/**
 * Builds a data URL for a structure thumbnail, or null if there isn't one.
 *
 * The stored media type comes from the uploader's Content-Type header and the
 * backend does not validate it, so a value like "text/html" would otherwise
 * execute in this origin when used as a data URL. Anything outside the image
 * allowlist is coerced to image/png, which simply fails to decode instead.
 */
export const structureThumbnailDataUrl = (
	thumbnail?: { media_type: string; base64: string } | null,
): string | null => {
	if (!thumbnail?.base64) return null;
	const mediaType = ALLOWED_THUMBNAIL_MEDIA_TYPES.has(thumbnail.media_type)
		? thumbnail.media_type
		: "image/png";
	return `data:${mediaType};base64,${thumbnail.base64}`;
};

export { filterJobs };

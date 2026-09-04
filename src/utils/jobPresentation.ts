import { calculationTypes } from "../constants";
import type { Job } from "../types";

const calculationTypeLabels = Object.fromEntries(
	Object.entries(calculationTypes).map(([label, value]) => [value, label]),
) as Record<string, string>;

/**
 * Returns a stable user-facing calculation label for every backend value.
 * Unknown future values remain visible instead of rendering an empty label.
 */
export const formatCalculationType = (calculationType: string): string => {
	const knownLabel = calculationTypeLabels[calculationType];
	if (knownLabel) return knownLabel;

	return calculationType
		.split(/[_-]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
};

/** The archive endpoint can succeed only after the backend records an upload. */
export const isJobArchiveAvailable = (job: Job): boolean =>
	job.archive_uploaded === true && job.archive_upload_status === "uploaded";

/** Keep the real scheduler status while making an in-progress cancellation visible. */
export const hasPendingCancellation = (job: Job): boolean =>
	job.cancel_requested &&
	job.status !== "completed" &&
	job.status !== "failed" &&
	job.status !== "cancelled";

import type { Job } from "../types";

export interface JobEditSnapshot {
	jobId: string;
	jobName: string;
	jobNotes: string;
	tags: string[];
}

/** Capture the editable values once, when an edit session starts. */
export const createJobEditSnapshot = (job: Job): JobEditSnapshot => ({
	jobId: job.job_id,
	jobName: job.job_name ?? "",
	jobNotes: job.job_notes ?? "",
	tags: [...(job.tags ?? [])],
});

/** A polling update for the same job must not replace the user's draft. */
export const shouldSeedJobEditDraft = (
	open: boolean,
	currentJobId: string | null,
	incomingJobId: string | null,
): boolean => open && incomingJobId !== null && currentJobId !== incomingJobId;

/** Order-insensitive comparison, matching the backend's case-insensitive tag matching. */
export const haveSameJobTags = (a: string[], b: string[]): boolean => {
	if (a.length !== b.length) return false;
	const normalise = (tags: string[]) => tags.map((tag) => tag.toLowerCase()).sort();
	const [left, right] = [normalise(a), normalise(b)];
	return left.every((tag, index) => tag === right[index]);
};

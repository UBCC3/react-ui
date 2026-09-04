export type JobsTableContentState = "loading" | "empty" | "ready";

/** Loading takes precedence over the empty state until the first request finishes. */
export const getJobsTableContentState = (
	loading: boolean,
	visibleJobCount: number,
): JobsTableContentState => {
	if (visibleJobCount > 0) return "ready";
	return loading ? "loading" : "empty";
};

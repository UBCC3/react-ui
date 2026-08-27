import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { fetchJobResult } from "../services/api";

const WORKFLOW_KEYS = [
	"geometric optimization",
	"molecular orbitals",
	"vibrational frequencies",
	"bond angle scan",
] as const;
type WorkflowSection = (typeof WORKFLOW_KEYS)[number];

/**
 * Fetches a job's stored result and, if it uses the combined workflow schema
 * (one payload containing multiple calculation sections), extracts the section
 * relevant to this viewer via `workflowSection`. Standard (non-workflow)
 * results, or callers that omit `workflowSection`, get the payload back as-is.
 *
 * Results are read from the database through the jobs API rather than fetched
 * from S3, so callers pass a job ID instead of a presigned URL.
 */
export function useJobResult(
	jobId: string,
	workflowSection?: WorkflowSection,
	onError?: (message: string) => void,
) {
	const { getAccessTokenSilently } = useAuth0();

	const [result, setResult] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!jobId) return;

		// Guards against a late response overwriting state after the viewer has
		// moved to a different job.
		let cancelled = false;

		const reportFailure = (message: string) => {
			if (cancelled) return;
			setError(message);
			onError?.(message);
		};

		const loadResult = async () => {
			setLoading(true);
			setError(null);
			setResult(null);

			try {
				const token = await getAccessTokenSilently();
				const response = await fetchJobResult(jobId, token);
				if (cancelled) return;

				if (response.error) {
					reportFailure(response.error);
					return;
				}

				const payload = response.data?.result;
				if (!workflowSection) {
					setResult(payload);
					return;
				}

				const isWorkflowSchema = Object.keys(payload ?? {}).some((key) =>
					(WORKFLOW_KEYS as readonly string[]).includes(key),
				);
				const sectionResult = isWorkflowSchema ? (payload as any)[workflowSection] : payload;

				if (!sectionResult || sectionResult === "Error") {
					reportFailure("This calculation's results are missing or failed to process");
					return;
				}

				setResult(sectionResult);
			} catch (err) {
				console.error("Failed to fetch job details or results", err);
				reportFailure("Failed to fetch job details or results");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		loadResult();

		return () => {
			cancelled = true;
		};
	}, [jobId, workflowSection, getAccessTokenSilently]);

	return { result, loading, error };
}

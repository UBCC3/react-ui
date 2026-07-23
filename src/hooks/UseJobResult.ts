import { useEffect, useState } from "react";
import { fetchRawFileFromS3Url } from "../components/JSmol/util";

const WORKFLOW_KEYS = [
	"geometric optimization",
	"molecular orbitals",
	"vibrational frequencies",
] as const;
type WorkflowSection = (typeof WORKFLOW_KEYS)[number];

/**
 * Fetches a job's result JSON and, if it uses the combined workflow schema
 * (one file containing multiple calculation sections), extracts the section
 * relevant to this viewer via `workflowSection`. Standard (non-workflow)
 * results, or callers that omit `workflowSection`, get the raw JSON back
 * as-is.
 */
export function useJobResult(
	resultURL: string,
	workflowSection?: WorkflowSection,
	onError?: (message: string) => void,
) {
	const [result, setResult] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		setError(null);
		setResult(null);

		fetchRawFileFromS3Url(resultURL, "json")
			.then((res) => {
				if (!workflowSection) {
					setResult(res);
					return;
				}
				const isWorkflowSchema = Object.keys(res).some((k) =>
					(WORKFLOW_KEYS as readonly string[]).includes(k),
				);
				const sectionResult = isWorkflowSchema ? (res as any)[workflowSection] : res;

				if (!sectionResult || sectionResult === "Error") {
					const message = "This calculation's results are missing or failed to process";
					setError(message);
					onError?.(message);
					return;
				}
			})
			.catch((err) => {
				const message = "Failed to fetch job details or results";
				setError(message);
				onError?.(message);
				console.error(message, err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [resultURL, workflowSection]);

	return { result, loading, error };
}

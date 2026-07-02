import { useEffect, useState } from "react";
import { fetchRawFileFromS3Url } from "../components/JSmol/util";

const WORKFLOW_KEYS = ['geometric optimization', 'molecular orbitals', 'vibrational frequencies'] as const;
type WorkflowSection = typeof WORKFLOW_KEYS[number];

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

    useEffect(() => {
        setLoading(true);
        fetchRawFileFromS3Url(resultURL, 'json').then((res) => {
            if (!workflowSection) {
                setResult(res);
                return;
            }
            const isWorkflowSchema = Object.keys(res).some(k => (WORKFLOW_KEYS as readonly string[]).includes(k));
            setResult(isWorkflowSchema ? (res as any)[workflowSection] : res);
        }).catch((err) => {
            onError?.("Failed to fetch job details or results");
            console.error("Failed to fetch job details or results", err);
        }).finally(() => {
            setLoading(false);
        });
    }, [resultURL, workflowSection]);

    return { result, loading };
}
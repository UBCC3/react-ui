import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { fetchJobArtifact } from "../services/api";
import { containsJmolDataTerminator } from "../components/JSmol/util";
import type { JobArtifactKind } from "../types";

/**
 * Fetches the text of one job artifact, such as a trajectory or a molden file.
 *
 * Artifacts are served from an authenticated endpoint, so they cannot be handed
 * to JSmol as a URL the way presigned S3 links could be. Callers read the text
 * here and pass it to useJsmolViewer as `files`, which seeds Jmol's file cache
 * so `load FILES` resolves without a request.
 */
export function useJobArtifact(
	jobId: string,
	kind: JobArtifactKind,
	onError?: (message: string) => void,
) {
	const { getAccessTokenSilently } = useAuth0();

	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!jobId) return;

		// Guards against a late response overwriting state after the viewer has
		// moved to a different job or artifact.
		let cancelled = false;

		const reportFailure = (message: string) => {
			if (cancelled) return;
			setError(message);
			onError?.(message);
		};

		const loadArtifact = async () => {
			setLoading(true);
			setError(null);
			setContent(null);

			try {
				const token = await getAccessTokenSilently();
				const response = await fetchJobArtifact(jobId, kind, token);
				if (cancelled) return;

				if (response.error) {
					reportFailure(response.error);
					return;
				}

				const artifact = response.data as string;

				// Content is embedded in a `load DATA` block, so a line that closes
				// the block early would let the rest run as Jmol script. Refuse it
				// rather than sanitising; a partial strip can still leave a working
				// terminator.
				if (containsJmolDataTerminator(artifact)) {
					reportFailure(`The ${kind} file could not be displayed safely.`);
					return;
				}

				setContent(artifact);
			} catch (err) {
				console.error(`Failed to fetch the ${kind} artifact`, err);
				reportFailure(`Failed to fetch the ${kind} file`);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		loadArtifact();

		return () => {
			cancelled = true;
		};
	}, [jobId, kind, getAccessTokenSilently]);

	return { content, loading, error };
}

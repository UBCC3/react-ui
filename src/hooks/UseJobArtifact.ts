import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { fetchJobArtifact } from "../services/api";
import { containsJmolDataTerminator } from "../components/JSmol/util";
import type { JobArtifactKind } from "../types";

/**
 * Fetches one job artifact and exposes it as a same-origin object URL.
 *
 * Artifacts are served from an authenticated endpoint, so JSmol cannot fetch
 * them itself. Rather than embedding the text in a load script, this reads the
 * artifact with the bearer token and republishes it as a blob URL, so callers
 * pass JSmol a URL and untrusted file content never becomes part of a script.
 *
 * The URL is revoked when the artifact changes or the caller unmounts.
 */
export function useJobArtifact(
	jobId: string,
	kind: JobArtifactKind,
	onError?: (message: string) => void,
) {
	const { getAccessTokenSilently } = useAuth0();

	const [url, setUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!jobId) return;

		// Guards against a late response overwriting state after the viewer has
		// moved to a different job or artifact.
		let cancelled = false;
		let objectUrl: string | null = null;

		const reportFailure = (message: string) => {
			if (cancelled) return;
			setError(message);
			onError?.(message);
		};

		const loadArtifact = async () => {
			setLoading(true);
			setError(null);
			setUrl(null);

			try {
				const token = await getAccessTokenSilently();
				const response = await fetchJobArtifact(jobId, kind, token);
				if (cancelled) return;

				if (response.error) {
					reportFailure(response.error);
					return;
				}

				const artifact = response.data as string;

				// Belt and braces. Content no longer reaches a load script, so this
				// cannot currently be exploited, but `input` is a user-uploaded file
				// and the backend only checks it is non-empty UTF-8 without NUL.
				// Refusing here means a future change that reintroduces script
				// embedding cannot silently become injectable.
				if (containsJmolDataTerminator(artifact)) {
					reportFailure(`The ${kind} file could not be displayed safely.`);
					return;
				}

				objectUrl = URL.createObjectURL(new Blob([artifact], { type: "text/plain" }));
				setUrl(objectUrl);
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
			// Blob URLs pin their data until revoked.
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [jobId, kind, getAccessTokenSilently]);

	return { url, loading, error };
}

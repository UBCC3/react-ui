import type { JobArtifactKind } from "../../types";

/**
 * Matches a line that would close a JSmol `load DATA` block.
 *
 * Jmol ends inline data at a line of the form `end "label"`, so any such line
 * inside embedded content would terminate the block early and let whatever
 * follows run as Jmol script. The label is deliberately not pinned to the one
 * we emit, so a crafted label cannot slip past.
 */
const JMOL_DATA_TERMINATOR = /^[ \t]*end[ \t]+"[^"]*"[ \t]*;?[ \t]*$/im;

/**
 * Whether artifact text would be unsafe to embed in a JSmol `load DATA` block.
 *
 * Artifacts now reach Jmol through its file cache rather than a load script, so
 * this is not currently reachable as an exploit. It is retained because `input`
 * is a user-uploaded file the backend only validates as non-empty UTF-8 without
 * NUL bytes, and any future return to inline `load DATA` would otherwise be
 * injectable. Callers must refuse content this rejects rather than stripping
 * it: a partial strip can still leave a working terminator.
 */
export const containsJmolDataTerminator = (content: string): boolean =>
	JMOL_DATA_TERMINATOR.test(content);

/**
 * Filename JSmol should see for each artifact kind.
 *
 * The extension is how Jmol chooses a reader, so these mirror the names the
 * backend serves in its Content-Disposition header. They double as the keys
 * artifact text is stored under in Jmol's file cache.
 */
export const JMOL_ARTIFACT_FILENAMES: Record<JobArtifactKind, string> = {
	input: "input.xyz",
	trajectory: "trajectory.xyz",
	vib: "vib.xyz",
	molden: "orbitals.molden",
	esp: "ESP.cube",
};

/**
 * Build a `load FILES` script for one or more cached artifact filenames.
 *
 * Inline `load DATA` cannot express more than one model: `load APPEND DATA` and
 * the literal `append` label both replace the current model rather than adding
 * to it. `load FILES` does create one model per file, and reaches the cache
 * rather than the network, so it is how OrbitalViewer gets its molden as model
 * 1 and its ESP cube as model 2.
 */
export const jmolLoadFilesScript = (...filenames: string[]): string =>
	`load FILES ${filenames.map((name) => `"${name}"`).join(" ")};`;

/**
 * Fetch a raw file from an S3 presigned URL.
 *
 * The caller can choose how the response should be parsed by setting
 * `responseType` to `"blob"`, `"text"`, or `"json"`. This is useful because
 * result files may be downloaded as binary files, plain text logs, or parsed
 * JSON result objects.
 *
 * @typeParam T - Exxpected retur type after parsing the response.
 * @param url - Presigned S3 URL or accessible file URL to fetch.
 * @param responseType - Format used to parse the response body. Defaults to `"blob"`.
 * @returns Parsed response data, or an error object containing status and message.
 */
export async function fetchRawFileFromS3Url<T = Blob | string | JSON>(
	url: string,
	responseType: "json" | "blob" | "text" = "blob",
): Promise<T | { status: number; error: string }> {
	try {
		const res: Response = await fetch(url, { method: "GET" });
		if (!res.ok) {
			return {
				status: res.status,
				error: res.statusText,
			};
		}

		switch (responseType) {
			case "blob": {
				const blob = await res.blob();
				return blob as T;
			}
			case "text": {
				const text = await res.text();
				return text as T;
			}
			case "json": {
				const json = await res.json();
				return json as T;
			}
		}
	} catch (error: any) {
		console.error(`Failed to fetch presigned urls ${url}. Error:\n`, error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

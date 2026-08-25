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
 * `input` is a user-uploaded file that the backend only validates as non-empty
 * UTF-8 without NUL bytes, so its content reaches jmolInlineLoadScript
 * unsanitised. Callers must refuse content this rejects rather than stripping
 * it: a partial strip can still leave a working terminator.
 */
export const containsJmolDataTerminator = (content: string): boolean =>
	JMOL_DATA_TERMINATOR.test(content);

/**
 * Wrap artifact text in a JSmol `load DATA` block.
 *
 * Job artifacts are served from an authenticated endpoint, so JSmol cannot
 * fetch them by URL the way it did with presigned S3 links. Embedding the
 * content in the load script is the supported alternative.
 *
 * @param name - Block label. Only has to be unique within the script.
 * @param content - Raw artifact text, such as an xyz or molden file.
 * @param append - Add the content as another model instead of replacing the
 *   current one. Use this to reproduce a multi-file `load FILES`, where model
 *   order determines which frame each file becomes.
 */
export const jmolInlineLoadScript = (
	name: string,
	content: string,
	{ append = false }: { append?: boolean } = {},
): string => `load ${append ? "APPEND " : ""}DATA "${name}"\n${content}\nend "${name}";`;

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

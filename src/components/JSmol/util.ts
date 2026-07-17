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

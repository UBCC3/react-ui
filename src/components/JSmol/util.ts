
export async function fetchRawFileFromS3Url<T = Blob | string | JSON>(
	url: string,
	responseType: 'json' | 'blob' | 'text' = 'blob',
):Promise<T | {status: number, error: string}> {
	try {
		const res:Response = await fetch(url, {method: 'GET'});
		if (!res.ok) {
			return {
				status:res.status,
				error: res.statusText,
			}
		}

		switch (responseType) {
			case 'blob':
				const blob = await res.blob();
				return blob as T;
			case 'text':
				const text = await res.text();
				return text as T;
			case 'json':
				const json = await res.json();
				return json as T;
		}
	} catch (error: any) {
		console.error(`Failed to fetch presigned urls ${url}. Error:\n`, error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}
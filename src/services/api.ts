import axios from 'axios';
import { Response } from '../types'

export const createBackendAPI = (
	token: any
) => {
	return axios.create({
		baseURL: import.meta.env.VITE_STORAGE_API_URL,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

export const createClusterAPI = (
	token: any
) => {
	return axios.create({
		baseURL: import.meta.env.VITE_API_URL,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

export const getJobStatusBySlurmID = async (
	slurmId: string,
	token: any
): Promise<Response> => {
	try {
		const API = createClusterAPI(token);
		const response = await API.get(`/status/${slurmId}`);
		if (response.status !== 200) {
			throw new Error(`HTTP ${response.status}`);
		}
		const { status } = response.data;
		return {
			status: response.status,
			data: status,
		};
	} catch (error) {
		console.error("Failed to fetch job status", error);
		return {
			status: 500,
			error: `Failed to fetch job status: ${error.message}`,
		};
	}
};

export const submitStandardAnalysis = async (
	jobName: string,
	file: File | Blob,
	charge: number,
	multiplicity: number,
	structure_id: string,
	token: any
): Promise<Response> => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("job_name", jobName);
	formData.append("charge", charge.toString());
	formData.append("multiplicity", multiplicity.toString());
	formData.append("structure_id", structure_id);
	try {
		const API = createClusterAPI(token);
		const response = await API.post("/upload_submit/", formData);
		return {
			status: response.status,
			data: response.data,
		};
	} catch (error) {
		console.error("Standard analysis submission failed", error);
		return {
			status: 500,
			error: `Failed to submit job: ${error.message}`,
		};
	}
};

export const addJobToDB = async (
	jobName: string,
	method: string,
	basis_set: string,
	calculation_type: string,
	charge: number,
	multiplicity: number,
	file: File | Blob,
	structure_id: string,
	slurm_id: string,
	token: string
): Promise<Response> => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("job_name", jobName);
	formData.append("method", method);
	formData.append("basis_set", basis_set);
	formData.append("calculation_type", calculation_type);
	formData.append("charge", charge.toString());
	formData.append("multiplicity", multiplicity.toString());
	formData.append("structure_id", structure_id);
	formData.append("slurm_id", slurm_id);

	try {
		const API = createBackendAPI(token);
		const response = await API.post("/add_job/", formData);
		return {
			status: response.status,
			data: response.data,
		};
	} catch (error) {
		console.error("Job submission failed", error);
		return {
			status: 500,
			error: `Failed to submit job: ${error.message}`,
		}
	}
};

export const updateJobStatus = async (
	jobId: string, 
	status: string,
	token: any,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.post(`/update_status/${jobId}/${status}`);
		return {
			status: res.status,
			data: res.data,
		};
	} catch (error) {
		console.error("Failed to fetch job details", error);
		return {
			status: 500,
			error: `Failed to update job status: ${error.message}`,
		};
	}
}

export const AddAndUploadStructureToS3 = async (
	file: File | Blob,
	name: string,
	token: any,
): Promise<Response> => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("name", name);

	try {
		const API = createBackendAPI(token);
		const response = await API.post("/structures/", formData);
		return {
			status: response.status,
			data: response.data,
		}
	} catch (error) {
		console.error("Structure submission failed", error);
		return {
			status: 500,
			error: `Failed to submit structure: ${error.message}`,
		}
	}
};

export const getAllJobs = async (
	token: any
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/jobs/");
		return {
			status: res.status,
			data: res.data,
		}
	} catch (error) {
		console.error("Failed to fetch jobs", error);
		return {
			status: 500,
			error: `Failed to fetch jobs: ${error.message}`,
		}
	}
};

export const getStructureDataFromS3 = async (
	structureId: string,
	token: any,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/presigned/${structureId}`);
		if (res.status !== 200) {
			throw new Error(`HTTP ${res.status}`);
		}
		const { url } = res.data;
		const fileRes = await fetch(url);
		const text = await fileRes.text();
		return {
			status: fileRes.status,
			data: text,
		}
	} catch (error) {
		console.error("Failed to fetch structure from S3", error);
		return {
			status: 500,
			error: `Failed to fetch structure from S3: ${error.message}`,
		}
	}
};

export const getLibraryStructures = async (
	token: any,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/structures/");
		return {
			status: res.status,
			data: res.data,
		}
	} catch (error) {
		console.error("Failed to fetch structures", error);
		return {
			status: 500,
			error: `Failed to fetch structures: ${error.message}`,
		};
	}
}

export const getJobByJobID = async (
	jobId: string, 
	token: any,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const response = await API.get(`/jobs/${jobId}`);
		return {
			status: response.status,
			data: response.data,
		};
	} catch (error) {
		console.error("Failed to fetch job details", error);
		return {
			status: 500,
			error: `Failed to fetch job details: ${error.message}`,
		};
	}
}

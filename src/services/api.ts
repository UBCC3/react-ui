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

export const cancelJobBySlurmID = async (
	slurmId: string,
	token: any
): Promise<Response> => {
	try {
		const API = createClusterAPI(token);
		const response = await API.post(`/cancel/${slurmId}`);
		if (response.status !== 200) {
			throw new Error(`HTTP ${response.status}`);
		}
		const success = response.data.success;
		return {
			status: response.status,
			data: success.toLowerCase(),
		};
	} catch (error) {
		console.error("Failed to cancel the job", error);
		return {
			status: 500,
			error: `Failed to cancel the job: ${error.message}`,
		};
	}
}

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
		const { state } = response.data;
		return {
			status: response.status,
			data: state.toLowerCase(),
		};
	} catch (error) {
		console.error("Failed to fetch job status", error);
		return {
			status: 500,
			error: `Failed to fetch job status: ${error.message}`,
		};
	}
};

export const submitAdvancedAnalysis = async (
	file: File | Blob,
	calculationType: string,
	method: string,
	basisSet: string,
	charge: number,
	multiplicity: number,
	token: any,
	keywords?: File,
): Promise<Response> => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("calculation_type", calculationType);
	formData.append("method", method);
	formData.append("basis_set", basisSet);
	formData.append("charge", charge.toString());
	formData.append("multiplicity", multiplicity.toString());
	if (keywords !== undefined) {
		formData.append("keywords", keywords);
	}
	try {
		const API = createClusterAPI(token); // No token needed for this endpoint
		const response = await API.post("/run_advance_analysis/", formData);
		return {
			status: response.status,
			data: response.data,
		};
	} catch (error) {
		console.error("Advanced analysis submission failed", error);
		return {
			status: 500,
			error: `Failed to submit advanced analysis: ${error.message}`,
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

export const AddAndUploadStructureToS3 = async (
	file: File | Blob,
	name: string,
	notes: string,
	token: any,
	tags: string[] = [],
): Promise<Response> => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("name", name);
	formData.append("notes", notes);
	if (tags && tags.length > 0) {
		tags.forEach(tag => formData.append("tags", tag));
	}

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

export const getStructureDataFromS3 = async (
	structureId: string,
	token: any,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/structures/presigned/${structureId}`);
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

export const getStructureById = async (
	structureId: string,
	token: any,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/structures/${structureId}`);
		return {
			status: res.status,
			data: res.data,
		}
	} catch (error) {
		console.error("Failed to fetch structure details", error);
		return {
			status: 500,
			error: `Failed to fetch structure details: ${error.message}`,
		};
	}
};

export const updateStructure = async (
	structureId: string,
	name: string,
	notes: string,
	token: any,
	tags: string[] = [],
): Promise<Response> => {
	const formData = new FormData();
	formData.append("name", name);
	formData.append("notes", notes);
	if (tags && tags.length > 0) {
		tags.forEach(tag => formData.append("tags", tag));
	}

	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/structures/${structureId}`, formData);
		return {
			status: res.status,
			data: res.data,
		};
	} catch (error) {
		console.error("Failed to update structure", error);
		return {
			status: 500,
			error: `Failed to update structure: ${error.message}`,
		};
	}
};

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

// API endpoints for job-related operations
export const getAllJobs = async (token: string): Promise<Response> => {
  try {
    const API = createBackendAPI(token);
    const res = await API.get('/jobs/');
    return { status: res.status, data: res.data };
  } catch (error: any) {
    console.error('Failed to fetch jobs', error);
    return {
      status: error.response?.status || 500,
      error: error.response?.data?.detail || error.message,
    };
  }
};

export const getJobById = async (
	jobId: string,
	token: string
): Promise<Response> => {
  try {
    const API = createBackendAPI(token);
    const res = await API.get(`/jobs/${jobId}`);
    return { status: res.status, data: res.data };
  } catch (error: any) {
    console.error('Failed to fetch job details', error);
    return {
      	status: error.response?.status || 500,
      	error: error.response?.data?.detail || error.message,
    };
  }
};

export const fetchJobResults = async (
	jobId: string,
	token: string
): Promise<Response> => {
	try {
		const API = createClusterAPI(token);
		const res = await API.get(`/result/${jobId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch job results', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

export const fetchJobError = async (
	jobId: string,
	token: string
): Promise<Response> => {
	try {
		const API = createClusterAPI(token);
		const res = await API.get(`/error/${jobId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch job error', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

export const createJob = async (
	file: File | Blob,
	jobId: string,
	jobName: string,
	jobNotes: string | null,
	method: string,
	basisSet: string,
	calculationType: string,
	charge: number,
	multiplicity: number,
	structureId: string | null,
	slurmId: string | null,
	token: string
): Promise<Response> => {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('job_id', jobId);
	formData.append('job_name', jobName);
	formData.append('method', method);
	formData.append('basis_set', basisSet);
	formData.append('calculation_type', calculationType);
	formData.append('charge', charge.toString());
	formData.append('multiplicity', multiplicity.toString());
	if (structureId) formData.append('structure_id', structureId);
	if (slurmId) formData.append('slurm_id', slurmId);
	if (jobNotes) formData.append('job_notes', jobNotes);

	try {
		const API = createBackendAPI(token);
		const res = await API.post('/jobs/', formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Job submission failed', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

export const updateJobStatus = async (
	jobId: string,
	status: 'pending' | 'running' | 'completed' | 'failed',
	token: string
): Promise<Response> => {
	try {
		console.log('Updating job status:', { jobId, status });
		const API = createBackendAPI(token);
		const res = await API.patch(`/jobs/${jobId}/${status}`);
		console.log('Job status updated successfully', res);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to update job status', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

export const getCalculationTypes = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/enums/calculation_types/');
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch calculation types', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

export const getWavefunctionMethods = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/enums/wave_functional_theories/');
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch wavefunction methods', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

export const getDensityFunctionalMethods = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/enums/density_functional_theories/');
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch density functional methods', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

export const getBasisSets = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/enums/basis_sets/');
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch basis sets', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

export const getMultiplicities = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/enums/multiplicities/');
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch multiplicities', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

export const getStructuresTags = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/structures/tags/');
		return { status: res.status, data: res.data };
	}
	catch (error: any) {
		console.error('Failed to fetch structures tags', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

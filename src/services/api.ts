import axios from 'axios';
import { Response } from '../types'
import job from "../types/Job";

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
		const raw = response.data.state as string;
		const parsed = JSON.parse(raw) as {
			slurm_id: string;
			state: string;
			elapsed: string;
		};

		return {
			status: response.status,
			data: {
				slurm_id: parsed.slurm_id,
				state: parsed.state.toLowerCase(),
				elapsed: parsed.elapsed,
			},
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
	// formData.append("job_name", jobName);
	formData.append("charge", charge.toString());
	formData.append("multiplicity", multiplicity.toString());
	// formData.append("structure_id", structure_id);
	try {
		const API = createClusterAPI(token);
		const response = await API.post("/run_standard_analysis/", formData);
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

function dataURLToBlob(dataURL) {
	const parts = dataURL.split(',');
	const mime = parts[0].match(/:(.*?);/)[1];
	const binary = atob(parts[1]);
	let array = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		array[i] = binary.charCodeAt(i);
	}
	return new Blob([array], { type: mime });
}

export const AddAndUploadStructureToS3 = async (
	file: File | Blob,
	name: string,
	formula: string,
	notes: string,
	image: string,
	token: any,
	tags: string[] = [],
): Promise<Response> => {
	console.log('Adding and uploading structure to S3:', { name, formula, notes, tags });
	const imageBlob = dataURLToBlob(image);
	const formData = new FormData();
	formData.append("file", file);
	formData.append("name", name);
	formData.append("formula", formula);
	formData.append("notes", notes);
	if (tags && tags.length > 0) {
		tags.forEach(tag => formData.append("tags", tag));
	}
	formData.append("image", imageBlob, `image.png`);
	console.log('Form data prepared for structure upload:', formData);
	console.log('Token for API:', token);
	try {
		const API = createBackendAPI(token);
		console.log('Uploading structure to S3 here');
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
	formula: string,
	notes: string,
	token: any,
	tags: string[] = [],
): Promise<Response> => {
	const formData = new FormData();
	formData.append("name", name);
	formData.append("formula", formula);
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

export const fetchJobResultFiles = async (
	token: string,
	jobId: string,
	calculation: string,
	status: string
):Promise<Response> => {
	try {
		const API = createClusterAPI(token);
		const res = await API.get(`/files/${jobId}/${calculation}/${status}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch presigned job file urls', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

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
	token: string,
	tags: string[] = []
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
	tags.forEach(tag => formData.append('tags', tag));

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

interface UpdateJobResponse {
  job_id: string;
  runtime: string;    // if you’re using INTERVAL it’ll come back as "HH:MM:SS"
  state: string;
  message?: string;
}

export const deleteJob = async (
	jobId: string,
	token: string
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.delete(`/jobs/${jobId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to delete job', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

export const deleteStructure = async (
	structureId: string,
	token: string
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.delete(`/structures/${structureId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to delete structure', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

export const updateJob = async (
	jobId: string,
	state: string,
	runtime: string,
	token: string
): Promise<UpdateJobResponse> => {
	console.log('Updating job:', { jobId, state, runtime });
	const formData = new FormData();
	formData.append('state', state);
	formData.append('runtime', runtime);
	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/jobs/${jobId}`, formData);
		return {
			job_id: res.data.job_id,
			runtime: res.data.runtime,
			state: res.data.state,
			message: res.data.message || '',
		};
	}
	catch (error: any) {
		console.error('Failed to update job', error);
		throw {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

export const updateJobRuntime = async (
	jobId: string,
	runtime: string,
	token: string
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/jobs/${jobId}/${runtime}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to update job runtime', error);
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

export const getChemicalFormula = async (
	file: File | Blob,
	token: string
): Promise<Response> => {
	const formData = new FormData();
	formData.append('file', file);

	try {
		const API = createBackendAPI(token);
		const res = await API.post('/structures/formula/', formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch chemical formula', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

export const getZipPresignedUrl= async (
	jobId: string,
	token: string,
): Promise<Response> => {
	try {
		const API = createClusterAPI(token);
		const res = await API.get(`/download/archive/${jobId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch presigned job file urls', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

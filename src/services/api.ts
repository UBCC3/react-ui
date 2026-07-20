import axios from 'axios';
import { Response } from '../types'

/**
 * Creates an Axios instance for the main backend API.
 * Uses the development URL from environment variables when running locally,
 * otherwise uses the production backend URL.
 */
export const createBackendAPI = (
	token: any
) => {
	return axios.create({
		baseURL: import.meta.env.VITE_MODE === 'development' ? import.meta.env.VITE_API_URL : "https://ubchemica.com/ubchemica/api",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

/**
 * Creates an Axios instance for cluster-related API calls.
 * This is used for operations such as submitting, cancelling, and checking jobs.
 */
export const createClusterAPI = (
	token: any
) => {
	return axios.create({
		baseURL: import.meta.env.VITE_MODE === 'development' ? import.meta.env.VITE_CLUSTER_API_URL : "https://ubchemica.com/ubchemica/api/cluster",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

/**
 * Creates an Axios instance for storage-related API calls.
 * This is used for downloading files, archives, and presigned URLs.
 */
export const createStorageAPI = (
	token: any
) => {
	return axios.create({
		baseURL: import.meta.env.VITE_MODE === 'development' ? import.meta.env.VITE_STORAGE_API_URL : "https://ubchemica.com/ubchemica/api/storage",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

/**
 * Fetches all jobs that belong to the current user's group.
 */
export const getCurrentUserGroupJobs = async (
	token: any
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/group/jobs/');
		return {
			status: res.status,
			data: res.data
		};
	} catch (error: any) {
		console.error('Failed to fetch jobs', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all members in the current user's group.
 */
export const getCurrentUserMembers = async (
	token: any
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/group/users/');
		return {
			status: res.status,
			data: res.data
		};
	} catch (error: any) {
		console.error('Failed to fetch members', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Creates or updates the currently authenticated user in the backend database.
 * The user's email is sent as form data.
 */
export const upsertCurrentUser = async (
	token: any,
	email: string
): Promise<Response> => {
	const formData = new FormData();
	formData.append('email', email);
	try {
		const API = createBackendAPI(token);
		const res = await API.post('/users/me', formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to sync user to our database:', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all groups from the admin endpoint.
 */
export const getAllGroups = async (token: any): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/admin/groups/');
		for (const group of res.data) {
			const members = group.members || [];
		}
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch groups', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches a specific group using its group ID.
 */
export const getGroupById = async (groupId: string, token: any): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/group/${groupId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch group by ID', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Updates the name of an existing group.
 */
export const updateGroupName = async (groupId: string, newName: string, token: any): Promise<Response> => {
	const formData = new FormData();
	formData.append("group_name", newName);
	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/group/${groupId}`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to update group name', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Creates a new group using the provided group name.
 */
export const createGroup = async (name: string, token: any): Promise<Response> => {
	const formData = new FormData();
	formData.append("name", name);
	try {
		const API = createBackendAPI(token);
		const res = await API.post('/admin/groups/', formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to create group', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Deletes a group by its own group ID.
 */
export const deleteGroup = async (token: any, groupId: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.delete(`/group/${groupId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to delete group', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all users from the admin endpoint.
 */
export const getAllUsers = async (token: any): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/admin/users/');
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch users', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches a user record using the user's email address.
 */
export const getUserByEmail = async (
	email: string,
	token: any
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/users/${email}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch user by email', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Deletes a user using their Auth0 user_sub value.
 */
export const deleteUser = async (token: any, userSub: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.delete(`/users/${userSub}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to delete user', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Updates a user's role and/or group assignment.
 * Only values that are provided are appended to the request body.
 */
export const updateUser = async (
	token: any,
	userSub: string,
	role?: string, 
	group_id?: string,
): Promise<Response> => {
	const formData = new FormData();
	if (role) formData.append("role", role);
	if (group_id) formData.append("group_id", group_id);
	try {
		console.log('Updating user:', { userSub, role, group_id });
		const API = createBackendAPI(token);
		const res = await API.put(`/admin/users/${userSub}`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to update user', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all jobs from the admin jobs endpoint.
 */
export const adminGetAllJobs = async (token: any): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/admin/jobs/');
		return { 
			status: res.status, 
			data: res.data 
		};
	} catch (error: any) {
		console.error('Failed to fetch jobs', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Cancels a running or queued cluster job using its SLURM ID.
 */
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

/**
 * Fetches the latest SLURM status for a job and normalizes the state to lowercase.
 */
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

/**
 * Submits an advanced analysis job to the cluster API.
 * The uploaded molecular file, calculation settings, and optional keyword file.
 * are sent as multipart form data.
 */
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
		const API = createClusterAPI(token);
		const response = await API.post("/run_advanced_analysis", formData);
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

/**
 * Submits a standard analysis job to the cluster API.
 * If the optimization type is transition state, the opt_type field is included.
 */
export const submitStandardAnalysis = async (
	jobName: string,
	file: File | Blob,
	charge: number,
	multiplicity: number,
	structure_id: string,
	token: any,
	opt_type? : 'ts' | 'ground',
): Promise<Response> => {
	const formData = new FormData();
	formData.append("file", file);
	// formData.append("job_name", jobName);
	formData.append("charge", charge.toString());
	formData.append("multiplicity", multiplicity.toString());
	// formData.append("structure_id", structure_id);

	if (opt_type !== undefined && opt_type === 'ts') {
		formData.append("opt_type", opt_type);
	}
	try {
		const API = createClusterAPI(token);
		const response = await API.post("/run_standard_analysis", formData);
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

/**
 * Converts a base64 data URL into a Blob object.
 * This is used to upload generated structure images as normal files.
 */
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

/**
 * Creates a new structure entry and uploads its related files to storage.
 * Includes the molecular file, metadata, tags, and preview image.
 */
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

/**
 * Requests a presigned URL for a structure file, then downloads the file content from S3.
 */
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

/**
 * Fetches all structures available in the current user's library.
 */
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

/**
 * Fetches metadata/details ffor one structure by structure ID.
 */
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

/**
 * Updates an existing structure's metadata, including name, formula, notes, and tags.
 */
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

/**
 * Fetches job details using the job ID.
 */
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
/**
 * Fetches all jobs visible to the current user.
 */
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

/**
 * Fetches details for a single job by job ID.
 */
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

/**
 * Fetches computed result metadata for a completed cluster job.
 */
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

/**
 * Fetches presigned URLs for files generated byb a specific job calculation.
 */
export const fetchJobResultFiles = async (
	token: string,
	jobId: string,
	calculation: string,
	status: string
):Promise<Response> => {
	try {
		const API = createStorageAPI(token);
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

/**
 * Fetches error output for a failed or problematic cluster job.
 */
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

/**
 * Creates a job record in the backend database.
 * This stores the job file, calculation settings, optional structure link,
 * SLURM ID, notes, and tags.
 */
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

/**
 * Updates a job's status using one of the allowed status values.
 */
export const updateJobStatus = async (
	jobId: string,
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'out_of_memory' | 'timeout',
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

/**
 * Deletes a ob record by job ID.
 */
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

/**
 * Deletes a structure record by structure ID.
 */
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

/**
 * Updates a job's state, runtime, and associated user in the backend.
 * Throws the error object instead of returning a Response when the request fails.
 */
export const updateJob = async (
	jobId: string,
	state: string,
	runtime: string,
	userSub: string,
	token: string
): Promise<UpdateJobResponse> => {
	console.log('Updating job:', { jobId, state, runtime });
	const formData = new FormData();
	formData.append('state', state);
	formData.append('runtime', runtime);
	formData.append('user_sub', userSub);
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

/**
 * Updates whether a job is public or private.
 */
export const updateVisibility = async (
	jobId: string,
	isPublic: boolean,
	token: string
): Promise<Response> => {
	try {
		const formData = new FormData();
		formData.append('is_public', isPublic.toString());
		const API = createBackendAPI(token);
		const res = await API.patch(`/jobs/${jobId}/visibility/`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to update job visibility', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Updates the stored runtime value for a job.
 */
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

/**
 * Fetches the list of supported calculation types from the backend enum endpoint.
 */
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

/**
 * Fetches the list of supported wavefunction theory methods.
 */
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

/**
 * Fetches the list of supported density functional theory methods.
 */
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

/**
 * Fetches the list of supported basis sets.
 */
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

/**
 * Fetches the list of supported spin multiplicities.
 */
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

/**
 * Fetches all tags that are currently used by structures.
 * This can be used for tag filtering, autocomplete, or displaying available structure categories.
 */
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

/**
 * Uploads a molecular structure file and asks the backend to extract or calculate
 * its chemical formula.
 */
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

/**
 * Requests a presigned URL for downloading a zipped archive of all result files
 * associated with a specific job.
 */
export const getZipPresignedUrl= async (
	jobId: string,
	token: string,
): Promise<Response> => {
	try {
		const API = createStorageAPI(token);
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

/**
 * Fetches all incoming group-related requests for the given user.
 */
export const getReceivedRequests = async (
	token: string,
    status: string = 'pending',
    requestType?: string,
    recentDays?: number,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
        const params: Record<string, string | number> = { status };
        if (requestType) params.request_type = requestType;
        if (recentDays !== undefined) params.recent_days = recentDays;
		const res = await API.get(`/request/received`, { params });
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch requests', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

/**
 * Fetches the list of supported optimization types from the backend enum endpoint.
 */
export const getOptimizationTypes = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get('/enums/optimization_types/');
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch optimization types', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
}

/**
 * Fetches all group-related requests sent by the given user.
 */
export const getSentRequests = async (
	token: string,
    status: string = 'pending',
    requestType?: string,
    recentDays?: number,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
        const params: Record<string, string | number> = { status };
        if (requestType) params.request_type = requestType;
        if (recentDays !== undefined) params.recent_days = recentDays;
		const res = await API.get(`/request/sent`, { params });
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to fetch sent requests', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Invites a user (by email) to the authenticated group admin's current group.
 */
export const sendInviteRequest = async (
    email: string,
    token: string,
    expiresInDays?: number,
): Promise<Response> => {
    const formData = new FormData();
    formData.append('email', email);
    if (expiresInDays !== undefined) formData.append('expires_in_days', String(expiresInDays));
    try {
        const API = createBackendAPI(token);
        const res = await API.post('/request/invite', formData);
        return { status: res.status, data: res.data };
    } catch (error: any) {
        console.error('Failed to send invite', error);
        return {
            status: error.response?.status || 500,
            error: error.response?.data?.detail || error.message,
        }
    }
}

/**
 * Approves an incoming request by request ID.
 */
export const approveRequest = async (
	requestId: string,
	token: string
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.put(`/request/${requestId}/approve/`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to approve request', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Rejects an incoming request by request ID.
 */
export const rejectRequest = async (
	requestId: string,
	token: string
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.put(`/request/${requestId}/reject/`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to reject request', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Deletes a request by request ID.
 */
export const deleteRequest = async (
	requestId: string,
	token: string
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.delete(`/request/${requestId}/`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error('Failed to delete request', error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Removes a user from the group. Group admins may remove members of their own group.
 */
export const removeGroupUser = async (
    userSub: string, 
    token: string
): Promise<Response> => {
    try {
        const API = createBackendAPI(token);
        const res = await API.delete(`/group/users/${userSub}`);
        return { status: res.status, data: res.data };
    } catch (error: any) {
        console.error('Failed to remove group user', error);
        return {
            status: error.response?.status || 500,
            error: error.response?.data?.detail || error.message,
        }
    }
}

/**
 * Transfers ownership of a job between user, group, or co-owned.
 */
export const updateJobOwnership = async (
    jobId: string,
    ownership: 'user' | 'group' | 'co-owned',
    token: string,
    userSub?: string,
    groupId?: string,
): Promise<Response> => {
    const formData = new FormData();
    formData.append('ownership', ownership);
    if (userSub) formData.append('user_sub', userSub);
    if (groupId) formData.append('group_id', groupId);
    try {
        const API = createBackendAPI(token);
        const res = await API.patch(`/group/jobs/${jobId}`, formData);
        return { status: res.status, data: res.data };
    } catch (error: any) {
        console.error('Failed to update job ownership', error);
        return {
            status: error.response?.status || 500,
            error: error.response?.data?.detail || error.message,
        }
    }
}

/**
 * Requests to join a group by group ID.
 */
export const joinGroupRequest = async (
    groupId: string,
    token: string,
    expiresInDays?: number
): Promise<Response> => {
    const formData = new FormData();
    formData.append('group_id', groupId);
    if (expiresInDays !== undefined) formData.append('expires_in_days', String(expiresInDays));
    try {
        const API = createBackendAPI(token);
        const res = await API.post('/request/join', formData);
        return { status: res.status, data: res.data };
    } catch (error: any) {
        console.error('Failed to send join request', error);
        return {
            status: error.response?.status || 500,
            error: error.response?.data?.detail || error.message,
        }
    }
}

/**
 * Requests to be removed from the authenticated user's current group.
 */
export const requestDemember = async (
    token: string,
    expiresInDays?: number,
): Promise<Response> => {
    const formData = new FormData();
    if (expiresInDays !== undefined) formData.append('expires_in_days', String(expiresInDays));
    try {
        const API = createBackendAPI(token);
        const res = await API.post('/request/demember', formData);
        return { status: res.status, data: res.data };
    } catch (error: any) {
        console.error('Failed to send de-member request', error);
        return {
            status: error.response?.status || 500,
            error: error.response?.data?.detail || error.message,
        }
    }
}

/**
 * Fetches requests for the authenticated admin/group admin's current group.
 */
export const getGroupRequests = async (
    token: string,
    status: string = 'pending',
    requestType?: string,
    recentDays?: number,
): Promise<Response> => {
    try {
        const API = createBackendAPI(token);
        const params: Record<string, string | number> = { status };
        if (requestType) params.request_type = requestType;
        if (recentDays !== undefined) params.recent_days = recentDays;
        const res = await API.get('/group/requests', { params });
        return { status: res.status, data: res.data};
    } catch (error: any) {
        console.error('Failed to fetch group requests', error);
        return {
            status: error.response?.status || 500,
            error: error.response?.data?.detail || error.message,
        }
    }
}

/**
 * Updates public/private visibility for a structure.
 */
export const updateStructureVisibility = async (
    structureId: string,
    isPublic: boolean,
    token: string,
): Promise<Response> => {
    const formData = new FormData();
    formData.append('is_public', String(isPublic));
    try {
        const API = createBackendAPI(token);
        const res = await API.patch(`/structures/${structureId}/visibility`, formData);
        return { status: res.status, data: res.data };
    } catch (error: any) {
        console.error('Failed to update structure visibility', error);
        return {
            status: error.response?.status || 500,
            error: error.response?.data?.detail || error.message,
        }
    }
}
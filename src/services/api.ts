import axios from "axios";
import { Group, Job, JobArtifactKind, Response, Structure } from "../types";
import { User } from "@auth0/auth0-react";
import { MAX_PAGE_SIZE } from "../constants";

type Paging = { limit?: number; offset?: number };

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Highest number of pages fetchAllPages will request before giving up.
 *
 * Only a safety bound: a server that ignored `offset` and always returned a
 * full page would otherwise loop forever. At MAX_PAGE_SIZE this is 100k rows.
 */
const MAX_PAGES = 1000;

/**
 * Pulls every page of a paginated list endpoint.
 *
 * A failure on any page fails the whole call. Returning the pages collected so
 * far as a success would silently drop the rest, and the caller has no way to
 * tell a complete list from a truncated one.
 *
 * `data` is always an array, even on failure. Callers store it straight into
 * array state, so a missing `data` would set that state to undefined and throw
 * on the next render. The error is still reported through `error`.
 */
async function fetchAllPages<T>(
	fetchPage: (paging: Required<Paging>) => Promise<Response>,
	pageSize = MAX_PAGE_SIZE,
): Promise<Response> {
	const all: T[] = [];
	let offset = 0;

	for (let requested = 0; requested < MAX_PAGES; requested++) {
		const res = await fetchPage({ limit: pageSize, offset });
		if (res.error) return { ...res, data: [] };

		const page = (res.data ?? []) as T[];
		all.push(...page);
		if (page.length < pageSize) return { status: 200, data: all };
		offset += pageSize;
	}

	return {
		status: 500,
		error: "The list was longer than expected and could not be loaded fully.",
		data: [],
	};
}

/**
 * Creates an Axios instance for the main backend API.
 * Uses the development URL from environment variables when running locally,
 * otherwise uses the production backend URL.
 */
export const createBackendAPI = (token: any) => {
	return axios.create({
		baseURL: import.meta.env.VITE_API_URL,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

/**
 * Creates an Axios instance for storage-related API calls.
 * This is used for downloading files, archives, and presigned URLs.
 */
export const createStorageAPI = (token: any) => {
	return axios.create({
		baseURL: import.meta.env.VITE_STORAGE_API_URL,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

/**
 * Fetches all jobs that belong to the current user's group.
 */
export const getCurrentUserGroupJobs = async (
	token: any,
	paging: Paging = {},
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/group/jobs", { params: paging });
		return {
			status: res.status,
			data: res.data,
		};
	} catch (error: any) {
		console.error("Failed to fetch jobs", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * All of the current user's group jobs, following pagination.
 */
export const getCurrentUserGroupJobsPaged = (token: string) =>
	fetchAllPages<Job>((p) => getCurrentUserGroupJobs(token, p));

/**
 * Fetches structures owned by the current user's group.
 */
export const getCurrentUserGroupStructures = async (
	token: any,
	paging: Paging = {},
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/group/structures", { params: paging });
		return {
			status: res.status,
			data: res.data,
		};
	} catch (error: any) {
		console.error("Failed to fetch group structures", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * All of the current user's group structures, following pagination.
 */
export const getCurrentUserGroupStructuresPaged = (token: string) =>
	fetchAllPages<Structure>((p) => getCurrentUserGroupStructures(token, p));

/**
 * Fetches all members in the current user's group.
 */
export const getCurrentUserMembers = async (token: any, paging: Paging = {}): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/group/users", { params: paging });
		return {
			status: res.status,
			data: res.data,
		};
	} catch (error: any) {
		console.error("Failed to fetch members", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * All of the user's group members, following pagination.
 */
export const getCurrentUserMembersPaged = (token: string) =>
	fetchAllPages<User>((p) => getCurrentUserMembers(token, p));

/**
 * Creates or updates the currently authenticated user in the backend database.
 * The user's email is sent as form data.
 */
export const upsertCurrentUser = async (token: any, email: string): Promise<Response> => {
	const formData = new FormData();
	formData.append("email", email);
	try {
		const API = createBackendAPI(token);
		const res = await API.post("/users/me", formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to sync user to our database:", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all groups from the admin endpoint.
 */
export const getAllGroups = async (token: any, paging: Paging = {}): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/admin/groups", { params: paging });
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch groups", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * All groups, following pagination.
 */
export const getAllGroupsPaged = (token: string) =>
	fetchAllPages<Group>((p) => getAllGroups(token, p));

/**
 * Fetches a specific group using its group ID.
 */
export const getGroupById = async (groupId: string, token: any): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/group/${groupId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch group by ID", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Updates the name of an existing group.
 */
export const updateGroupName = async (
	groupId: string,
	newName: string,
	token: any,
): Promise<Response> => {
	const formData = new FormData();
	formData.append("group_name", newName);
	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/group/${groupId}`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to update group name", error);
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
		const res = await API.post("/admin/groups", formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to create group", error);
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
		console.error("Failed to delete group", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all users from the admin endpoint.
 */
export const getAllUsers = async (token: any, paging: Paging = {}): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/admin/users", { params: paging });
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch users", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * All users, following pagination.
 */
export const getAllUsersPaged = (token: string) =>
	fetchAllPages<User>((p) => getAllUsers(token, p));

/**
 * Fetches a user record using the user's email address.
 */
export const getUserByEmail = async (email: string, token: any): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/users/${email}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch user by email", error);
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
		console.error("Failed to delete user", error);
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
		const API = createBackendAPI(token);
		const res = await API.put(`/admin/users/${userSub}`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to update user", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all jobs from the admin jobs endpoint.
 */
export const adminGetAllJobs = async (token: any, paging: Paging = {}): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/admin/jobs", { params: paging });
		return {
			status: res.status,
			data: res.data,
		};
	} catch (error: any) {
		console.error("Failed to fetch jobs", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * All jobs, following pagination.
 */
export const adminGetAllJobsPaged = (token: string) =>
	fetchAllPages<Job>((p) => adminGetAllJobs(token, p));

/**
 * Cancels a running or queued cluster job using its SLURM ID.
 */
export const cancelJob = async (jobId: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const response = await API.post(`/jobs/${jobId}/cancel`);
		return {
			status: response.status,
			data: response.data,
		};
	} catch (error: any) {
		console.error("Failed to cancel the job", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Submits a standard-analysis job. The backend uploads to the cluster and
 * advances the job status in the background.
 */
export const submitStandardAnalysisJob = async (
	token: string,
	params: {
		file?: File | Blob;
		structureId?: string;
		charge: number;
		multiplicity: number;
		optimizationType?: "ground" | "ts";
		jobName: string;
		jobNotes?: string;
		tags?: string[];
	},
): Promise<Response> => {
	const formData = new FormData();
	if (params.file) formData.append("file", params.file);
	if (params.structureId) formData.append("structure_id", params.structureId);
	formData.append("charge", String(params.charge));
	formData.append("multiplicity", String(params.multiplicity));
	formData.append("optimization_type", params.optimizationType ?? "ground");
	formData.append("job_name", params.jobName);
	if (params.jobNotes) formData.append("job_notes", params.jobNotes);
	(params.tags ?? []).forEach((t) => formData.append("tags", t));

	try {
		const API = createBackendAPI(token);
		const res = await API.post("/calculation/workflow/standard_analysis", formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Standard analysis submission failed", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Submits a custom (advanced) calculation job.
 */
export const submitCustomCalculation = async (
	token: string,
	params: {
		file?: File | Blob;
		structureId?: string;
		calculationType: string;
		method: string;
		basisSet: string;
		charge: number;
		multiplicity: number;
		optimizationType?: "ground" | "ts";
		keywords?: File;
		jobName: string;
		jobNotes?: string;
		tags?: string[];
	},
): Promise<Response> => {
	const formData = new FormData();
	if (params.file) formData.append("file", params.file);
	if (params.structureId) formData.append("structure_id", params.structureId);
	formData.append("calculation_type", params.calculationType);
	formData.append("method", params.method);
	formData.append("basis_set", params.basisSet);
	formData.append("charge", String(params.charge));
	formData.append("multiplicity", String(params.multiplicity));
	if (params.optimizationType) formData.append("optimization_type", params.optimizationType);
	if (params.keywords) formData.append("keywords", params.keywords);
	formData.append("job_name", params.jobName);
	if (params.jobNotes) formData.append("job_notes", params.jobNotes);
	(params.tags ?? []).forEach((t) => formData.append("tags", t));

	try {
		const API = createBackendAPI(token);
		const res = await API.post("/calculation/custom", formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Custom calculation submission failed", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Converts a base64 data URL into a Blob object.
 * This is used to upload generated structure images as normal files.
 */
function dataURLToBlob(dataURL: string) {
	const parts = dataURL.split(",");
	const mime = parts[0].match(/:(.*?);/)?.[1] ?? "image/png";
	const binary = atob(parts[1]);
	const array = new Uint8Array(binary.length);
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
	const imageBlob = dataURLToBlob(image);
	const formData = new FormData();
	formData.append("file", file);
	formData.append("name", name);
	formData.append("formula", formula);
	formData.append("notes", notes);
	if (tags && tags.length > 0) {
		tags.forEach((tag) => formData.append("tags", tag));
	}
	formData.append("image", imageBlob, `image.png`);
	try {
		const API = createBackendAPI(token);
		const response = await API.post("/structures/", formData);
		return {
			status: response.status,
			data: response.data,
		};
	} catch (error) {
		console.error("Structure submission failed", error);
		return {
			status: 500,
			error: `Failed to submit structure: ${getErrorMessage(error)}`,
		};
	}
};

/**
 * Fetches the structure file text for one structure.
 *
 * Structure files now live in the database, so this reads the detail endpoint
 * and returns its `content` field. The list endpoint returns metadata only.
 */
export const getStructureContent = async (structureId: string, token: any): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/structures/${structureId}`);
		const content = res.data?.content;
		if (typeof content !== "string" || !content) {
			return {
				status: res.status,
				error: "This structure has no stored file content.",
			};
		}
		return { status: res.status, data: content };
	} catch (error: any) {
		console.error("Failed to fetch the structure content", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || getErrorMessage(error),
		};
	}
};

/**
 * Fetches all structures available in the current user's library.
 */
export const getLibraryStructures = async (token: any, paging: Paging = {}): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/structures/", { params: paging });
		return {
			status: res.status,
			data: res.data,
		};
	} catch (error) {
		console.error("Failed to fetch structures", error);
		return {
			status: 500,
			error: `Failed to fetch structures: ${getErrorMessage(error)}`,
		};
	}
};

/**
 * All of the user's structures, following pagination.
 */
export const getLibraryStructuresPaged = (token: string) =>
	fetchAllPages<Structure>((p) => getLibraryStructures(token, p));

/**
 * Fetches metadata/details ffor one structure by structure ID.
 */
export const getStructureById = async (structureId: string, token: any): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/structures/${structureId}`);
		return {
			status: res.status,
			data: res.data,
		};
	} catch (error) {
		console.error("Failed to fetch structure details", error);
		return {
			status: 500,
			error: `Failed to fetch structure details: ${getErrorMessage(error)}`,
		};
	}
};

/**
 * Updates an existing structure's metadata, including name, formula, notes, and tags.
 *
 * `tags` is treated as the complete replacement set, not an addition, so
 * removing or clearing tags persists. Pass the full list the user should end up
 * with; an empty list clears them.
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

	// `tags` is the complete edited set from the structure editor, so it has to
	// replace what is stored. The backend is additive by default, which would
	// silently keep any tag the user removed. Sending replace_tags with no tags
	// is how it clears them all, so an empty list must not be skipped.
	formData.append("replace_tags", "true");
	tags.forEach((tag) => formData.append("tags", tag));

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
			error: `Failed to update structure: ${getErrorMessage(error)}`,
		};
	}
};

/**
 * Fetches job details using the job ID.
 */
export const getJobByJobID = async (jobId: string, token: any): Promise<Response> => {
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
			error: `Failed to fetch job details: ${getErrorMessage(error)}`,
		};
	}
};

// API endpoints for job-related operations
/**
 * Fetches all jobs visible to the current user.
 */
export const getAllJobs = async (token: string, paging: Paging = {}): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/jobs/", { params: paging });
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch jobs", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * All of the user's jobs, following pagination.
 */
export const getAllJobsPaged = (token: string) => fetchAllPages<Job>((p) => getAllJobs(token, p));

/**
 * Fetches the parsed calculation result and error stored for a finished job.
 *
 * Results now live in the database rather than S3, so this returns the parsed
 * JSON directly instead of a URL to fetch it from.
 * 409 = the job has not finished, or its result has not been stored yet.
 * Response: { job_id, result, error }
 */
export const fetchJobResult = async (jobId: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/jobs/${jobId}/result`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		const httpStatus = error.response?.status;
		console.error("Failed to fetch the job result", error);
		return {
			status: httpStatus || 500,
			error:
				httpStatus === 409
					? "Job results are not ready yet."
					: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Lists which artifact kinds a finished job actually has, such as "trajectory"
 * or "molden". Use fetchJobArtifact to read one of them.
 * Response: { job_id, artifacts }
 */
export const fetchJobArtifactKinds = async (jobId: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/jobs/${jobId}/artifacts`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		const httpStatus = error.response?.status;
		console.error("Failed to fetch the job artifact list", error);
		return {
			status: httpStatus || 500,
			error:
				httpStatus === 409
					? "Job results are not ready yet."
					: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches the text of one job artifact.
 *
 * This endpoint requires a bearer token, so the content has to be read here
 * and handed to a viewer inline. JSmol cannot load it by URL the way it could
 * with the presigned S3 links this replaces.
 * 404 = the job has no artifact of that kind.
 */
export const fetchJobArtifact = async (
	jobId: string,
	kind: JobArtifactKind,
	token: string,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get(`/jobs/${jobId}/artifacts/${kind}`, {
			// Artifacts are xyz/molden/cube text. Keep axios from parsing them.
			responseType: "text",
			transformResponse: [(data) => data],
		});
		return { status: res.status, data: res.data as string };
	} catch (error: any) {
		const httpStatus = error.response?.status;
		console.error(`Failed to fetch the ${kind} job artifact`, error);
		return {
			status: httpStatus || 500,
			error:
				httpStatus === 404
					? `This job has no ${kind} artifact.`
					: httpStatus === 409
						? "Job results are not ready yet."
						: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Deletes a ob record by job ID.
 */
export const deleteJob = async (jobId: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.delete(`/jobs/${jobId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to delete job", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Deletes a structure record by structure ID.
 */
export const deleteStructure = async (structureId: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.delete(`/structures/${structureId}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to delete structure", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Updates user-editable job metadata. Status and runtime are backend-managed.
 */
export const updateJob = async (
	jobId: string,
	token: string,
	fields: {
		job_name?: string;
		job_notes?: string;
		tags?: string[];
		replace_tags?: boolean;
	},
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/jobs/${jobId}`, fields);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to update job", error);
		return {
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
	token: string,
): Promise<Response> => {
	try {
		const formData = new FormData();
		formData.append("is_public", isPublic.toString());
		const API = createBackendAPI(token);
		const res = await API.patch(`/jobs/${jobId}/visibility`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to update job visibility", error);
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
		const res = await API.get("/enums/calculation_types");
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch calculation types", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches the list of supported wavefunction theory methods.
 */
export const getWavefunctionMethods = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/enums/wave_functional_theories");
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch wavefunction methods", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches the list of supported density functional theory methods.
 */
export const getDensityFunctionalMethods = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/enums/density_functional_theories");
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch density functional methods", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches the list of supported basis sets.
 */
export const getBasisSets = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/enums/basis_sets");
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch basis sets", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches the list of supported spin multiplicities.
 */
export const getMultiplicities = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/enums/multiplicities");
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch multiplicities", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all tags that are currently used by structures.
 * This can be used for tag filtering, autocomplete, or displaying available structure categories.
 */
export const getStructuresTags = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/structures/tags");
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch structures tags", error);
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
export const getChemicalFormula = async (file: File | Blob, token: string): Promise<Response> => {
	const formData = new FormData();
	formData.append("file", file);

	try {
		const API = createBackendAPI(token);
		const res = await API.post("/structures/formula", formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch chemical formula", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches a presigned URL for the job's result archive.
 * 409 = files not ready yet, 503 = storage temporarily unavailable.
 */
export const getZipPresignedUrl = async (jobId: string, token: string): Promise<Response> => {
	try {
		const API = createStorageAPI(token);
		const res = await API.get(`/jobs/${jobId}/archive`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		const httpStatus = error.response?.status;
		console.error("Failed to fetch the job archive url", error);
		return {
			status: httpStatus || 500,
			error:
				httpStatus === 409
					? "Job files are not ready yet."
					: httpStatus === 503
						? "File storage is temporarily unavailable. Please try again shortly."
						: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all incoming group-related requests for the given user.
 */
export const getReceivedRequests = async (
	token: string,
	status: string = "pending",
	requestType?: string,
	recentDays?: number,
	limit: number = MAX_PAGE_SIZE,
	offset?: number,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const params: Record<string, string | number> = { status, limit };
		if (requestType) params.request_type = requestType;
		if (recentDays !== undefined) params.recent_days = recentDays;
		if (offset !== undefined) params.offset = offset;
		const res = await API.get(`/request/received`, { params });
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch requests", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches the list of supported optimization types from the backend enum endpoint.
 */
export const getOptimizationTypes = async (token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.get("/enums/optimization_types");
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch optimization types", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches all group-related requests sent by the given user.
 */
export const getSentRequests = async (
	token: string,
	status: string = "pending",
	requestType?: string,
	recentDays?: number,
	limit: number = MAX_PAGE_SIZE,
	offset?: number,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const params: Record<string, string | number> = { status, limit };
		if (requestType) params.request_type = requestType;
		if (recentDays !== undefined) params.recent_days = recentDays;
		if (offset !== undefined) params.offset = offset;
		const res = await API.get(`/request/sent`, { params });
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch sent requests", error);
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
	formData.append("email", email);
	if (expiresInDays !== undefined) formData.append("expires_in_days", String(expiresInDays));
	try {
		const API = createBackendAPI(token);
		const res = await API.post("/request/invite", formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to send invite", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Approves an incoming request by request ID.
 */
export const approveRequest = async (requestId: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.put(`/request/${requestId}/approve`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to approve request", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Rejects an incoming request by request ID.
 */
export const rejectRequest = async (requestId: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.put(`/request/${requestId}/reject`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to reject request", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Deletes a request by request ID.
 */
// export const deleteRequest = async (requestId: string, token: string): Promise<Response> => {
// 	try {
// 		const API = createBackendAPI(token);
// 		const res = await API.delete(`/request/${requestId}/`);
// 		return { status: res.status, data: res.data };
// 	} catch (error: any) {
// 		console.error("Failed to delete request", error);
// 		return {
// 			status: error.response?.status || 500,
// 			error: error.response?.data?.detail || error.message,
// 		};
// 	}
// };

/** Cancels a pending request the user sent, created, or manages. */
export const cancelRequest = async (requestId: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.put(`/request/${requestId}/cancel`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Removes a user from the group. Group admins may remove members of their own group.
 */
export const removeGroupUser = async (userSub: string, token: string): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const res = await API.delete(`/group/users/${userSub}`);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to remove group user", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Transfers ownership of a job between user, group, or co_owned.
 */
export const updateJobOwnership = async (
	jobId: string,
	ownership: "user" | "group" | "co_owned",
	token: string,
	userSub?: string,
	groupId?: string,
): Promise<Response> => {
	const formData = new FormData();
	formData.append("ownership", ownership);
	if (userSub) formData.append("user_sub", userSub);
	if (groupId) formData.append("group_id", groupId);
	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/group/jobs/${jobId}`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to update job ownership", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Transfers ownership of a structure between user, group or co_owned
 */
export const updateStructureOwnership = async (
	structureId: string,
	ownership: "user" | "group" | "co_owned",
	token: string,
	userSub?: string,
	groupId?: string,
): Promise<Response> => {
	const formData = new FormData();
	formData.append("ownership", ownership);
	if (userSub) formData.append("user_sub", userSub);
	if (groupId) formData.append("group_id", groupId);
	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/group/structures/${structureId}`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to update structure ownership", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Requests to join a group by group ID.
 */
export const joinGroupRequest = async (
	groupId: string,
	token: string,
	expiresInDays?: number,
): Promise<Response> => {
	const formData = new FormData();
	formData.append("group_id", groupId);
	if (expiresInDays !== undefined) formData.append("expires_in_days", String(expiresInDays));
	try {
		const API = createBackendAPI(token);
		const res = await API.post("/request/join", formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to send join request", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Requests to be removed from the authenticated user's current group.
 */
export const requestDemember = async (token: string, expiresInDays?: number): Promise<Response> => {
	const formData = new FormData();
	if (expiresInDays !== undefined) formData.append("expires_in_days", String(expiresInDays));
	try {
		const API = createBackendAPI(token);
		const res = await API.post("/request/demember", formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to send de-member request", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Fetches requests for the authenticated admin/group admin's current group.
 */
export const getGroupRequests = async (
	token: string,
	status: string = "pending",
	requestType?: string,
	recentDays?: number,
	limit: number = MAX_PAGE_SIZE,
	offset?: number,
): Promise<Response> => {
	try {
		const API = createBackendAPI(token);
		const params: Record<string, string | number> = { status, limit };
		if (requestType) params.request_type = requestType;
		if (recentDays !== undefined) params.recent_days = recentDays;
		if (offset !== undefined) params.offset = offset;
		const res = await API.get("/group/requests", { params });
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to fetch group requests", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

/**
 * Updates public/private visibility for a structure.
 */
export const updateStructureVisibility = async (
	structureId: string,
	isPublic: boolean,
	token: string,
): Promise<Response> => {
	const formData = new FormData();
	formData.append("is_public", String(isPublic));
	try {
		const API = createBackendAPI(token);
		const res = await API.patch(`/structures/${structureId}/visibility`, formData);
		return { status: res.status, data: res.data };
	} catch (error: any) {
		console.error("Failed to update structure visibility", error);
		return {
			status: error.response?.status || 500,
			error: error.response?.data?.detail || error.message,
		};
	}
};

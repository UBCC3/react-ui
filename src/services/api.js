import axios from 'axios';

export const createAuthAPI = (token) => {
	return axios.create({
		baseURL: import.meta.env.VITE_STORAGE_API_URL,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

export const addjob = async (jobName, file, structure_id, slurm_id, token) => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("job_name", jobName);
	formData.append("structure_id", structure_id);
	formData.append("slurm_id", slurm_id);

	try {
		const API = createAuthAPI(token);
		const response = await API.post("/add_job/", formData);
		console.log("Job submission response:", response);
		return {
			status: response.status,
			data: response.data,
		}
	} catch (error) {
		console.error("Job submission failed", error);
		return false;
	}
};

export const updateStatus = async (jobId, status, token) => {
	try {
		const API = createAuthAPI(token);
		const res = await API.post(`/update_status/${jobId}/${status}`);
		return res.data;
	} catch (error) {
		console.error("Failed to fetch job details", error);
		return null;
	}
}


export const submitJob = async (jobName, file, engine, calculation_type, method, basis_set, structure_id, token) => {
	const formData = new FormData();
	formData.append("job_name", jobName);
	formData.append("file", file);
	formData.append("engine", engine);
	formData.append("calculation_type", calculation_type);
	formData.append("method", method);
	formData.append("structure_id", structure_id);
	formData.append("basis_set", basis_set);

	try {
		const API = createAuthAPI(token);
		const response = await API.post("/jobs/", formData);
		return response.status === 200;
	} catch (error) {
		console.error("Job submission failed", error);
		return false;
	}
};

export const submitStandardWorkflow = async (jobName, file, structure_id, charge, multiplicity, token) => {
	const formData = new FormData();
	formData.append("job_name", jobName);
	formData.append("file", file);
	formData.append("structure_id", structure_id);
	formData.append("charge", charge);
	formData.append("multiplicity", multiplicity);

	try {
		const API = createAuthAPI(token);
		const response = await API.post("/jobs/", formData);
		console.log("Standard workflow submission response:", response);
		return {
			status: response.status,
			data: response.data,
		}
	} catch (error) {
		console.error("Standard workflow submission failed", error);
		return false;
	}
}

export const submitStructure = async (file, name, token) => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("name", name);

	try {
		const API = createAuthAPI(token);
		const response = await API.post("/structures/", formData);
		console.log("Structure submission response:", response);
		return {
			status: response.status,
			data: response.data,
		}
	} catch (error) {
		console.error("Structure submission failed", error);
		return false;
	}
};

export const fetchJobs = async (token) => {
	try {
		const API = createAuthAPI(token);
		const res = await API.get("/jobs/");
		return res.data;
	} catch (error) {
		console.error("Failed to fetch jobs", error);
		return [];
	}
};

export const fetchStructures = async (token) => {
	try {
		const API = createAuthAPI(token);
		const res = await API.get("/structures/");
		return res.data;
	} catch (error) {
		console.error("Failed to fetch structures", error);
		return [];
	}
}

export const fetchJob = async (jobId, token) => {
	try {
		const API = createAuthAPI(token);
		const res = await API.get(`/jobs/${jobId}`);
		return res.data;
	} catch (error) {
		console.error("Failed to fetch job details", error);
		return null;
	}
}

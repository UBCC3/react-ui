interface Job {
	calculation_type: string;
	result(result: any, arg1: null, arg2: number): unknown;
	job_id: string;
	job_name: string;
	status: string;
	method: string;
	basis_set: string;
	structures: Array<{ structure_id: string; name: string }>;
	slurm_id: string;
	submitted_at: string;
}

export default Job;

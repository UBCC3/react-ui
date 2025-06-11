interface Job {
	job_id: string;
	job_name: string;
	job_notes: string | null;
	filename: string;
	status: string;
	calculation_type: string;
	method: string;
	basis_set: string;
	charge: number;
	multiplicity: number;
	submitted_at: string;
	completed_at: string | null;
	user_sub: string;
	slurm_id: string | null;
	structures: Array<{ structure_id: string; name: string }>;
	tags: string[];
	runtime: string | null;
	is_deleted: boolean;
	result(result: any, arg1: null, arg2: number): unknown;
}

export default Job;

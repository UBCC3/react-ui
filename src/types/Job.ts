export type JobStatus =
	"submitting" | "submitted" | "running" | "completed" | "failed" | "cancelled";

export type JobFailureReason =
	| "calculation_failed"
	| "out_of_memory"
	| "timeout"
	| "node_failure"
	| "submission_failed"
	| "status_check_failed"
	| "result_upload_failed"
	| "cluster_failed"
	| "unknown";

export type JobArchiveUploadStatus = "pending" | "disabled" | "uploaded" | "unavailable";

interface Job {
	job_id: string;
	submitted_at: string;
	group_id: string | null;
	user_sub?: string | null;
	is_public: boolean;
	job_name: string | null;
	job_notes: string | null;
	filename: string;
	status: JobStatus;
	calculation_type: string;
	method: string;
	basis_set: string;
	charge: number;
	multiplicity: number;
	optimization_type?: string | null;
	completed_at: string | null;
	runtime_seconds: number | null;
	cancel_requested: boolean;
	failure_reason?: JobFailureReason | null;
	failure_message?: string | null;
	upload_archive: boolean;
	archive_uploaded: boolean;
	archive_upload_status: JobArchiveUploadStatus;
	tags: string[];
	structures: Array<{
		structure_id: string;
		uploaded_at: string;
		group_id: string | null;
		is_public: boolean;
		name: string;
		formula: string;
		location: string;
		notes: string | null;
	}>;
	// admin endpoints only
	user_email?: string | null;
	group_name?: string | null;
}

export default Job;

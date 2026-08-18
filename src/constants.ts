import { green, blue, orange, red, grey } from "@mui/material/colors";
import {
	CheckCircleOutlined,
	RunCircleOutlined,
	PendingOutlined,
	ErrorOutline,
	CancelOutlined,
	HelpOutlineOutlined,
	SvgIconComponent,
} from "@mui/icons-material";
import type { FilterExtent } from "./types/Filter";

// The constant height of the toolbar and the menu drawer header
export const APP_BAR_HEIGHT = 64;

/**
 * Largest page size the API accepts on any paginated list endpoint.
 *
 * Mirrors the MAX_*_LIST_LIMIT constants in the backend's utils.py, which are
 * all 100. These are validation bounds, so requesting more returns 422 rather
 * than a clamped page. Lower this if the backend ever lowers its cap.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * How often the Home, Admin and Group job tables refetch their full paged
 * list while mounted. The backend advances job status in the background, so
 * the client only has to re-read it; this is a whole-list fetch rather than a
 * per-job poll, which is why it is deliberately slow.
 */
export const JOB_POLL_INTERVAL_MS = 20000;

/** How often the slower group and request panels refetch. */
export const GROUP_POLL_INTERVAL_MS = 20000;

/** How long a transient alert stays on screen before dismissing itself. */
export const ALERT_AUTO_HIDE_MS = 5000;

// The expanded/collapsed width of the result drawer
export const DRAWER_FULL_WIDTH = 400;
export const DRAWER_MINI_WIDTH = 80;

export const JobStatus = {
	SUBMITTING: "submitting",
	SUBMITTED: "submitted",
	RUNNING: "running",
	// Internal backend status only. serialize_job maps it to "running", so it
	// never appears in an API response.
	FINALISING: "finalising",
	COMPLETED: "completed",
	FAILED: "failed",
	CANCELLED: "cancelled",
};

/** Jobs that have finished; nothing further will change. */
export const TERMINAL_JOB_STATUSES = [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED];

/** Jobs the backend will still act on, so cancellation is possible. */
export const CANCELLABLE_JOB_STATUSES = [
	JobStatus.SUBMITTING,
	JobStatus.SUBMITTED,
	JobStatus.RUNNING,
];

/**
 * Jobs that may have result artifacts in storage. Mirrors the backend's
 * TERMINAL_JOB_STATUSES in s3/routes.py. Cancelled jobs are included because
 * finalisation still uploads result.err and the archive for them; if a job was
 * cancelled before producing anything, the endpoint returns 409 instead.
 */
export const DOWNLOADABLE_JOB_STATUSES = [
	JobStatus.COMPLETED,
	JobStatus.FAILED,
	JobStatus.CANCELLED,
];

/**
 * Failure reasons that prove a job never produced stored artifacts.
 *
 * The backend gates both the result and the archive on is_job_result_ready,
 * which needs is_uploaded and a JobResult row. Neither is serialized, so a
 * terminal status alone does not mean anything is downloadable. These three
 * reasons are the cases the job record does settle: the job either never
 * reached the cluster or never finished uploading, so the endpoints will 409.
 *
 * Anything else is genuinely unknown here and has to be handled from the
 * response. Explicit result_ready and archive_ready fields on JobResponse
 * would remove the guesswork entirely.
 */
export const FAILURE_REASONS_WITHOUT_ARTIFACTS = [
	"submission_failed",
	"status_check_failed",
	"result_upload_failed",
];

export const statusColors: Record<string, string> = {
	completed: green[500],
	running: blue[500],
	submitting: orange[300],
	submitted: orange[500],
	finalising: blue[300],
	failed: red[500],
	cancelled: grey[500],
};

export const statusIcons: Record<string, SvgIconComponent> = {
	completed: CheckCircleOutlined,
	running: RunCircleOutlined,
	submitting: PendingOutlined,
	submitted: PendingOutlined,
	finalising: RunCircleOutlined,
	failed: ErrorOutline,
	cancelled: CancelOutlined,
	unknown: HelpOutlineOutlined,
};

export const calculationTypes = {
	"Molecular Energy": "energy",
	"Geometric Optimization": "optimization",
	"Vibrational Frequency": "frequency",
	"Molecular Orbitals": "orbitals",
	"Standard Analysis": "standard",
	"Transition State Optimization": "transition",
	"Intrinsic Reaction Coordinate": "irc",
};

export type ColumnKind = "string" | "date" | "runtime" | "boolean";

export const columnKinds: Record<string, ColumnKind> = {
	job_id: "string",
	job_name: "string",
	user_email: "string",
	group_id: "string",
	group_name: "string",
	job_notes: "string",
	status: "string",
	calculation_type: "string",
	structures: "string",
	tags: "string",
	runtime: "runtime",
	submitted_at: "date",
	completed_at: "date",
	is_public: "boolean",
};

export const extentsByKind: Record<ColumnKind, FilterExtent[]> = {
	string: ["contains", "equals", "startsWith"],
	date: ["before", "after", "between"],
	runtime: ["greaterThan", "between", "lessThan"],
	boolean: ["is"],
};

export const extentDisplayNames: Record<FilterExtent, string> = {
	contains: "Contains",
	equals: "Equals",
	startsWith: "Starts With",
	before: "Before",
	after: "After",
	between: "Between",
	greaterThan: "Greater Than",
	lessThan: "Less Than",
	is: "Is",
};

export const failureReasonLabels: Record<string, string> = {
	calculation_failed: "The calculation failed",
	out_of_memory: "Out of memory",
	timeout: "Time limit exceeded",
	node_failure: "Compute node failure",
	submission_failed: "Could not be submitted to the cluster",
	status_check_failed: "Lost track of the job on the cluster",
	result_upload_failed: "Results could not be uploaded",
	cluster_failed: "Cluster infrastructure failure",
	unknown: "Unknown failure",
};

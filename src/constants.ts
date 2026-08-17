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

/**
 * Maps the number of unpaired electrons (shown to the user) to the spin
 * multiplicity value electronic structure programs expect on the backend.
 * multiplicity = unpaired electrons + 1.
 */
export const unpairedElectronOptions: { label: string; multiplicity: number }[] = [
	{ label: "0", multiplicity: 1 }, // singlet
	{ label: "1", multiplicity: 2 }, // doublet
	{ label: "2", multiplicity: 3 }, // triplet
	{ label: "3", multiplicity: 4 }, // quartet
];

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

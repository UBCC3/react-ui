import { green, blue, orange, red, grey, deepOrange } from "@mui/material/colors";
import {
	CheckCircleOutlined,
	RunCircleOutlined,
	PendingOutlined,
	ErrorOutline,
	CancelOutlined,
	HelpOutlineOutlined,
	ReportOutlined,
	TimerOffOutlined,
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

// How often job/status tables refetch while mounted.
export const JOB_POLL_INTERVAL_MS = 5000;
// How often slower group/request panels refetch.
export const GROUP_POLL_INTERVAL_MS = 20000;

// The expanded/collapsed width of the result drawer
export const DRAWER_FULL_WIDTH = 400;
export const DRAWER_MINI_WIDTH = 80;

export const JobStatus = {
	PENDING: "pending",
	RUNNING: "running",
	COMPLETED: "completed",
	FAILED: "failed",
	CANCELLED: "cancelled",
	UNKNOWN: "unknown",
	OUT_OF_MEMORY: "out_of_memory",
	TIMEOUT: "timeout",
};

export const statusColors: Record<string, string> = {
	completed: green[500],
	running: blue[500],
	pending: orange[500],
	failed: red[500],
	cancelled: grey[500],
	out_of_memory: deepOrange[500],
	timeout: deepOrange[300],
};

export const statusIcons: Record<string, SvgIconComponent> = {
	completed: CheckCircleOutlined,
	running: RunCircleOutlined,
	pending: PendingOutlined,
	failed: ErrorOutline,
	cancelled: CancelOutlined,
	unknown: HelpOutlineOutlined,
	out_of_memory: ReportOutlined,
	timeout: TimerOffOutlined,
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

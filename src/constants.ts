import { green, blue, orange, red, grey, deepOrange } from '@mui/material/colors';
import { CheckCircleOutlined, RunCircleOutlined, PendingOutlined, ErrorOutline, CancelOutlined, HelpOutlineOutlined, ReportOutlined, TimerOffOutlined } from '@mui/icons-material';
import type { FilterExtent } from './types/Filter';

// The constant height of the toolbar and the menu drawer header
export const APP_BAR_HEIGHT = 64;

// The expanded/collapsed width of the result drawer
export const DRAWER_FULL_WIDTH = 400;
export const DRAWER_MINI_WIDTH = 80;

export const JobStatus = {
	PENDING: 'pending',
	RUNNING: 'running',
	COMPLETED: 'completed',
	FAILED: 'failed',
	CANCELLED: 'cancelled',
	UNKNOWN: 'unknown',
    OUT_OF_MEMORY: 'out_of_memory',
    TIMEOUT: 'timeout'
};

export const statusColors = {
	'completed': green[500],
	'running': blue[500],
	'pending': orange[500],
	'failed': red[500],
	'cancelled': grey[500],
    'out_of_memory': deepOrange[500],
    'timeout': deepOrange[300]
};

export const statusIcons = {
	'completed': CheckCircleOutlined,
	'running': RunCircleOutlined,
	'pending': PendingOutlined,
	'failed': ErrorOutline,
	'cancelled': CancelOutlined,
	'unknown': HelpOutlineOutlined,
    'out_of_memory': ReportOutlined,
    'timeout': TimerOffOutlined
};

export const calculationTypes = {
    'Molecular Energy': 'energy',
	'Geometric Optimization': 'optimization',
	'Vibrational Frequency': 'frequency',
	'Molecular Orbitals': 'orbitals',
    'Standard Analysis': 'standard',
    'Transition State Optimization': 'transition',
    'Intrinsic Reaction Coordinate': 'irc',
}

/**
 * Maps the number of unpaired electrons (shown to the user) to the spin
 * multiplicity value electronic structure programs expect on the backend.
 * multiplicity = unpaired electrons + 1.
 */
export const unpairedElectronOptions: { label: string, multiplicity: number }[] = [
    { label: '0', multiplicity: 1 }, // singlet
    { label: '1', multiplicity: 2 }, // doublet
    { label: '2', multiplicity: 3 }, // triplet
    { label: '3', multiplicity: 4 }, // quartet
]

export type ColumnKind = 'string' | 'date' | 'runtime';

export const columnKinds: Record<string, ColumnKind> = {
    job_id: 'string',
    job_name: 'string',
    user_email: 'string',
    group_id: 'string',
    group_name: 'string',
    job_notes: 'string',
    status: 'string',
    calculation_type: 'string',
    structures: 'string',
    tags: 'string',
    runtime: 'runtime',
    submitted_at: 'date',
    completed_at: 'date'
};

export const extentsByKind: Record<ColumnKind, FilterExtent[]> = {
    string: ['contains', 'equals', 'startsWith'],
    date: ['before', 'after', 'between'],
    runtime: ['before', 'after', 'between']
};

export const extentDisplayNames: Record<FilterExtent, string> = {
    contains: 'Contains',
    equals: 'Equals',
    startsWith: 'Starts With',
    before: 'Before',
    after: 'After',
    between: 'Between'
};
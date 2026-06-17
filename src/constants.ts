import { green, blue, orange, red, grey, deepOrange } from '@mui/material/colors';
import { CheckCircleOutlined, RunCircleOutlined, PendingOutlined, ErrorOutline, CancelOutlined, HelpOutlineOutlined, ReportOutlined, TimerOffOutlined } from '@mui/icons-material';

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
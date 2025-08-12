import { green, blue, orange, red, grey } from '@mui/material/colors';
import { CheckCircleOutlined, RunCircleOutlined, PendingOutlined, ErrorOutline, CancelOutlined, HelpOutlineOutlined } from '@mui/icons-material';

export const JobStatus = {
	PENDING: 'pending',
	RUNNING: 'running',
	COMPLETED: 'completed',
	FAILED: 'failed',
	CANCELLED: 'cancelled',
	UNKNOWN: 'unknown',
};

export const statusColors = {
	'completed': green[500],
	'running': blue[500],
	'pending': orange[500],
	'failed': red[500],
	'cancelled': grey[500],
};

export const statusIcons = {
	'completed': CheckCircleOutlined,
	'running': RunCircleOutlined,
	'pending': PendingOutlined,
	'failed': ErrorOutline,
	'cancelled': CancelOutlined,
	'unknown': HelpOutlineOutlined,
};

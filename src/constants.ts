import { green, blue, orange, red } from '@mui/material/colors';

export const JobStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
};

export const statusColors = {
	'completed': green[500],
	'running': blue[500],
	'pending': orange[500],
	'failed': red[500],
};

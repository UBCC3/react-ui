import React from 'react';
import {
	TableContainer,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	Chip,
	Box,
	Typography,
	Button,
	Grid
} from '@mui/material';
import { ArrowDropUpOutlined, ArrowDropDownOutlined, AutoMode, TuneOutlined } from '@mui/icons-material';
import { statusColors } from '../../../constants';
import { blueGrey } from '@mui/material/colors';
import type { Job } from '../../../types';

interface JobsTableProps {
	jobs: Job[];
	page: number;
	rowsPerPage: number;
	order: 'asc' | 'desc';
	orderBy: keyof Job;
	selectedJobId: string | null;
	onSort: (column: keyof Job) => void;
	onRowClick: (jobId: string) => void;
}

export default function JobsTable({
	jobs,
	page,
	rowsPerPage,
	order,
	orderBy,
	selectedJobId,
	onSort,
	onRowClick
}: JobsTableProps) {
	// Comparator that handles strings, dates, and structures-length
	const comparator = React.useCallback((a: Job, b: Job): number => {
		let aVal: string | number = a[orderBy] as any;
		let bVal: string | number = b[orderBy] as any;

		if (orderBy === 'submitted_at') {
			aVal = new Date(a.submitted_at).getTime();
			bVal = new Date(b.submitted_at).getTime();
		} else if (orderBy === 'structures') {
			aVal = a.structures.length;
			bVal = b.structures.length;
		} else {
			// coerce to lowercase for string compare
			aVal = String(aVal).toLowerCase();
			bVal = String(bVal).toLowerCase();
		}

		if (aVal < bVal) return order === 'asc' ? -1 : 1;
		if (aVal > bVal) return order === 'asc' ? 1 : -1;
		return 0;
	}, [order, orderBy]);

	// Memoize sorted list
	const sortedJobs = React.useMemo(() => {
		return [...jobs].sort(comparator);
	}, [jobs, comparator]);

  	// Then slice for pagination
	const paginatedJobs = sortedJobs.slice(
		page * rowsPerPage,
		page * rowsPerPage + rowsPerPage
	);

	const renderHeader = (label: string, column: keyof Job) => (
		<TableCell
			sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
			onClick={() => onSort(column)}
		>
			<Box sx={{ display: 'flex', alignItems: 'bottom' }}>
				{label}
				{orderBy === column && (
				<Box sx={{ ml: 1 }}>
					{order === 'asc' ? (
						<ArrowDropUpOutlined color="primary" />
					) : (
						<ArrowDropDownOutlined color="primary" />
					)}
				</Box>
				)}
			</Box>
		</TableCell>
	);

  	return (
		<TableContainer>
			<Table>
				<TableHead sx={{ bgcolor: blueGrey[50] }}>
					<TableRow>
						{renderHeader('Job Name', 'job_name')}
						{renderHeader('Job Notes', 'job_notes')}
						{renderHeader('Status', 'status')}
						{renderHeader('Structures', 'structures')}
						{renderHeader('Submitted At', 'submitted_at')}
						{renderHeader('Completed At', 'completed_at')}
					</TableRow>
				</TableHead>
				<TableBody>
					{paginatedJobs.length === 0 ? (
						<TableRow>
							<TableCell colSpan={8} align="center">
								<Typography variant="body2" color="text.secondary">
									No jobs added yet.
								</Typography>
								<Grid container sx={{ mt: 2, justifyContent: 'center' }} spacing={2}>
									<Grid>
										<Button
											variant="contained"
											color="primary"
											sx={{ textTransform: 'none' }}
											startIcon={<AutoMode />}
											onClick={() => window.location.href = '/submit'}
										>
											Run Standard Analysis
										</Button>
									</Grid>
									<Grid>
										<Button
											variant="outlined"
											sx={{ textTransform: 'none' }}
											startIcon={<TuneOutlined />}
											onClick={() => window.location.href = '/advanced'}
										>
											Run Advanced Analysis
										</Button>
									</Grid>
								</Grid>
							</TableCell>
						</TableRow>
					) : (
						paginatedJobs.map((job) => (
							<TableRow
								key={job.job_id}
								onClick={() => onRowClick(job.job_id)}
								sx={{
								backgroundColor:
									job.job_id === selectedJobId ? 'rgba(0,0,0,0.08)' : 'transparent',
								cursor: 'pointer'
								}}
							>
								<TableCell>{job.job_name}</TableCell>
								<TableCell>{job.job_notes || 'N/A'}</TableCell>
								<TableCell>
									<Chip
										label={job.status}
										size="small"
										sx={{
										bgcolor: statusColors[job.status] ?? 'grey.300',
										color: 'white',
										textTransform: 'capitalize'
										}}
									/>
								</TableCell>
								<TableCell>
									{job.structures.length ? job.structures
										.map((s) => (
											<Chip
											key={s.structure_id}
											label={s.name}
											variant="outlined"
											size="small"
											sx={{ mr: 0.5, mb: 0.5 }}
											/>
										)) : 'N/A'}
								</TableCell>
								<TableCell>
									{new Date(job.submitted_at).toLocaleString()}
								</TableCell>
								<TableCell>
									{job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A'}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
	  		</Table>
		</TableContainer>
  	);
}

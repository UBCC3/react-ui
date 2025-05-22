import {
	TableContainer,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	Chip,
	Box
} from '@mui/material';
import { SwapVert } from '@mui/icons-material';
import { statusColors } from '../../../constants';

export interface Job {
	job_id: string;
	job_name: string;
	status: string;
	method: string;
	basis_set: string;
	structures: Array<{ structure_id: string; name: string }>;
	submitted_at: string;
}

export interface JobsTableProps {
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
	const sortedSlice = jobs.slice(
		page * rowsPerPage,
		page * rowsPerPage + rowsPerPage
	);

	const renderHeader = (label: string, column: keyof Job) => (
		<TableCell sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onSort(column)}>
			<Box sx={{ display: 'flex', alignItems: 'center' }}>
				{label}
				<SwapVert fontSize="small" sx={{ ml: 0.5, color: orderBy === column ? 'primary.main' : 'text.secondary' }} />
			</Box>
		</TableCell>
	);

	return (
		<TableContainer>
			<Table>
				<TableHead>
					<TableRow>
						{renderHeader('Job ID', 'job_id')}
						{renderHeader('Job Name', 'job_name')}
						{renderHeader('Status', 'status')}
						{renderHeader('Method', 'method')}
						{renderHeader('Basis Set', 'basis_set')}
						{renderHeader('Structures', 'structures')}
						{renderHeader('Submitted At', 'submitted_at')}
					</TableRow>
				</TableHead>

				<TableBody>
					{sortedSlice.length === 0 ? (
						<TableRow>
							<TableCell colSpan={7} align="center">
								No jobs found.
							</TableCell>
						</TableRow>
					) : (
						sortedSlice.map((job) => (
							<TableRow
								key={job.job_id}
								onClick={() => onRowClick(job.job_id)}
								sx={{
									backgroundColor: job.job_id === selectedJobId ? 'rgba(0,0,0,0.1)' : 'transparent',
									cursor: 'pointer'
								}}
							>
								<TableCell>{job.job_id}</TableCell>
								<TableCell>{job.job_name}</TableCell>
								<TableCell>
									<Chip
										label={job.status}
										size="small"
										sx={{
											bgcolor: statusColors[job.status] || 'grey.300',
											color: 'white',
											textTransform: 'capitalize'
										}}
									/>
								</TableCell>
								<TableCell>{job.method}</TableCell>
								<TableCell>{job.basis_set}</TableCell>
								<TableCell>
									{job.structures.length > 0
										? job.structures.map((s) => (
												<Chip
													key={s.structure_id}
													label={s.name}
													variant="outlined"
													size="small"
													sx={{ mr: 0.5, mb: 0.5 }}
												/>
											))
										: 'N/A'}
								</TableCell>
								<TableCell>
									{new Date(job.submitted_at).toLocaleString()}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

import { useEffect, useState, useRef } from 'react';
import {
	Box,
	Grid,
	Paper,
	Toolbar,
	Typography,
	Divider,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	IconButton,
	Tooltip,
	TableContainer,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	Chip,
	TablePagination,
	CircularProgress,
	Alert,
} from '@mui/material';
import {
	Refresh,
	Visibility,
	SwapVert,
	Image,
	FilterList,
	Block,
	CheckCircleOutlined,
	SyncOutlined,
	PauseCircleOutlineOutlined,
	ErrorOutlineOutlined
} from '@mui/icons-material';
import { blue, blueGrey, green, orange, red } from '@mui/material/colors';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchJobs, fetchStructures, updateStatus } from '../../services/api';
import MoleculeViewerDialogue from '../../components/MoleculeViewerDialogue';
import PageTitle from '../../components/PageTitle';
import { JobStatus } from '../../constants';
import JobStatusSection from './components/JobStatusSection';

const statusColors = {
	'completed': green[500],
	'running': blue[500],
	'pending': orange[500],
	'failed': red[500],
};

export default function Home() {
	const navigate = useNavigate();

	const { user, getAccessTokenSilently } = useAuth0();

	// Raw data
	const [jobs, setJobs] = useState([]);
	const [structures, setStructures] = useState([]);

	// UI state
	const [error, setError] = useState(null);
	const [open, setOpen] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);
	const [loading, setLoading] = useState(true);

	// State for selected job and structure
	const [selectedJobId, setSelectedJobId] = useState('');
	const [selectedStructure, setSelectedStructure] = useState('');
	const [viewStructure, setViewStructure] = useState('');

	// Filtered view
	const [order, setOrder] = useState('desc');
	const [orderBy, setOrderBy] = useState('submitted_at');
	const [filteredJobs, setFilteredJobs] = useState([]);	

	const handleRowClick = (jobId) => {
		setSelectedJobId(prev => prev === jobId ? null : jobId);
	};

	const jobsRef = useRef([]);

	useEffect(() => {
		jobsRef.current = jobs;
	}, [jobs]);

	useEffect(() => {
		const interval = setInterval(async () => {
			const token = await getAccessTokenSilently();

			for (const job of jobsRef.current) {
				if (![JobStatus.COMPLETED, JobStatus.FAILED].includes(job?.status)) {
					try {
						const res = await fetch(`${import.meta.env.VITE_API_URL}/status/${job.slurm_id}`);
						const data = await res.json();
						const newStatus = data.state.toLowerCase();

						await updateStatus(job.job_id, newStatus, token);

						setJobs(prev =>
							prev.map(j =>
								j.job_id === job.job_id ? { ...j, status: newStatus } : j
							)
						);
					} catch (err) {
						setError('Failed to fetch job status');
						console.error('Status check failed:', err);
					}
				}
			}
		}, 5000);

		return () => clearInterval(interval);
	}, []);


	// Fetch jobs & structures on mount
	useEffect(() => {
		const loadAll = async () => {
			try {
				const token = await getAccessTokenSilently();
				let [jobsRes, structsRes] = await Promise.all([
					fetchJobs(token),
					fetchStructures(token),
				]);
				setJobs(jobsRes);
				setFilteredJobs(jobsRes);

				structsRes.sort((a, b) => a.name.localeCompare(b.name));
				structsRes = [{ structure_id: '', name: 'All' }, ...structsRes];
				setStructures(structsRes);
			} catch (err) {
				setError('Failed to load data');
				console.error('Failed to load data', err);
			} finally {
				setLoading(false);
			}
		};

		loadAll();
	}, [getAccessTokenSilently]);

	// Re-filter when jobs or selectedStructure change
	useEffect(() => {
		try {
			if (selectedStructure) {
				setFilteredJobs(
					jobs.filter((job) =>
						job.structures.some((s) => s.structure_id === selectedStructure)
					)
				);
			} else {
				setFilteredJobs(jobs);
			}
			setPage(0);
		} catch (err) {
			setError('Failed to filter jobs');
			console.error('Failed to filter jobs', err);
		}
	}, [selectedStructure, jobs]);

	const handleRefresh = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();
			const jobsRes = await fetchJobs(token);
			setJobs(jobsRes);
			setSelectedStructure('');
		} catch (err) {
			setError('Failed to refresh jobs');
			console.error('Failed to refresh jobs', err);
		} finally {
			setLoading(false);
		}
	};

	const handleChangePage = (_, newPage) => {
		setPage(newPage);
	};

	const handleChangeOrderBy = (column) => {
		const isAsc = orderBy === column && order === 'asc';
		setOrder(isAsc ? 'desc' : 'asc');
		setOrderBy(column);

		const sortedJobs = [...filteredJobs].sort((a, b) => {
			if (column === 'submitted_at') {
				return isAsc
					? new Date(a.submitted_at) - new Date(b.submitted_at)
					: new Date(b.submitted_at) - new Date(a.submitted_at);
			}
			return isAsc ? a[column].localeCompare(b[column]) : b[column].localeCompare(a[column]);
		});

		setFilteredJobs(sortedJobs);
	}

	const handleChangeRowsPerPage = (e) => {
		setRowsPerPage(parseInt(e.target.value, 10));
		setPage(0);
	};

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" bgcolor="rgb(247, 249, 252)" p={4}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			{error && (
				<Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			<MoleculeViewerDialogue structure_id={viewStructure} open={open} setOpen={setOpen} />
			<PageTitle
				title="Dashboard"
				subtitle={
					<>
						Welcome back, {user?.name}!{' '}
						<span role="img" aria-label="Waving Hand Sign">👋</span>
					</>
				}
			/>
			<JobStatusSection jobs={jobs} />
			<Paper>
				<Toolbar sx={{ justifyContent: 'space-between', bgcolor: blueGrey['A200'] }}>
					<Typography variant="h6" color="text.secondary">
						Jobs History
					</Typography>
					<Box sx={{ display: 'flex', alignItems: 'center' }}>
						<Box>
							<Tooltip title="View job details">
								<IconButton disabled={!selectedJobId} onClick={() => navigate(`/jobs/${selectedJobId}`)}>
									<Visibility />
								</IconButton>
							</Tooltip>
							<Tooltip title="View structures">
								<IconButton disabled={!selectedJobId} onClick={() => {
									const job = filteredJobs.find(job => job.job_id === selectedJobId);
									setViewStructure(job.structures[0].structure_id);
									setOpen(true);
								}}>
									<Image />
								</IconButton>
							</Tooltip>
							<Tooltip title="Filter jobs with same structure">
								<IconButton disabled={!selectedJobId} onClick={() => setSelectedStructure(filteredJobs.find(job => job.job_id === selectedJobId).structures[0].structure_id)}>
									<FilterList />
								</IconButton>
							</Tooltip>
							<Tooltip title="Cancel job">
								<IconButton disabled={!selectedJobId}>
									<Block />
								</IconButton>
							</Tooltip>
						</Box>
						<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
						<Tooltip title="Refresh jobs">
							<IconButton onClick={handleRefresh}>
								<Refresh />
							</IconButton>
						</Tooltip>
						<FormControl sx={{ minWidth: 160, marginLeft: 2 }}>
							<InputLabel>Structure</InputLabel>
							<Select
								value={selectedStructure}
								label="Structure"
								onChange={(e) => setSelectedStructure(e.target.value)}
							>
								{structures.map((s) => (
									<MenuItem key={s.structure_id} value={s.structure_id}>
										{s.name}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Box>
				</Toolbar>
				<Divider />
				<TableContainer>
					<Table>
						<TableHead>
							<TableRow sx={{ bgcolor: blueGrey[50] }}>
								<TableCell sx={{ whiteSpace: 'nowrap' }}>
									<Box
										sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
										onClick={() => handleChangeOrderBy('job_id')}
									>
										<Typography variant="body2">Job ID</Typography>
										<SwapVert fontSize="small" sx={{ ml: 0.5, color: "text.secondary" }} />
									</Box>
								</TableCell>

								<TableCell sx={{ whiteSpace: 'nowrap' }}>
									<Box
										sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
										onClick={() => handleChangeOrderBy('job_name')}
									>
										<Typography variant="body2">Job Name</Typography>
										<SwapVert fontSize="small" sx={{ ml: 0.5, color: "text.secondary" }} />
									</Box>
								</TableCell>

								<TableCell sx={{ whiteSpace: 'nowrap' }}>
									<Box
										sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
										onClick={() => handleChangeOrderBy('status')}
									>
										<Typography variant="body2">Status</Typography>
										<SwapVert fontSize="small" sx={{ ml: 0.5, color: "text.secondary" }} />
									</Box>
								</TableCell>

								<TableCell sx={{ whiteSpace: 'nowrap' }}>
									<Box
										sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
										onClick={() => handleChangeOrderBy('method')}
									>
										<Typography variant="body2">Method</Typography>
										<SwapVert fontSize="small" sx={{ ml: 0.5, color: "text.secondary" }} />
									</Box>
								</TableCell>

								<TableCell sx={{ whiteSpace: 'nowrap' }}>
									<Box
										sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
										onClick={() => handleChangeOrderBy('basis_set')}
									>
										<Typography variant="body2">Basis Set</Typography>
										<SwapVert fontSize="small" sx={{ ml: 0.5, color: "text.secondary" }} />
									</Box>
								</TableCell>

								<TableCell sx={{ whiteSpace: 'nowrap' }}>
									<Box
										sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
										onClick={() => handleChangeOrderBy('structures')}
									>
										<Typography variant="body2">Structures</Typography>
										<SwapVert fontSize="small" sx={{ ml: 0.5, color: "text.secondary" }} />
									</Box>
								</TableCell>

								<TableCell sx={{ whiteSpace: 'nowrap' }}>
									<Box
										sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
										onClick={() => handleChangeOrderBy('submitted_at')}
									>
										<Typography variant="body2">Submitted At</Typography>
										<SwapVert fontSize="small" sx={{ ml: 0.5, color: "text.secondary" }} />
									</Box>
								</TableCell>
							</TableRow>
						</TableHead>

						{filteredJobs.length === 0 ? (
							<TableBody>
								<TableRow>
									<TableCell colSpan={7} align="center">
										No jobs found.
									</TableCell>
								</TableRow>
							</TableBody>
						) : (
							<TableBody>
								{filteredJobs
									.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
									.map((job) => (
										<TableRow
											key={job.job_id}
											onClick={() => handleRowClick(job.job_id)}
											sx={{
												backgroundColor: job.job_id === selectedJobId ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
												cursor: 'pointer'
											}}
										>
											<TableCell>{job.job_id}</TableCell>
											<TableCell>{job.job_name}</TableCell>
											<TableCell>
												<Chip
													label={job.status}
													variant="filled"
													size="small"
													sx={{
														bgcolor: statusColors[job.status] || 'grey.300',
														color: 'white',
														textTransform: 'capitalize',
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
									))}
							</TableBody>
						)}
					</Table>

					<TablePagination
						component="div"
						count={filteredJobs.length}
						page={page}
						onPageChange={handleChangePage}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={handleChangeRowsPerPage}
						rowsPerPageOptions={[5, 10, 25]}
						sx={{ bgcolor: blueGrey['A200'] }}
					/>
				</TableContainer>
			</Paper>
		</Box>
	);
}

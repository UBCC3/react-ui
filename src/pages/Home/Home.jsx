import { useEffect, useState, useRef } from 'react';
import {
	Box,
	Paper,
	Divider,
	TablePagination,
	CircularProgress,
	Alert,
} from '@mui/material';
import { blueGrey } from '@mui/material/colors';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchJobs, fetchStructures, updateStatus } from '../../services/api';
import MoleculeViewerDialogue from '../../components/MoleculeViewerDialogue';
import MolmakerPageTitle from '../../MolmakerFormComponents/MolmakerPageTitle';
import { JobStatus } from '../../constants';
import JobsStatus from './components/JobsStatus';
import JobsToolbar from './components/JobsToolbar';
import JobsTable from './components/JobsTable';

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
			<MolmakerPageTitle
				title="Dashboard"
				subtitle={
					<>
						Welcome back, {user?.name}!{' '}
						<span role="img" aria-label="Waving Hand Sign">👋</span>
					</>
				}
			/>
			<JobsStatus jobs={jobs} />
			<Paper>
				<JobsToolbar
					selectedJobId={selectedJobId}
					onViewDetails={() => navigate(`/jobs/${selectedJobId}`)}
					onViewStructure={() => {
						const job = filteredJobs.find(j => j.job_id === selectedJobId);
						if (job) {
						setViewStructure(job.structures[0].structure_id);
						setOpen(true);
						}
					}}
					onFilterByStructure={() => {
						const job = filteredJobs.find(j => j.job_id === selectedJobId);
						if (job) setSelectedStructure(job.structures[0].structure_id);
					}}
					onCancelJob={() => {/* TODO cancel logic */}}
					onRefresh={handleRefresh}
					structures={structures}
					selectedStructure={selectedStructure}
					onStructureChange={setSelectedStructure}
				/>
				<Divider />
				<JobsTable
					jobs={filteredJobs}
					page={page}
					rowsPerPage={rowsPerPage}
					order={order}
					orderBy={orderBy}
					selectedJobId={selectedJobId}
					onSort={handleChangeOrderBy}
					onRowClick={setSelectedJobId}
				/>
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
			</Paper>
		</Box>
	);
}

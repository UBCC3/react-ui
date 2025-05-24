import React, { useEffect, useState, useRef } from 'react';
import {
	Box,
	Paper,
	Divider,
	TablePagination,
	Dialog,
} from '@mui/material';
import { blueGrey } from '@mui/material/colors';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchJobs, fetchStructures, updateStatus } from '../../services/api';
import MolmakerPageTitle from '../../components/custom/MolmakerPageTitle';
import { JobStatus } from '../../constants';
import JobsStatus from './components/JobsStatus';
import JobsToolbar from './components/JobsToolbar';
import JobsTable from './components/JobsTable';
import { MolmakerMoleculePreview } from '../../components/custom';
import MolmakerLoading from '../../components/custom/MolmakerLoading';
import MolmakerAlert from '../../components/custom/MolmakerAlert';
import type { Job } from '../../types';

export default function Home() {
	const navigate = useNavigate();
	const { user, getAccessTokenSilently } = useAuth0();

	// data state
	const [jobs, setJobs] = useState<Job[]>([]);
	const [structures, setStructures] = useState<{ structure_id: string; name: string }[]>([]);

	// UI state
	const [error, setError] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);
	const [loading, setLoading] = useState(true);

	// selection
	const [selectedJobId, setSelectedJobId] = useState<string>('');
	const [filterStructureId, setFilterStructureId] = useState<string>('');
	const [viewStructureId, setViewStructureId] = useState<string>('');

	// preview state
	const [previewData, setPreviewData] = useState<string>('');
	const [previewFormat, setPreviewFormat] = useState<'xyz' | 'pdb'>('xyz');

	// sorting
	const [order, setOrder] = useState<'asc' | 'desc'>('desc');
	const [orderBy, setOrderBy] = useState<keyof Job>('submitted_at');
	const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

	// track jobs for polling
	const jobsRef = useRef<Job[]>([]);
	useEffect(() => { jobsRef.current = jobs; }, [jobs]);

	// poll statuses every 5s
	useEffect(() => {
		const interval = setInterval(async () => {
			const token = await getAccessTokenSilently();
			for (const job of jobsRef.current) {
				if (![JobStatus.COMPLETED, JobStatus.FAILED].includes(job.status)) {
					try {
						const res = await fetch(`${import.meta.env.VITE_API_URL}/status/${job.slurm_id}`);
						const data = await res.json();
						const newStatus = data.state.toLowerCase();
						await updateStatus(job.job_id, newStatus, token);
						setJobs(prev => prev.map(j =>
							j.job_id === job.job_id ? { ...j, status: newStatus } : j
						));
					} catch (err) {
						console.error('Status check failed:', err);
						setError('Failed to update job status');
					}
				}
			}
		}, 5000);
		return () => clearInterval(interval);
	}, [getAccessTokenSilently]);

	// load jobs & structures
	useEffect(() => {
		setLoading(true);
		(async () => {
			try {
				const token = await getAccessTokenSilently();
				const [jobsRes, structsRes] = await Promise.all([
					fetchJobs(token), fetchStructures(token)
				]);
				setJobs(jobsRes);
				setFilteredJobs(jobsRes);
				const sorted = structsRes.sort((a, b) => a.name.localeCompare(b.name));
				setStructures([{ structure_id: '', name: 'All' }, ...sorted]);
			} catch (err) {
				console.error('Failed to load data', err);
				setError('Failed to load data');
			} finally {
				setLoading(false);
			}
		})();
	}, [getAccessTokenSilently]);

	// fetch preview structure when requested
	useEffect(() => {
		if (!viewStructureId) return;
		setLoading(true);
		setPreviewData('');
		(async () => {
			try {
				const res = await fetch(
					`${import.meta.env.VITE_STORAGE_API_URL}/presigned/${viewStructureId}`
				);
				const { url } = await res.json();
				const fileRes = await fetch(url);
				const text = await fileRes.text();
				setPreviewData(text);
				setPreviewFormat('xyz');
			} catch (err) {
				console.error('Failed to load molecule preview:', err);
				setError('Failed to load structure preview');
			} finally {
				setLoading(false);
			}
		})();
	}, [viewStructureId]);

	// filter jobs when structure filter changes
	useEffect(() => {
		setLoading(true);
		try {
			const filtered = filterStructureId
				? jobs.filter(job => job.structures.some(s => s.structure_id === filterStructureId))
				: jobs;
			setFilteredJobs(filtered);
			setPage(0);
		} catch (err) {
			console.error('Failed to filter jobs:', err);
			setError('Failed to filter jobs');
		} finally {
			setLoading(false);
		}
	}, [filterStructureId, jobs]);

	const handleRefresh = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();
			const refreshed = await fetchJobs(token);
			setJobs(refreshed);
			setFilterStructureId('');
		} catch (err) {
			console.error('Failed to refresh jobs', err);
			setError('Failed to refresh jobs');
		} finally {
			setLoading(false);
		}
	};

	// close preview dialog
	const handleClose = () => {
		setOpen(false);
		setViewStructureId('');
	};

	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			{error && (
				<MolmakerAlert
					text={error}
					severity="error"
					outline="error"
					sx={{ mb: 4 }}
				/>
			)}
			{/* Molecule Preview Dialog */}
			<Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
				<Box sx={{ width: '100%', height: 400 }}>
					<MolmakerMoleculePreview
						data={previewData}
						format={previewFormat}
						source="library"
						title="Molecule Preview"
						sx={{ width: '100%', height: '100%' }}
					/>
				</Box>
			</Dialog>
			<MolmakerPageTitle
				title="Dashboard"
				subtitle={
					<>
						Welcome back, {user?.name}! <span role="img" aria-label="wave">👋</span>
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
						if (job?.structures.length) {
							setViewStructureId(job.structures[0].structure_id);
							setOpen(true);
						}
					}}
					onFilterByStructure={() => {
						const job = filteredJobs.find(j => j.job_id === selectedJobId);
						if (job?.structures.length) {
							setFilterStructureId(job.structures[0].structure_id);
						}
					}}
					onCancelJob={() => {}}
					onRefresh={handleRefresh}
					structures={structures}
					selectedStructure={filterStructureId}
					onStructureChange={setFilterStructureId}
				/>
				<Divider />
				<JobsTable
					jobs={filteredJobs}
					page={page}
					rowsPerPage={rowsPerPage}
					order={order}
					orderBy={orderBy}
					selectedJobId={selectedJobId}
					onSort={(col: keyof Job) => {
						const isAsc = orderBy === col && order === 'asc';
						setOrder(isAsc ? 'desc' : 'asc');
						setOrderBy(col);
						const sorted = [...filteredJobs].sort((a, b) => {
							if (col === 'submitted_at') {
								return isAsc
									? new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
									: new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
							}
							const aVal = String(a[col]);
							const bVal = String(b[col]);
							return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
						});
						setFilteredJobs(sorted);
					}}
					onRowClick={setSelectedJobId}
				/>
				<TablePagination
					component="div"
					count={filteredJobs.length}
					page={page}
					rowsPerPage={rowsPerPage}
					onPageChange={(_, newPage) => setPage(newPage)}
					onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
					rowsPerPageOptions={[5, 10, 25]}
					sx={{ bgcolor: blueGrey.A200 }}
				/>
			</Paper>
		</Box>
	);
}

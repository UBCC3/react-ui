import React, { useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import {
	Box,
	Paper,
	Divider,
	TablePagination,
	Dialog,
	Snackbar,
} from '@mui/material';
import { blueGrey } from '@mui/material/colors';
import { 
	cancelJobBySlurmID,
	getAllJobs, 
	getJobStatusBySlurmID, 
	getLibraryStructures, 
	getStructureDataFromS3, 
	updateJob
} from '../../services/api';
import { JobStatus } from '../../constants';
import JobsStatus from './components/JobsStatus';
import JobsToolbar from './components/JobsToolbar';
import JobsTable from './components/JobsTable';
import {
	MolmakerPageTitle,
	MolmakerMoleculePreview, 
	MolmakerLoading, 
	MolmakerAlert
} from '../../components/custom';
import type { Job, Structure } from '../../types';

export default function Home() {
	const navigate = useNavigate();
	const { user, getAccessTokenSilently } = useAuth0();

	// data state
	const [jobs, setJobs] = useState<Job[]>([]);
	const [structures, setStructures] = useState<Structure[]>([]);

	// UI state
	const [error, setError] = useState<string | null>(null);
	const [open, setOpen] = useState<boolean>(false);
	const [page, setPage] = useState<number>(0);
	const [rowsPerPage, setRowsPerPage] = useState<number>(5);
	const [loading, setLoading] = useState<boolean>(true);

	// selection
	const [selectedJobId, setSelectedJobId] = useState<string>('');
	const [filterStructureId, setFilterStructureId] = useState<string>('');

	// preview state
	const [previewData, setPreviewData] = useState<string>('');

	// sorting
	const [order, setOrder] = useState<'asc' | 'desc'>('desc');
	const [orderBy, setOrderBy] = useState<keyof Job>('submitted_at');
	const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

	// general alert
	const [alertShow, setAlertShow] = useState<boolean>(false);
	const [alertMsg, setAlertMsg] = useState<string>('');
	const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

	// track jobs for polling
	const jobsRef = useRef<Job[]>([]);
	useEffect(() => { jobsRef.current = jobs; }, [jobs]);

	// poll statuses every 5s
	useEffect(() => {
		const tick = async () => {
		try {
			const token = await getAccessTokenSilently();

			// Gather all the changes we need to apply
			const toUpdate: Array<{
				jobId: string;
				newStatus?: string;
				newRuntime?: string;
			}> = [];

			for (const job of jobsRef.current) {
			// skip terminal jobs
			if (
				[JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]
				.includes(job.status)
			) {
				continue;
			}

			// fetch latest from backend
			const resp = await getJobStatusBySlurmID(job.slurm_id!, token);
			if (resp.error) {
				console.warn(`Failed to fetch status for job ${job.job_id}:`, resp.error);
				continue; // skip this job if there's an error
			}
			const fetchedStatus = resp.data.state;
			const fetchedRuntime = resp.data.elapsed;

			// if anything changed, queue it up
			if (
				fetchedStatus !== job.status ||
				fetchedRuntime !== job.runtime
			) {
				toUpdate.push({
					jobId: job.job_id,
					newStatus: fetchedStatus,
					newRuntime: fetchedRuntime,
				});
			}
			}

			if (toUpdate.length === 0) {
				return; // nothing to do
			}

			// Apply updates on the server one by one (or you could Promise.all)
			await Promise.all(
				toUpdate.map(({ jobId, newStatus, newRuntime }) =>
					updateJob(jobId ?? '', newStatus ?? '', newRuntime ?? '', token)
				)
			);

			// And mirror them in local state
			setJobs((prev) =>
			prev.map((j) => {
				const upd = toUpdate.find((u) => u.jobId === j.job_id);
				return upd
				? {
					...j,
					status:  upd.newStatus  ?? j.status,
					runtime: upd.newRuntime ?? j.runtime,
					}
				: j;
			})
			);
		} catch (err: any) {
			console.error("Polling error:", err);
			setError("Failed to refresh job statuses.");
		}
		};

		// start pool
		const id = setInterval(tick, 5000);
		// run immediately once
		tick();

		return () => clearInterval(id);
	}, [getAccessTokenSilently]);

	// load jobs & structures
	useEffect(() => {
		const loadData = async () => {
			try {
				const token = await getAccessTokenSilently();
				const [jobsResponse, structuresResponse] = await Promise.all([
					getAllJobs(token),
					getLibraryStructures(token)
				]);
				
				setJobs(jobsResponse.data);
				setFilteredJobs(jobsResponse.data);

				const sortedStructures = structuresResponse.data.sort((a, b) => a.name.localeCompare(b.name));
				setStructures([{ 
					structure_id: '', 
					name: 'All', 
					user_sub: '', 
					location: '',
					uploaded_at: '',
					notes: ''
				}, ...sortedStructures]);
			} catch (err) {
				setError('Failed to load data');
				console.error('Failed to load data', err);
			} finally {
				setLoading(false);
			}
		}

		setLoading(true);
		loadData();
	}, []);

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
			setError('Failed to filter jobs');
			console.error('Failed to filter jobs:', err);
		} finally {
			setLoading(false);
		}
	}, [filterStructureId, jobs]);

	const openMoleculeViewer = async (structureId: string) => {
		setLoading(true);
		setError(null);

		try {
			const token = await getAccessTokenSilently();
			const response = await getStructureDataFromS3(structureId, token);
			if (response.error) {
				setError('Failed to load molecule structure. Please try again.');
				return;
			}
			setPreviewData(response.data);
			setError(null);
			setOpen(true);
		} catch (err) {
			setError('Failed to load molecule structure. Please try again.');
			console.error("Failed to load molecule structure:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleRefresh = async () => {
		setLoading(true);

		try {
			const token = await getAccessTokenSilently();
			const response = await getAllJobs(token);
			setJobs(response.data);
			setFilterStructureId('');
		} catch (err) {
			setError('Failed to refresh jobs');
			console.error('Failed to refresh jobs', err);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = async () => {
		setLoading(true);
		
		try {
			const token = await getAccessTokenSilently();
			const jobToCancel = jobs.find(j => j.job_id === selectedJobId);
			if (!jobToCancel) {
				setAlertMsg('Selected job not found.');
				setAlertSeverity('error');
				setAlertShow(true);
				setLoading(false);
				return;
			}
			if (!jobToCancel.slurm_id) {
				setAlertMsg('Job Slurm ID is missing.');
				setAlertSeverity('error');
				setAlertShow(true);
				setLoading(false);
				return;
			}
			const response = await cancelJobBySlurmID(jobToCancel.slurm_id, token);
	
			if (response.data === 'cancelled') {
				setAlertMsg(`Job ${jobToCancel.job_name} cancelled successfully!`);
				setAlertSeverity('success');
				setAlertShow(true)
			}
		} catch (err) {
			setAlertMsg('Failed to cancel the job');
			setAlertSeverity('error');
			setAlertShow(true);
			console.error('Failed to cancel the job', err);
		} finally {
			setLoading(false);
		}
	};

	const cancelDisabled = (selectedJobId: string | null) : boolean => {
		if (!selectedJobId) {
			return true;
		}

		const jobToCancel = jobs.find(j => j.job_id === selectedJobId);
		if (!jobToCancel) {
			return true;
		}
		if ([JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED].includes(jobToCancel.status)) {
			return true
		}

		return false
	}

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
			{/* Structure Preview Dialog */}
			<Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
				<Box sx={{ width: '100%', height: 400 }}>
					<MolmakerMoleculePreview
						data={previewData}
						format='xyz'
						source="library"
						title="Structure Preview"
						sx={{ width: '100%', height: '100%' }}
					/>
				</Box>
			</Dialog>
			<Box
				sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
			>
				<Snackbar 
					open={alertShow} 
					autoHideDuration={5000}
					onClose={() => { setAlertShow(false) }}
					anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
					sx={{ top: { xs: '48px', sm: '80px' } }}
				>
					<div>
						<MolmakerAlert
							text={alertMsg}
							severity={alertSeverity}
							outline={alertSeverity}
							sx={{ mb: 2, maxWidth: 500 }}
						/>
					</div>
				</Snackbar>
			</Box>
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
							openMoleculeViewer(job.structures[0].structure_id);
						}
					}}
					onFilterByStructure={() => {
						const job = filteredJobs.find(j => j.job_id === selectedJobId);
						if (job?.structures.length) {
							setFilterStructureId(job.structures[0].structure_id);
						}
					}}
					cancelDisabled={cancelDisabled}
					onCancelJob={handleCancel}
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

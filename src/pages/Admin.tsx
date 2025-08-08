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
	Button,
	Typography,
	Grid,
	FormGroup,
	Checkbox,
	FormControlLabel,
	Select,
	MenuItem,
	TextField,
	IconButton,
	Card,
	CircularProgress
} from '@mui/material';
import { blueGrey, grey, blue } from '@mui/material/colors';
import { 
	cancelJobBySlurmID,
	adminGetAllJobs, 
	getJobStatusBySlurmID, 
	getLibraryStructures, 
	getStructureDataFromS3, 
	updateJob,
	deleteJob
} from '../services/api';
import { JobStatus } from '../constants';
import JobsToolbar from './Home/components/JobsToolbar';
import {
	MolmakerPageTitle,
	MolmakerMoleculePreview, 
	MolmakerLoading, 
	MolmakerAlert,
	MolmakerConfirm
} from '../components/custom';
import type { Job, Structure } from '../types';
import { DeleteOutlineOutlined, Add, ManageSearchOutlined } from '@mui/icons-material';
import AdminJobsTable from './Home/components/AdminJobsTable';

export default function Admin() {
	const navigate = useNavigate();
	const { user, getAccessTokenSilently } = useAuth0();

	// confirm delete job
	const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false);
	const handleOpenConfirmDelete = () => setOpenConfirmDelete(true);

	// data state
	const [jobs, setJobs] = useState<Job[]>([]);
	const [structures, setStructures] = useState<Structure[]>([]);

	// UI state
	const [error, setError] = useState<string | null>(null);
	const [open, setOpen] = useState<boolean>(false);
	const [page, setPage] = useState<number>(0);
	const [rowsPerPage, setRowsPerPage] = useState<number>(5);
	const [loading, setLoading] = useState<boolean>(true);
	const [structureLoading, setStructureLoading] = useState<boolean>(false);

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

	const [filters, setFilters] = useState<Array<{
		column: keyof Job;
		value: string;
		extent: 'contains' | 'equals' | 'startsWith';
	}>>([{ column: 'job_name', value: '', extent: 'contains' }]);

	const [adminPanelToken, setAdminPanelToken] = useState<string | null>(null);


	// map column name to display name
	const columnDisplayNames: Record<any, string> = {
		job_id: 'Job ID',
		job_name: 'Job Name',
		user_email: 'User Email',
		group_id: 'Group ID',
		group_name: 'Group Name',
		job_notes: 'Job Notes',
		status: 'Status',
		structures: 'Structures',
		tags: 'Tags',
		runtime: 'Runtime',
		submitted_at: 'Submitted At',
		completed_at: 'Completed At',
	}

	const [displayColumns, setDisplayColumns] = useState({
		job_id: true,
		job_name: true,
		user_email: true,
		group_id: true,
		group_name: true,
		job_notes: true,
		status: true,
		structures: true,
		tags: true,
		runtime: true,
		submitted_at: true,
		completed_at: true
	});

	// track jobs for polling
	const jobsRef = useRef<Job[]>([]);
	useEffect(() => { jobsRef.current = jobs; }, [jobs]);

	// Store token for AdminGroupPanel
	useEffect(() => {
		getAccessTokenSilently().then(setAdminPanelToken).catch(() => setAdminPanelToken(null));
	}, [getAccessTokenSilently]);

	const handleFilterSubmit = () => {
		setLoading(true);
		try {
			let filtered = jobsRef.current;

			// Apply each filter
			for (const filter of filters) {
				filtered = filtered.filter(job => {
					let jobValue = '';
					if (filter.column === 'structures') {
						jobValue = job.structures.map(s => s.name).join(', ').toLowerCase();
					} else {
						jobValue = String(job[filter.column] ?? '').toLowerCase();
					}
					const filterValue = filter.value.toLowerCase();

					switch (filter.extent) {
						case 'contains':
							if (filter.column === 'tags' || filter.column === 'structures') {
								console.log(job[filter.column], filterValue);
								// Special handling for tags and structures
								console.log("Filtering by tags or structures:", jobValue, filterValue);
								return jobValue.split(',').some(tag => tag.trim().toLowerCase().includes(filterValue));
							}
							// Default contains behavior
							return jobValue.includes(filterValue);
						case 'equals':
							if (filter.column === 'tags' || filter.column === 'structures') {
								// Special handling for tags and structures
								return jobValue.split(',').some(tag => tag.trim().toLowerCase() === filterValue);
							}
							return jobValue === filterValue;
						case 'startsWith':
							if (filter.column === 'tags' || filter.column === 'structures') {
								// Special handling for tags and structures
								return jobValue.split(',').some(tag => tag.trim().toLowerCase().startsWith(filterValue));
							}
							return jobValue.startsWith(filterValue);
						default:
							return true; // no filter applied
					}
				});
			}

			setFilteredJobs(filtered);
			setPage(0); // reset to first page
		} catch (err) {
			setError('Failed to apply filters');
			console.error('Failed to apply filters:', err);
		} finally {
			setLoading(false);
		}
	}

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
				userSub?: string;
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
				continue;
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
					userSub: job.user_sub,
					newStatus: fetchedStatus,
					newRuntime: fetchedRuntime,
				});
			}
			}

			if (toUpdate.length === 0) {
				return;
			}

			// Apply updates on the server
			await Promise.all(
				toUpdate.map(({ jobId, newStatus, newRuntime, userSub }) =>
					updateJob(jobId ?? '', newStatus ?? '', newRuntime ?? '', userSub ?? '', token)
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
					adminGetAllJobs(token),
					getLibraryStructures(token)
				]);
				
				setJobs(jobsResponse.data.filter(job => job.is !== JobStatus.PENDING));
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
		console.log("Opening molecule viewer for structure ID:", structureId);
		setStructureLoading(true);
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
			// setOpen(true);
		} catch (err) {
			setError('Failed to load molecule structure. Please try again.');
			console.error("Failed to load molecule structure:", err);
		} finally {
			setStructureLoading(false);
		}
	};

	const handleRefresh = async () => {
		setLoading(true);

		try {
			const token = await getAccessTokenSilently();
			const response = await adminGetAllJobs(token);
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

	const handleDelete = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();
			const response = await deleteJob(selectedJobId, token);
			if (response.error) {
				setAlertMsg('Failed to delete the job');
				setAlertSeverity('error');
				setAlertShow(true);
				return;
			}
			setJobs(jobs.filter(job => job.job_id !== selectedJobId));
			setSelectedJobId('');
			setAlertMsg('Job deleted successfully!');
			setAlertSeverity('success');
			setAlertShow(true);
		} catch (err) {
			setAlertMsg('Failed to delete the job');
			setAlertSeverity('error');
			setAlertShow(true);
			console.error('Failed to delete the job', err);
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

	const deleteDisabled = (selectedJobId: string | null) : boolean => {
		if (!selectedJobId) {
			return true;
		}
		const jobToDelete = jobs.find(j => j.job_id === selectedJobId);
		if (!jobToDelete) {
			return true;
		}
		if ([JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED].includes(jobToDelete.status)) {
			return false;
		}
		return true;
	}

	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
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
			<MolmakerConfirm
				open={openConfirmDelete}
				onClose={() => setOpenConfirmDelete(false)}
				textToShow={
					"Are you sure you want to delete this row? This action cannot be undone."
				}
				onConfirm={() => {
					handleDelete();
					setOpenConfirmDelete(false);
				}}
			/>
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
				title="Admin Dashboard"
				subtitle={
					<>
						Welcome to the admin dashboard. Here you can manage jobs, users, and groups.
					</>
				}
			/>
			<Grid container spacing={2} sx={{ mb: 4 }} size={12}>
				<Grid size={{ xs: 12, sm: 7 }}>
					<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50] }}>
						<Typography 
							variant="h6" 
							color={grey[800]}
							sx={{ p: 2, display: 'flex', alignItems: 'center', borderTopLeftRadius: 5, borderTopRightRadius: 5, fontWeight: 'bold', fontSize: '1.1rem' }}
						>
							<ManageSearchOutlined sx={{ mr: 1, color: blue[600] }} />
							Custom Query
						</Typography>
						<Box sx={{ px: 2 }}>
							<Typography variant="body2" color={grey[600]} sx={{ mb: 2, mt: 1, fontWeight: 'bold' }}>
								Show columns
							</Typography>
							<FormGroup
								sx={{
									display: 'grid',
									gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
									gap: 1,
									mt: 1,
								}}
							>
								{Object.keys(columnDisplayNames).map((col) => (
									<FormControlLabel
										key={col}
										control={
											<Checkbox
												checked={displayColumns[col as keyof Job]}
												onChange={(e) => {
													setDisplayColumns(prev => ({
														...prev,
														[col as keyof Job]: e.target.checked
													}));
												}}
												color="primary"
												size="small"
											/>
										}
										label={
											<span className='text-xs text-gray-600 font-semibold'>
												{columnDisplayNames[col as keyof Job].toUpperCase()}
											</span>
										}
									/>
								))}
							</FormGroup>
						</Box>
						<Box sx={{ px: 2, py: 2 }}>
							<Typography variant="body2" color={grey[600]} sx={{ mb: 2, fontWeight: 'bold' }}>
								Filter
							</Typography>
							{/* Each filter row on its own line */}
							<Box sx={{ bgcolor: grey[200], p: 3, borderRadius: 2 }}>
								{filters.map((filter, index) => (
									<Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
										<Select
											value={filter.column}
											size='small'
											onChange={(e) => {
												const newFilters = [...filters];
												newFilters[index] = {
													...newFilters[index],
													column: e.target.value as keyof Job
												};
												setFilters(newFilters);
											}}
											sx={{ minWidth: 120, mr: 1 }}
										>
											{Object.keys(columnDisplayNames).map(col => (
												<MenuItem key={col} value={col}>{columnDisplayNames[col as keyof Job]}</MenuItem>
											))}
										</Select>
										<Select
											value={filter.extent}
											size='small'
											onChange={(e) => {
												const newFilters = [...filters];
												newFilters[index] = {
													...newFilters[index],
													extent: e.target.value as 'contains' | 'equals' | 'startsWith'
												};
												setFilters(newFilters);
											}}
											sx={{ minWidth: 120, mr: 1 }}
										>
											<MenuItem value="contains">Contains</MenuItem>
											<MenuItem value="equals">Equals</MenuItem>
											<MenuItem value="startsWith">Starts With</MenuItem>
										</Select>
										<TextField
											variant="outlined"
											size="small"
											value={filter.value}
											onChange={(e) => {
												const newFilters = [...filters];
												newFilters[index] = {
													...newFilters[index],
													value: e.target.value
												};
												setFilters(newFilters);
											}}
											sx={{ flexGrow: 1, mr: 1 }}
										/>
										<IconButton
											color="error"
											onClick={() => {
												const newFilters = [...filters];
												newFilters.splice(index, 1);
												setFilters(newFilters);
											}}
											sx={{ ml: 1 }}
										>
											<DeleteOutlineOutlined />
										</IconButton>
									</Box>
								))}
								{/* Add Filter button always directly below all filters */}
								<Button
									variant="outlined"
									color="primary"
									size="small"
									startIcon={<Add />}
									sx={{ mt: 1, textTransform: 'none' }}
									onClick={() => {
										setFilters([...filters, { column: 'job_name', value: '', extent: 'contains' }]);
									}}
								>
									Add Filter
								</Button>
								<Button
									variant="contained"
									color="primary"
									size="small"
									onClick={handleFilterSubmit}
									sx={{ mt: 2, textTransform: 'none', display: 'block' }}
									fullWidth
								>
									Apply Filters
								</Button>
							</Box>
						</Box>
					</Paper>
				</Grid>
				<Grid size={{ xs: 12, sm: 5 }}>
					{structureLoading ? (
						<Card
							sx={{
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								backgroundColor: blueGrey[50],
								height: '100%',
							}}
						>
							<CircularProgress />
						</Card>
					) : (
						<MolmakerMoleculePreview
							data={previewData}
							format='xyz'
							source={'library'}
							sx={{ maxHeight: '100%' }}
						/>
					)}
				</Grid>
			</Grid>
			<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50], mb: 4 }}>
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
					viewStructureDisabled={!selectedJobId || !filteredJobs.find(j => j.job_id === selectedJobId)?.structures.length}
					cancelDisabled={cancelDisabled}
					deleteDisabled={deleteDisabled}
					onCancelJob={handleCancel}
					onDeleteJob={handleOpenConfirmDelete}
					onRefresh={handleRefresh}
					structures={structures}
					selectedStructure={filterStructureId}
					onStructureChange={setFilterStructureId}
					isGroupAdmin={true}
				/>
				<AdminJobsTable
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
					displayColumns={displayColumns}
				/>
				<TablePagination
					component="div"
					count={filteredJobs.length}
					page={page}
					rowsPerPage={rowsPerPage}
					onPageChange={(_, newPage) => setPage(newPage)}
					onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
					rowsPerPageOptions={[5, 10, 25]}
				/>
			</Paper>
		</Box>
	);
}

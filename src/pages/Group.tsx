import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import {
	Box,
	Paper,
	Divider,
	TablePagination,
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
import { blue, blueGrey, grey } from '@mui/material/colors';
import { 
	cancelJobBySlurmID,
	getJobStatusBySlurmID, 
	getLibraryStructures, 
	getStructureDataFromS3, 
	updateJob,
	deleteJob,
	getCurrentUserGroupJobs,
	upsertCurrentUser,
} from '../services/api';
import { JobStatus } from '../constants';
import JobsToolbar from './Home/components/JobsToolbar';
import {
	MolmakerPageTitle,
	MolmakerMoleculePreview, 
	MolmakerAlert,
	MolmakerConfirm
} from '../components/custom';
import type { Job, Structure } from '../types';
import { DeleteOutlineOutlined, Add, FilterAltOutlined, ManageSearchOutlined } from '@mui/icons-material';
import GroupPanel from '../components/GroupPanel';
import GroupJobsTable from './Home/components/GroupJobsTable';

export default function Group() {
	// map column name to display name
	const columnDisplayNames: Record<any, string> = {
		job_name: 'Job Name',
		job_notes: 'Job Notes',
		status: 'Status',
		structures: 'Structures',
		tags: 'Tags',
		runtime: 'Runtime',
		submitted_at: 'Submitted At',
		completed_at: 'Completed At',
		is_public: 'Visibility',
	}

	const [displayColumns, setDisplayColumns] = useState({
		job_name: true,
		job_notes: true,
		status: true,
		structures: true,
		tags: true,
		runtime: true,
		submitted_at: true,
		completed_at: true,
		is_public: true,
	});

	// Router and Auth hooks
	const navigate = useNavigate();
	const { user, getAccessTokenSilently } = useAuth0();

	// Admin panel token and user role
	const [adminPanelToken, setAdminPanelToken] = useState<string | null>(null);
	const [userRole, setUserRole] = useState<string>('');

	// Data states
	const [jobs, setJobs] = useState<Job[]>([]);
	const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
	const [structures, setStructures] = useState<Structure[]>([]);

	// UI states
	const [loading, setLoading] = useState(true);
	const [structureLoading, setStructureLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	// Selection & preview
	const [selectedJobId, setSelectedJobId] = useState<string>('');
	const [previewData, setPreviewData] = useState<string>('');

	// Filters
	const [filterStructureId, setFilterStructureId] = useState<string>('');
	const [filters, setFilters] = useState<Array<{ column: keyof Job; value: string; extent: 'contains' | 'equals' | 'startsWith' }>>([
		{ column: 'job_name', value: '', extent: 'contains' }
	]);

	// Sorting
	const [order, setOrder] = useState<'asc' | 'desc'>('desc');
	const [orderBy, setOrderBy] = useState<keyof Job>('submitted_at');

	// Alerts & confirmation
	const [alertShow, setAlertShow] = useState(false);
	const [alertMsg, setAlertMsg] = useState('');
	const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	// Track jobs for polling
	const jobsRef = useRef<Job[]>([]);
	useEffect(() => { jobsRef.current = jobs; }, [jobs]);

	// Initialize token and role
	useEffect(() => {
		getAccessTokenSilently()
			.then(token => setAdminPanelToken(token))
			.catch(() => setAdminPanelToken(null));

		(async () => {
			const token = await getAccessTokenSilently();
			const { data: ud } = await upsertCurrentUser(token, user?.email || '');
			setUserRole(ud.role || '');
		})();
	}, [getAccessTokenSilently, user?.email]);

	// Load jobs & structures (and apply structure filter immediately)
	useEffect(() => {
		setLoading(true);
		(async () => {
			try {
				const token = await getAccessTokenSilently();
				const [jr, sr] = await Promise.all([
					getCurrentUserGroupJobs(token),
					getLibraryStructures(token),
				]);
				setJobs(jr.data);
				// Apply structure filter if set
				const initial = filterStructureId
					? jr.data.filter(j => j.structures.some(s => s.structure_id === filterStructureId))
					: jr.data;
				setFilteredJobs(initial);
				// Prep structure list
				const sortedStructs = sr.data.sort((a,b) => a.name.localeCompare(b.name));
				setStructures([{ structure_id:'', name:'All', user_sub:'', location:'', uploaded_at:'', notes:'' }, ...sortedStructs]);
			} catch (e) {
				console.error(e);
				setError('Failed to load data');
			} finally {
				setLoading(false);
			}
		})();
	}, [getAccessTokenSilently, filterStructureId]);

	// Poll job statuses every 5s
	useEffect(() => {
		let id: ReturnType<typeof setInterval>;
		const tick = async () => {
			try {
				const token = await getAccessTokenSilently();
				const toUpdate: Array<{ jobId:string; newStatus:string; newRuntime:string; userSub:string }> = [];
				for (const j of jobsRef.current) {
					if ([JobStatus.COMPLETED,JobStatus.FAILED,JobStatus.CANCELLED].includes(j.status)) continue;
					const r = await getJobStatusBySlurmID(j.slurm_id!, token);
					if (r.error) continue;
					const { state, elapsed } = r.data;
					if (state !== j.status || elapsed !== j.runtime) {
						toUpdate.push({ jobId:j.job_id, newStatus:state, newRuntime:elapsed, userSub:j.user_sub });
					}
				}
				if (toUpdate.length) {
					await Promise.all(toUpdate.map(u =>
						updateJob(u.jobId, u.newStatus, u.newRuntime, u.userSub, token)
					));
					setJobs(prev => prev.map(j => {
						const u = toUpdate.find(x => x.jobId === j.job_id);
						return u ? { ...j, status:u.newStatus, runtime:u.newRuntime } : j;
					}));
				}
			} catch (e) {
				console.error(e);
				setError('Failed to refresh job statuses.');
			}
		};
		tick();
		id = setInterval(tick, 5000);
		return () => clearInterval(id);
	}, [getAccessTokenSilently]);

	// Apply custom filters
	const handleFilterSubmit = useCallback(() => {
		setLoading(true);
		try {
			let res = [...jobsRef.current];
			filters.forEach(f => {
				const val = f.value.toLowerCase();
				res = res.filter(job => {
					const raw = f.column === 'structures'
						? job.structures.map(s=>s.name).join(',').toLowerCase()
						: String(job[f.column] ?? '').toLowerCase();
					if (['tags','structures'].includes(f.column)) {
						const arr = raw.split(',').map(x=>x.trim());
						return arr.some(x =>
							f.extent==='contains' ? x.includes(val) :
							f.extent==='equals'   ? x===val :
							x.startsWith(val)
						);
					}
					return f.extent==='contains' ? raw.includes(val) :
						f.extent==='equals'   ? raw===val :
						raw.startsWith(val);
				});
			});
			setFilteredJobs(res);
			setPage(0);
		} catch {
			setError('Failed to apply filters');
		} finally {
			setLoading(false);
		}
	}, [filters]);

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
			const response = await getCurrentUserGroupJobs(token);
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

	// Confirmation & alert helpers
	const showAlert = (msg:string, sev:typeof alertSeverity) => {
		setAlertMsg(msg);
		setAlertSeverity(sev);
		setAlertShow(true);
	};
	const confirmDelete = () => setConfirmDeleteOpen(true);

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
			<MolmakerConfirm
				open={confirmDeleteOpen}
				onClose={() => setConfirmDeleteOpen(false)}
				onConfirm={handleDelete}
				textToShow="Are you sure you want to delete this job? This action cannot be undone."
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
				title="Group Dashboard"
				subtitle={
					<>
						Welcome to the group dashboard. Here you can manage jobs and structures within your group.
					</>
				}
			/>
			{adminPanelToken && <GroupPanel token={adminPanelToken} />}

			{/* Filters */}
			<Grid container spacing={2} sx={{ mb: 4 }} size={12}>
				<Grid size={{ xs: 12, sm: 7 }}>
					<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50] }}>
						<Typography 
							variant="h6" 
							color={grey[800]}
							sx={{ p: 2, display: 'flex', alignItems: 'center', borderTopLeftRadius: 5, borderTopRightRadius: 5, fontWeight: 'bold', fontSize: '1.1rem' }}
						>
							<ManageSearchOutlined sx={{ mr: 1, color: blue[600] }} />
							Filters
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
								bgcolor: grey[200],
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
							sx={{ height:'100%' }}
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
					onDeleteJob={confirmDelete}
					onRefresh={handleRefresh}
					structures={structures}
					selectedStructure={filterStructureId}
					onStructureChange={setFilterStructureId}
					isGroupAdmin={userRole === 'group_admin'}
				/>
				<GroupJobsTable
					jobs={filteredJobs}
					loading={loading}
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
					isGroupAdmin={userRole === 'group_admin'}
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

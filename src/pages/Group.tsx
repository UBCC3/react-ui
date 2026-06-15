import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import {
	Box,
	Paper,
	Divider,
	TablePagination,
	Snackbar
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
	getZipPresignedUrl
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

    // tracks which columns are currently visible in the jobs table.
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

                // Fetch jobs and structures in parallel to reduce loading time.
				const [jr, sr] = await Promise.all([
					getCurrentUserGroupJobs(token),
					getLibraryStructures(token),
				]);

                // Store all group jobs.
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

                // Stores jobs whose status or runtime changed since the last poll.
				const toUpdate: Array<{ jobId:string; newStatus:string; newRuntime:string; userSub:string }> = [];

				for (const j of jobsRef.current) {
                    // Skip jobs that are alreadiy in a final state.
					if ([JobStatus.COMPLETED,JobStatus.FAILED,JobStatus.CANCELLED,
                         JobStatus.OUT_OF_MEMORY, JobStatus.TIMEOUT].includes(j.status)) continue;

                    // Fetch the latest Slurm status for this job.
					const r = await getJobStatusBySlurmID(j.slurm_id!, token);

                    // Ignore failed polling results for this specific job.
					if (r.error) continue;

					const { state, elapsed } = r.data;

                    // Queue an update only when status or runtime has actually changed.
					if (state !== j.status || elapsed !== j.runtime) {
						toUpdate.push({ jobId:j.job_id, newStatus:state, newRuntime:elapsed, userSub:j.user_sub });
					}
				}

                // Persist changed statuses to the backend and update local state.
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

        // Run immediately, then continue polling every 5 seconds.
		tick();
		id = setInterval(tick, 5000);
        
        // Stop polling when the component unmounts.
		return () => clearInterval(id);
	}, [getAccessTokenSilently]);

	// Apply custom filters
	const handleFilterSubmit = useCallback(() => {
		setLoading(true);
		try {
            // Start from the latest jobs stored in the ref.
			let res = [...jobsRef.current];
			filters.forEach(f => {
				const val = f.value.toLowerCase();
				res = res.filter(job => {
                    // Structures need special handling because they are stored as an array.
					const raw = f.column === 'structures'
						? job.structures.map(s=>s.name).join(',').toLowerCase()
						: String(job[f.column] ?? '').toLowerCase();

                    // Tags and structures may contain multiple comma-separated values.
					if (['tags','structures'].includes(f.column)) {
						const arr = raw.split(',').map(x=>x.trim());
						return arr.some(x =>
							f.extent==='contains' ? x.includes(val) :
							f.extent==='equals'   ? x===val :
							x.startsWith(val)
						);
					}
                    
                    // Apply the selected comparison mode to normal text fields.
					return f.extent==='contains' ? raw.includes(val) :
						f.extent==='equals'   ? raw===val :
						raw.startsWith(val);
				});
			});

            // Update the table and return to the first page.
			setFilteredJobs(res);
			setPage(0);
		} catch {
			setError('Failed to apply filters');
		} finally {
			setLoading(false);
		}
	}, [filters]);

    // Loads molecule structure data from S3 and displays it in the preview component.
	const openMoleculeViewer = async (structureId: string) => {
		console.log("Opening molecule viewer for structure ID:", structureId);
		setStructureLoading(true);
		setError(null);

		try {
			const token = await getAccessTokenSilently();

            // Retrieve the molecule file data through the backend
			const response = await getStructureDataFromS3(structureId, token);
			if (response.error) {
				setError('Failed to load molecule structure. Please try again.');
				return;
			}

            // Store the molecule data so the preview component can render it.
			setPreviewData(response.data);
			setError(null);
		} catch (err) {
			setError('Failed to load molecule structure. Please try again.');
			console.error("Failed to load molecule structure:", err);
		} finally {
			setStructureLoading(false);
		}
	};

    // Refreshes group jobs from the backend and clears the active structure filter
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

    // Cancels the currently selected job using its Slurm ID.
	const handleCancel = async () => {
		setLoading(true);
		
		try {
			const token = await getAccessTokenSilently();

            // Find the selected job before attempting cancellation
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

            // Ask the backend or Slurm service to cancel the job.
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

    // Deletes the selected job from the backend and removes it from local state.
	const handleDelete = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();

            // Request deletion of the selected job.
			const response = await deleteJob(selectedJobId, token);
			if (response.error) {
				setAlertMsg('Failed to delete the job');
				setAlertSeverity('error');
				setAlertShow(true);
				return;
			}

            // Remove the deleted job from the local jobs list.
			setJobs(jobs.filter(job => job.job_id !== selectedJobId));

            // Clear the current row selection after deleting.
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

    // Returns true when the cancel action should be disabled.
	const cancelDisabled = (selectedJobId: string | null) : boolean => {
		if (!selectedJobId) {
			return true;
		}

		const jobToCancel = jobs.find(j => j.job_id === selectedJobId);
		if (!jobToCancel) {
			return true;
		}

        // Final-state jobs cannot be cancelled again.
		if ([JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED,
             JobStatus.OUT_OF_MEMORY, JobStatus.TIMEOUT].includes(jobToCancel.status)) {
			return true
		}

		return false
	}

    // Returns true when the delete action should be disabled.
	const deleteDisabled = (selectedJobId: string | null) : boolean => {
		if (!selectedJobId) {
			return true;
		}
		const jobToDelete = jobs.find(j => j.job_id === selectedJobId);
		if (!jobToDelete) {
			return true;
		}

        // Only completed, failed, or cancelled jobs can be deleted.
		if ([JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED,
             JobStatus.OUT_OF_MEMORY, JobStatus.TIMEOUT].includes(jobToDelete.status)) {
			return false;
		}
		return true;
	}

    // Downloads a ZIP file from a presigned S3 URL using a temporary browser blob.
	async function downloadZipFromS3WithBlob(presignedUrl: string, filename = "result.zip") {
		const response = await fetch(presignedUrl);
		if (!response.ok) throw new Error("Failed to download file");

        // Convert the response into a browser-downloadable blob.
		const blob = await response.blob();
		const blobUrl = window.URL.createObjectURL(blob);

        // Create a temporary link and click it programmatically to start the download.
		const link = document.createElement("a");
		link.href = blobUrl;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Clean up
		window.URL.revokeObjectURL(blobUrl);
	}

    // Retrieves a presigned ZIP URL for the selected job and downloads the archive.
	const handleZipDownload = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();

            // Ask the backend for a temporary S3 download link.
			const response = await getZipPresignedUrl(selectedJobId, token);
			if (response.error) {
				setAlertMsg('Failed to download the job archive');
				setAlertSeverity('error');
				setAlertShow(true);
				return;
			}
			const jobToDownloadZip = jobs.find(j => j.job_id === selectedJobId);
			if (!jobToDownloadZip) {
				setAlertMsg('Selected job not found.');
				setAlertSeverity('error');
				setAlertShow(true);
				setLoading(false);
				return;
			}
			const zipUrl: string = response.data.url;

            // Download the ZIP file using the job name as the filename.
			await downloadZipFromS3WithBlob(zipUrl, `${jobToDownloadZip.job_name}.zip`);
			setSelectedJobId('');
			setAlertMsg('Job archive download successfully!');
			setAlertSeverity('success');
			setAlertShow(true);
		} catch (err) {
			setAlertMsg('Failed to download the job archive');
			setAlertSeverity('error');
			setAlertShow(true);
			console.error('Failed to download the job', err);
		} finally {
			setLoading(false);
		}
	}
	
    // Returns true when the ZIP download action should be disabled.
	const downloadDisabled = (selectedJobId: string | null): boolean => {
		if (!selectedJobId) { return true; }

		const jobToDownloadZip = jobs.find(j => j.job_id === selectedJobId);
		if (!jobToDownloadZip) { return true; }

        // Archives are not downloadable while jobs are active, pending, cancelled, unknown, out of memory, or timeout.
		if ([JobStatus.CANCELLED, JobStatus.PENDING, JobStatus.RUNNING, 
            JobStatus.UNKNOWN, JobStatus.OUT_OF_MEMORY, JobStatus.TIMEOUT]
            .includes(jobToDownloadZip.status)) {
			return true
		}

		return false
	}

	// Confirmation & alert helpers
	const showAlert = (msg:string, sev:typeof alertSeverity) => {
		setAlertMsg(msg);
		setAlertSeverity(sev);
		setAlertShow(true);
	};

    // Opens the delete confirmation dialog.
	const confirmDelete = () => setConfirmDeleteOpen(true);

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
            {/* Display a page-level error alert when an error message exists. */}
			{error && (
				<MolmakerAlert
					text={error}
					severity="error"
					outline="error"
					sx={{ mb: 4 }}
				/>
			)}

            {/*  Confirmation modal shown before deleting a selected job. */}
			<MolmakerConfirm
				open={confirmDeleteOpen}
				onClose={() => setConfirmDeleteOpen(false)}
				onConfirm={handleDelete}
				textToShow="Are you sure you want to delete this job? This action cannot be undone."
			/>

            {/* Snackbar wrapper for success, error, info, and warning messages. */}
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

            {/* Page heading and short description */}
			<MolmakerPageTitle
				title="Group Dashboard"
				subtitle={
					<>
						Welcome to the group dashboard. Here you can manage jobs and structures within your group.
					</>
				}
			/>

            {/* Show the group admin panel only after an access token is available. */}
			{adminPanelToken && userRole === 'group_admin' && <GroupPanel token={adminPanelToken} />}

            {/* Main group jobs table section. */}
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
					onZipDownload={handleZipDownload}
					downloadDisabled={downloadDisabled}
					isGroupAdmin={userRole === 'group_admin'}

                    displayColumns={displayColumns}
                    columnDisplayNames={columnDisplayNames}
                    onColumnToggle={(col, checked) =>
                        setDisplayColumns(prev => ({ ...prev, [col]: checked}))
                    }
                    filters={filters}
                    onFiltersChange={setFilters}
                    onFilterSubmit={handleFilterSubmit}
				/>

                {/* Group jobs table with sorting, pagination, selection, and column visibility. */}
				<GroupJobsTable
					jobs={filteredJobs}
					loading={loading}
					page={page}
					rowsPerPage={rowsPerPage}
					order={order}
					orderBy={orderBy}
					selectedJobId={selectedJobId}
					onSort={(col: keyof Job) => {
                        // Toggle direction when sorting by the same column again.
						const isAsc = orderBy === col && order === 'asc';
						setOrder(isAsc ? 'desc' : 'asc');
						setOrderBy(col);

                        // Sort dates numerically and other columns alphabetically.
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

                {/* Pagination controls for the jobs table. */}
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

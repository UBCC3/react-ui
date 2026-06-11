import React, { useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import {
	Box,
	Paper,
	TablePagination,
	Dialog,
	Snackbar,
} from '@mui/material';
import { blueGrey, grey, blue } from '@mui/material/colors';
import { 
	cancelJobBySlurmID,
	adminGetAllJobs, 
	getJobStatusBySlurmID, 
	getLibraryStructures, 
	getStructureDataFromS3, 
	updateJob,
	deleteJob,
	getZipPresignedUrl,
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
import AdminJobsTable from './Home/components/AdminJobsTable';

export default function Admin() {
    // used to redirect the user after the job is successfully submitted
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

    // stores all custom table filters created by the user.
	const [filters, setFilters] = useState<Array<{
		column: keyof Job;
		value: string;
		extent: 'contains' | 'equals' | 'startsWith';
	}>>([{ column: 'job_name', value: '', extent: 'contains' }]);

    // stores the Auth0 access token passed down to admin-related child components.
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

    // tracks which table columns shoul be displayed
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

    // Applies all custom filters to the current jobs list.
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
				[JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED,
                 JobStatus.OUT_OF_MEMORY, JobStatus.TIMEOUT]
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

            // Do nothing if every tracked job is already up to date.
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

		// start polling every 5 seconds
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

                // Fetch jobs and library structures in parallel.
				const [jobsResponse, structuresResponse] = await Promise.all([
					adminGetAllJobs(token),
					getLibraryStructures(token)
				]);
				
                // Store jobs, excluding pending jobs from the main jobs list.
				setJobs(jobsResponse.data.filter(job => job.is !== JobStatus.PENDING));
				setFilteredJobs(jobsResponse.data);

                // Sort structures alphabetically for easier dropdown navigation.
				const sortedStructures = structuresResponse.data.sort((a, b) => a.name.localeCompare(b.name));

                // Add a default "All" option before the real structures.
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

    // Loads molecule data for a selected structure and displays it in the preview area.
	const openMoleculeViewer = async (structureId: string) => {
		console.log("Opening molecule viewer for structure ID:", structureId);
		setStructureLoading(true);
		setError(null);

		try {
			const token = await getAccessTokenSilently();

            // Fetch the structure file contents from S3 through the backend.
			const response = await getStructureDataFromS3(structureId, token);
			if (response.error) {
				setError('Failed to load molecule structure. Please try again.');
				return;
			}
            
            // Store the molecule data so MolmakerMoleculePreview can render it.
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

    // Refreshes jobs from the backend and clears the active structure filter.
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

    // Cancels the currently selected job using its Slurm ID.
	const handleCancel = async () => {
		setLoading(true);
		
		try {
			const token = await getAccessTokenSilently();

            // Find the selected job before trying to cancel it.
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

            // Request cancellation from the backend or Slurm service.
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

    // Deletes the currently selected job from the backend and removes it from local state.
	const handleDelete = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();

            // Send delete request for the selected job.
			const response = await deleteJob(selectedJobId, token);
			if (response.error) {
				setAlertMsg('Failed to delete the job');
				setAlertSeverity('error');
				setAlertShow(true);
				return;
			}

            // Remove deleted job from the local jobs list.
			setJobs(jobs.filter(job => job.job_id !== selectedJobId));

            // Clear current selection after deletion.
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

    // Determines whether the cancel button should be disable for the selected job
	const cancelDisabled = (selectedJobId: string | null) : boolean => {
		if (!selectedJobId) {
			return true;
		}

		const jobToCancel = jobs.find(j => j.job_id === selectedJobId);
		if (!jobToCancel) {
			return true;
		}

        // Completed, failed, and cancelled jobs cannot be cancelled again.
		if ([JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED,
            JobStatus.OUT_OF_MEMORY, JobStatus.TIMEOUT].includes(jobToCancel.status)) {
           return true
		}

		return false
	}

    // Determines whether the delete button should be disabled for the selected job.
	const deleteDisabled = (selectedJobId: string | null) : boolean => {
		if (!selectedJobId) {
			return true;
		}
		const jobToDelete = jobs.find(j => j.job_id === selectedJobId);
		if (!jobToDelete) {
			return true;
		}

        // Only allow deletion for terminal jobs.
		if ([JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED,
            JobStatus.OUT_OF_MEMORY, JobStatus.TIMEOUT].includes(jobToDelete.status)) {
           return false;
       }
		return true;
	}

    // Downloads a ZIP file from a presigned S3 URL using a temporary browser blob link.
	async function downloadZipFromS3WithBlob(presignedUrl: string, filename = "result.zip") {
		const response = await fetch(presignedUrl);
		if (!response.ok) throw new Error("Failed to download file");

        // Convert response data into a downloadable browser blob.
		const blob = await response.blob();
		const blobUrl = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element to trigger the download.
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

            // Ask the backend for a temporary S3 download URL.
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
	
    // Determines whether the ZIP download button should be disabled for the selected job.
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

    // Show a full-page loading component while data is being fetched or actions are running.
	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
            {/* Show a page-level error alert when a general error exists. */}
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

            {/* Confirmation dialog shown before permanently deleting a job */}
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

            {/* Snackbar container for success, error, info, and warning messages. */}
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

            {/* Main page heading and description. */}
			<MolmakerPageTitle
				title="Admin Dashboard"
				subtitle={
					<>
						Welcome to the admin dashboard. Here you can manage jobs, users, and groups.
					</>
				}
			/>

            {/* Main jobs table section. */}
			<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50], mb: 4 }}>
				<JobsToolbar
					selectedJobId={selectedJobId}
					onViewDetails={() => navigate(`/jobs/${selectedJobId}`)}
					onViewStructure={() => {
                        // Preview the first structure attached to the selected job.
						const job = filteredJobs.find(j => j.job_id === selectedJobId);
						if (job?.structures.length) {
							openMoleculeViewer(job.structures[0].structure_id);
						}
					}}
					onFilterByStructure={() => {
                        // Filter the table by the first structure attached to the selected job.
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
					onZipDownload={handleZipDownload}
					downloadDisabled={downloadDisabled}
					isGroupAdmin={true}

                    displayColumns={displayColumns}
                    columnDisplayNames={columnDisplayNames}
                    onColumnToggle={(col, checked) =>
                        setDisplayColumns(prev => ({ ...prev, [col]: checked}))
                    }
                    filters={filters}
                    onFiltersChange={setFilters}
                    onFilterSubmit={handleFilterSubmit}
				/>

                {/* Table containing the filtered, sorted, and selectable job rows. */}
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

                {/*  Pagination controls for the jobs table. */}
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

import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, TablePagination, Snackbar } from "@mui/material";
import { grey } from "@mui/material/colors";
import {
	adminGetAllJobsPaged,
	cancelJob,
	deleteJob,
	getLibraryStructuresPaged,
	getZipPresignedUrl,
} from "../services/api";
import {
	CANCELLABLE_JOB_STATUSES,
	JOB_POLL_INTERVAL_MS,
	TERMINAL_JOB_STATUSES,
} from "../constants";
import JobsToolbar from "./Home/components/JobsToolbar";
import {
	MolmakerPageTitle,
	MolmakerLoading,
	MolmakerAlert,
	MolmakerConfirm,
} from "../components/custom";
import type { Job, Structure, Filter } from "../types";
import AdminJobsTable from "./Home/components/AdminJobsTable";
import { filterJobs, hasNoStoredArtifacts } from "../utils";
import EditJobDialog from "../components/EditJobDialog";

export default function Admin() {
	// used to redirect the user after the job is successfully submitted
	const navigate = useNavigate();
	const { getAccessTokenSilently } = useAuth0();

	// confirm delete job
	const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false);
	const handleOpenConfirmDelete = () => setOpenConfirmDelete(true);

	// data state
	const [jobs, setJobs] = useState<Job[]>([]);
	const [structures, setStructures] = useState<Structure[]>([]);

	// UI state
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState<number>(0);
	const [rowsPerPage, setRowsPerPage] = useState<number>(5);
	const [loading, setLoading] = useState<boolean>(true);

	// selection
	const [selectedJobId, setSelectedJobId] = useState<string>("");
	const [filterStructureId, setFilterStructureId] = useState<string>("");

	// sorting
	const [order, setOrder] = useState<"asc" | "desc">("desc");
	const [orderBy, setOrderBy] = useState<keyof Job>("submitted_at");
	const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

	// edit job
	const [editJobOpen, setEditJobOpen] = useState<boolean>(false);
	const jobToEdit = jobs.find((j) => j.job_id === selectedJobId) ?? null;

	// general alert
	const [alertShow, setAlertShow] = useState<boolean>(false);
	const [alertMsg, setAlertMsg] = useState<string>("");
	const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "info" | "warning">(
		"info",
	);

	// stores all custom table filters created by the user.
	const [filters, setFilters] = useState<Filter[]>([
		{ column: "job_name", value: "", extent: "contains" },
	]);

	// map column name to display name
	const columnDisplayNames: Record<any, string> = {
		job_id: "Job ID",
		job_name: "Name",
		user_email: "User Email",
		group_id: "Group ID",
		group_name: "Group Name",
		job_notes: "Job Notes",
		status: "Status",
		calculation_type: "Calculation Type",
		structures: "Library Structure",
		tags: "Job Tags",
		runtime: "Runtime",
		submitted_at: "Submitted At",
		completed_at: "Completed At",
	};

	// tracks which table columns shoul be displayed
	const [displayColumns, setDisplayColumns] = useState({
		job_id: true,
		job_name: true,
		user_email: true,
		group_id: true,
		group_name: true,
		job_notes: true,
		status: true,
		calculation_type: true,
		structures: true,
		tags: true,
		runtime: true,
		submitted_at: true,
		completed_at: true,
	});

	// track jobs for polling
	const jobsRef = useRef<Job[]>([]);
	useEffect(() => {
		jobsRef.current = jobs;
	}, [jobs]);

	// applying the filter to the jobs
	const handleFilterSubmit = () => {
		setFilteredJobs(filterJobs(jobsRef.current, filters));
		setPage(0);
	};

	// memoized the list of all tags inside the jobs history table
	const availableTags = useMemo(() => {
		const tagSet = new Set<string>();
		for (const job of jobs) {
			for (const tag of job.tags ?? []) {
				tagSet.add(tag);
			}
		}
		return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
	}, [jobs]);

	// The backend advances job status; just refetch periodically.
	useEffect(() => {
		const id = setInterval(async () => {
			const token = await getAccessTokenSilently();
			const resp = await adminGetAllJobsPaged(token);
			if (!resp.error) setJobs(resp.data ?? []);
		}, JOB_POLL_INTERVAL_MS);
		return () => clearInterval(id);
	}, [getAccessTokenSilently]);

	// load jobs & structures
	useEffect(() => {
		const loadData = async () => {
			try {
				const token = await getAccessTokenSilently();

				// Fetch jobs and library structures in parallel.
				const [jobsResponse, structuresResponse] = await Promise.all([
					adminGetAllJobsPaged(token),
					getLibraryStructuresPaged(token),
				]);

				if (jobsResponse.error || structuresResponse.error) {
					setError(jobsResponse.error ?? structuresResponse.error ?? "Failed to load data");
				}

				// Store jobs, excluding pending jobs from the main jobs list.
				const loadedJobs: Job[] = jobsResponse.data ?? [];
				setJobs(loadedJobs);
				setFilteredJobs(loadedJobs);

				// Sort structures alphabetically for easier dropdown navigation.
				const sortedStructures = (structuresResponse.data ?? []).sort(
					(a: Structure, b: Structure) => a.name.localeCompare(b.name),
				);

				// Add a default "All" option before the real structures.
				setStructures([
					{
						structure_id: "",
						name: "All",
						user_sub: "",
						location: "",
						uploaded_at: "",
						notes: "",
					},
					...sortedStructures,
				]);
			} catch (err) {
				setError("Failed to load data");
				console.error("Failed to load data", err);
			} finally {
				setLoading(false);
			}
		};

		setLoading(true);
		loadData();
	}, []);

	// filter jobs when structure filter changes
	useEffect(() => {
		setLoading(true);
		try {
			const filtered = filterStructureId
				? jobs.filter((job) => job.structures.some((s) => s.structure_id === filterStructureId))
				: jobs;
			setFilteredJobs(filtered);
			setPage(0);
		} catch (err) {
			setError("Failed to filter jobs");
			console.error("Failed to filter jobs:", err);
		} finally {
			setLoading(false);
		}
	}, [filterStructureId, jobs]);

	// Refreshes jobs from the backend and clears the active structure filter.
	const handleRefresh = async () => {
		setLoading(true);

		try {
			const token = await getAccessTokenSilently();
			// TODO: move filter to backend
			const response = await adminGetAllJobsPaged(token);
			if (response.error) {
				setError(response.error);
				return;
			}
			setJobs(response.data ?? []);
			setFilterStructureId("");
		} catch (err) {
			setError("Failed to refresh jobs");
			console.error("Failed to refresh jobs", err);
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
			const jobToCancel = jobs.find((j) => j.job_id === selectedJobId);
			if (!jobToCancel) {
				setAlertMsg("Selected job not found.");
				setAlertSeverity("error");
				setAlertShow(true);
				setLoading(false);
				return;
			}

			// Ask the backend or Slurm service to cancel the job.
			const response = await cancelJob(jobToCancel.job_id, token);
			if (response.error) {
				setAlertMsg(response.error);
				setAlertSeverity("error");
				setAlertShow(true);
				return;
			}

			// The backend returns the updated job; cancellation completes in the background.
			await handleRefresh();
			setAlertMsg(`Job ${jobToCancel.job_name} cancellation requested.`);
			setAlertSeverity("success");
			setAlertShow(true);
		} catch (err) {
			setAlertMsg("Failed to cancel the job");
			setAlertSeverity("error");
			setAlertShow(true);
			console.error("Failed to cancel the job", err);
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
				setAlertMsg("Failed to delete the job");
				setAlertSeverity("error");
				setAlertShow(true);
				return;
			}

			// Remove deleted job from the local jobs list.
			setJobs(jobs.filter((job) => job.job_id !== selectedJobId));

			// Clear current selection after deletion.
			setSelectedJobId("");
			setAlertMsg("Job deleted successfully!");
			setAlertSeverity("success");
			setAlertShow(true);
		} catch (err) {
			setAlertMsg("Failed to delete the job");
			setAlertSeverity("error");
			setAlertShow(true);
			console.error("Failed to delete the job", err);
		} finally {
			setLoading(false);
		}
	};

	// Determines whether the cancel button should be disable for the selected job
	const cancelDisabled = (selectedJobId: string | null): boolean => {
		if (!selectedJobId) return true;
		const job = jobs.find((j) => j.job_id === selectedJobId);
		if (!job) return true;
		if (job.cancel_requested) return true;
		return !CANCELLABLE_JOB_STATUSES.includes(job.status);
	};

	// Determines whether the delete button should be disabled for the selected job.
	const deleteDisabled = (selectedJobId: string | null): boolean => {
		if (!selectedJobId) return true;
		const job = jobs.find((j) => j.job_id === selectedJobId);
		if (!job) return true;
		return !TERMINAL_JOB_STATUSES.includes(job.status);
	};

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
				setAlertMsg("Failed to download the job archive");
				setAlertSeverity("error");
				setAlertShow(true);
				return;
			}
			const jobToDownloadZip = jobs.find((j) => j.job_id === selectedJobId);
			if (!jobToDownloadZip) {
				setAlertMsg("Selected job not found.");
				setAlertSeverity("error");
				setAlertShow(true);
				setLoading(false);
				return;
			}
			const zipUrl: string = response.data.url;

			// Download the ZIP file using the job name as the filename.
			await downloadZipFromS3WithBlob(zipUrl, `${jobToDownloadZip.job_name}.zip`);
			setSelectedJobId("");
			setAlertMsg("Job archive download successfully!");
			setAlertSeverity("success");
			setAlertShow(true);
		} catch (err) {
			setAlertMsg("Failed to download the job archive");
			setAlertSeverity("error");
			setAlertShow(true);
			console.error("Failed to download the job", err);
		} finally {
			setLoading(false);
		}
	};

	// Determines whether the ZIP download button should be disabled for the selected job.
	const downloadDisabled = (selectedJobId: string | null): boolean => {
		if (!selectedJobId) return true;
		const job = jobs.find((j) => j.job_id === selectedJobId);
		if (!job) return true;
		return hasNoStoredArtifacts(job);
	};

	// Show a full-page loading component while data is being fetched or actions are running.
	if (loading) {
		return <MolmakerLoading />;
	}

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
			{/* Show a page-level error alert when a general error exists. */}
			{error && <MolmakerAlert text={error} severity="error" outline="error" sx={{ mb: 4 }} />}

			{/* Confirmation dialog shown before permanently deleting a job */}
			<MolmakerConfirm
				open={openConfirmDelete}
				onClose={() => setOpenConfirmDelete(false)}
				textToShow={"Are you sure you want to delete this row? This action cannot be undone."}
				onConfirm={() => {
					handleDelete();
					setOpenConfirmDelete(false);
				}}
			/>

			{/* Dialog to edit job informations */}
			<EditJobDialog
				open={editJobOpen}
				job={jobToEdit}
				availableTags={availableTags}
				onClose={() => setEditJobOpen(false)}
				onSaved={(updatedJob: Job) => {
					const replace = (list: Job[]) =>
						list.map((j) => (j.job_id === updatedJob.job_id ? updatedJob : j));
					setJobs(replace);
					setFilteredJobs(replace);
				}}
			/>

			{/* Snackbar container for success, error, info, and warning messages. */}
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
				<Snackbar
					open={alertShow}
					autoHideDuration={5000}
					onClose={() => {
						setAlertShow(false);
					}}
					anchorOrigin={{ vertical: "top", horizontal: "center" }}
					sx={{ top: { xs: "48px", sm: "80px" } }}
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
				subtitle={<>Welcome to the admin dashboard. Here you can manage jobs, users, and groups.</>}
			/>

			{/* Main jobs table section. */}
			<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50], mb: 4 }}>
				<JobsToolbar
					selectedJobId={selectedJobId}
					onViewDetails={() => navigate(`/jobs/${selectedJobId}`)}
					onFilterByStructure={() => {
						// Filter the table by the first structure attached to the selected job.
						const job = filteredJobs.find((j) => j.job_id === selectedJobId);
						if (job?.structures.length) {
							setFilterStructureId(job.structures[0].structure_id);
						}
					}}
					cancelDisabled={cancelDisabled}
					deleteDisabled={deleteDisabled}
					onCancelJob={handleCancel}
					onDeleteJob={handleOpenConfirmDelete}
					onRefresh={handleRefresh}
					structures={structures}
					selectedStructure={filterStructureId}
					onStructureChange={setFilterStructureId}
					onZipDownload={handleZipDownload}
					onEditJob={() => setEditJobOpen(true)}
					downloadDisabled={downloadDisabled}
					canManageJobs={true}

					displayColumns={displayColumns}
					columnDisplayNames={columnDisplayNames}
					onColumnToggle={(col, checked) =>
						setDisplayColumns((prev) => ({ ...prev, [col]: checked }))
					}
					filters={filters}
					onFiltersChange={setFilters}
					onFilterSubmit={handleFilterSubmit}
					availableTags={availableTags}
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
						const isAsc = orderBy === col && order === "asc";
						setOrder(isAsc ? "desc" : "asc");
						setOrderBy(col);
						const sorted = [...filteredJobs].sort((a, b) => {
							if (col === "submitted_at") {
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
					onRowsPerPageChange={(e) => {
						setRowsPerPage(+e.target.value);
						setPage(0);
					}}
					rowsPerPageOptions={[5, 10, 25]}
				/>
			</Paper>
		</Box>
	);
}

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import {
	Box,
	Paper,
	TablePagination,
	Snackbar,
	Typography,
	TableContainer,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	Toolbar,
	Tooltip,
	IconButton,
} from "@mui/material";
import { blue, grey } from "@mui/material/colors";
import {
	deleteJob,
	upsertCurrentUser,
	getZipPresignedUrl,
	getCurrentUserGroupJobsPaged,
	getLibraryStructuresPaged,
	getCurrentUserGroupStructuresPaged,
	updateStructureVisibility,
	cancelJob,
} from "../services/api";
import {
	CANCELLABLE_JOB_STATUSES,
	DOWNLOADABLE_JOB_STATUSES,
	TERMINAL_JOB_STATUSES,
} from "../constants";
import JobsToolbar from "./Home/components/JobsToolbar";
import { MolmakerPageTitle, MolmakerAlert, MolmakerConfirm } from "../components/custom";
import type { Filter, Job, Structure } from "../types";
import GroupPanel from "../components/GroupPanel";
import GroupJobsTable from "./Home/components/GroupJobsTable";
import { filterJobs } from "../utils";
import { Pyramid } from "lucide-react";
import { renderFormula } from "../utils/renderFormula";
import { VisibilityOffOutlined, VisibilityOutlined } from "@mui/icons-material";
import EditJobDialog from "../components/EditJobDialog";

export default function Group() {
	// map column name to display name
	const columnDisplayNames: Record<any, string> = {
		job_name: "Name",
		job_notes: "Job Notes",
		status: "Status",
		calculation_type: "Calculation Type",
		structures: "Library Structure",
		tags: "Job Tags",
		runtime: "Runtime",
		submitted_at: "Submitted At",
		completed_at: "Completed At",
		is_public: "Visibility",
	};

	// tracks which columns are currently visible in the jobs table.
	const [displayColumns, setDisplayColumns] = useState({
		job_name: true,
		job_notes: true,
		status: true,
		calculation_type: true,
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
	const [userRole, setUserRole] = useState<string>("");

	const [groupId, setGroupId] = useState<string>("");

	// Data states
	const [jobs, setJobs] = useState<Job[]>([]);
	const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
	const [structures, setStructures] = useState<Structure[]>([]);
	const [groupStructures, setGroupStructures] = useState<Structure[]>([]);
	const [structPage, setStructPage] = useState(0);
	const [structRowsPerPage, setStructRowsPerPage] = useState(5);

	// UI states
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	// Selection & preview
	const [selectedJobId, setSelectedJobId] = useState<string>("");

	// Edit job dialog
	const [editJobOpen, setEditJobOpen] = useState<boolean>(false);
	const jobToEdit = jobs.find((j) => j.job_id === selectedJobId) ?? null;

	// Filters
	const [filterStructureId, setFilterStructureId] = useState<string>("");
	const [filters, setFilters] = useState<Filter[]>([
		{ column: "job_name", value: "", extent: "contains" },
	]);

	// Sorting
	const [order, setOrder] = useState<"asc" | "desc">("desc");
	const [orderBy, setOrderBy] = useState<keyof Job>("submitted_at");

	// Alerts & confirmation
	const [alertShow, setAlertShow] = useState(false);
	const [alertMsg, setAlertMsg] = useState("");
	const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "info" | "warning">(
		"info",
	);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	// Track jobs for polling
	const jobsRef = useRef<Job[]>([]);
	useEffect(() => {
		jobsRef.current = jobs;
	}, [jobs]);

	// Mirrors can_write_asset on the backend: admins and group admins can write
	// any job in the group, everyone else only their own.
	const canWrite = useCallback(
		(job: Job) =>
			userRole === "admin" ||
			userRole === "group_admin" ||
			(!!job.user_sub && job.user_sub === user?.sub),
		[userRole, user?.sub],
	);

	// Updates public/private visibility for one group structure.
	const toggleStructureVisibility = async (structureId: string, makePublic: boolean) => {
		const token = await getAccessTokenSilently();
		const resp = await updateStructureVisibility(structureId, makePublic, token);
		if (resp.error) {
			setAlertMsg("Failed to update structure visibility");
			setAlertSeverity("error");
			setAlertShow(true);
			return;
		}
		setGroupStructures((prev) =>
			prev.map((s) => (s.structure_id === structureId ? { ...s, is_public: makePublic } : s)),
		);
	};

	// Initialize token and role
	useEffect(() => {
		getAccessTokenSilently()
			.then((token) => setAdminPanelToken(token))
			.catch(() => setAdminPanelToken(null));

		(async () => {
			const token = await getAccessTokenSilently();
			const { data: ud } = await upsertCurrentUser(token, user?.email || "");
			setUserRole(ud.role || "");
			setGroupId(ud.group_id || "");
		})();
	}, [getAccessTokenSilently, user?.email]);

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

	// Load jobs & structures (and apply structure filter immediately)
	useEffect(() => {
		setLoading(true);
		(async () => {
			try {
				const token = await getAccessTokenSilently();

				// Fetch jobs and structures in parallel to reduce loading time.
				const [jr, sr, gsr] = await Promise.all([
					getCurrentUserGroupJobsPaged(token),
					getLibraryStructuresPaged(token),
					getCurrentUserGroupStructuresPaged(token),
				]);

				// Store all group jobs. Members with no group get a 403 here.
				const groupJobs: Job[] = jr.data ?? [];
				setJobs(groupJobs);

				// Apply structure filter if set
				const initial = filterStructureId
					? groupJobs.filter((j: Job) =>
							j.structures.some((s) => s.structure_id === filterStructureId),
						)
					: groupJobs;
				setFilteredJobs(initial);
				// Prep structure list
				const sortedStructs = (sr.data ?? []).sort((a: Structure, b: Structure) =>
					a.name.localeCompare(b.name),
				);
				setStructures([
					{
						structure_id: "",
						name: "All",
						user_sub: "",
						location: "",
						uploaded_at: "",
						notes: "",
					},
					...sortedStructs,
				]);
				setGroupStructures(
					(gsr.data || []).sort((a: Structure, b: Structure) => a.name.localeCompare(b.name)),
				);
			} catch (e) {
				console.error(e);
				setError("Failed to load data");
			} finally {
				setLoading(false);
			}
		})();
	}, [getAccessTokenSilently, filterStructureId]);

	// The backend advances job status; just refetch periodically.
	useEffect(() => {
		const id = setInterval(async () => {
			const token = await getAccessTokenSilently();
			const resp = await getCurrentUserGroupJobsPaged(token);
			if (!resp.error) setJobs(resp.data ?? []);
		}, 20000);
		return () => clearInterval(id);
	}, [getAccessTokenSilently, canWrite]);

	// applying the filter to the jobs
	const handleFilterSubmit = () => {
		setFilteredJobs(filterJobs(jobsRef.current, filters));
		setPage(0);
	};

	// Refreshes group jobs from the backend and clears the active structure filter
	const handleRefresh = async () => {
		setLoading(true);

		try {
			const token = await getAccessTokenSilently();
			// TODO: move filter to backend
			const response = await getCurrentUserGroupJobsPaged(token);
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

			// Find the selected job before attempting cancellation
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

	// Deletes the selected job from the backend and removes it from local state.
	const handleDelete = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();

			// Request deletion of the selected job.
			const response = await deleteJob(selectedJobId, token);
			if (response.error) {
				setAlertMsg("Failed to delete the job");
				setAlertSeverity("error");
				setAlertShow(true);
				return;
			}

			// Remove the deleted job from the local jobs list.
			setJobs(jobs.filter((job) => job.job_id !== selectedJobId));

			// Clear the current row selection after deleting.
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

	// Returns true when the cancel action should be disabled.
	const cancelDisabled = (selectedJobId: string | null): boolean => {
		if (!selectedJobId) return true;
		const job = jobs.find((j) => j.job_id === selectedJobId);
		if (!job) return true;
		if (job.cancel_requested) return true;
		return !CANCELLABLE_JOB_STATUSES.includes(job.status);
	};

	// Returns true when the delete action should be disabled.
	const deleteDisabled = (selectedJobId: string | null): boolean => {
		if (!selectedJobId) return true;
		const job = jobs.find((j) => j.job_id === selectedJobId);
		if (!job) return true;

		// The backend requires write access to delete.
		if (!canWrite(job)) return true;

		return !TERMINAL_JOB_STATUSES.includes(job.status);
	};

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

	// Returns true when the ZIP download action should be disabled.
	const downloadDisabled = (selectedJobId: string | null): boolean => {
		if (!selectedJobId) return true;
		const job = jobs.find((j) => j.job_id === selectedJobId);
		if (!job) return true;
		return !DOWNLOADABLE_JOB_STATUSES.includes(job.status);
	};

	// Opens the delete confirmation dialog.
	const confirmDelete = () => setConfirmDeleteOpen(true);

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
			{/* Display a page-level error alert when an error message exists. */}
			{error && <MolmakerAlert text={error} severity="error" outline="error" sx={{ mb: 4 }} />}

			{/*  Confirmation modal shown before deleting a selected job. */}
			<MolmakerConfirm
				open={confirmDeleteOpen}
				onClose={() => setConfirmDeleteOpen(false)}
				onConfirm={handleDelete}
				textToShow="Are you sure you want to delete this job? This action cannot be undone."
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

			{/* Snackbar wrapper for success, error, info, and warning messages. */}
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

			{/* Page heading and short description */}
			<MolmakerPageTitle
				title="Group Dashboard"
				subtitle={
					groupId ? (
						<>
							Welcome to the group dashboard. Here you can manage jobs and structures within your
							group.
						</>
					) : (
						<>You are not in a group yet. Request to join one below to share jobs and structures.</>
					)
				}
			/>

			{/* Show the group admin panel only after an access token is available. */}
			{adminPanelToken && <GroupPanel token={adminPanelToken} />}
			{groupId && (
				<>
					{/* Main group jobs table section. */}
					<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50], mb: 4 }}>
						<JobsToolbar
							title="Group Jobs"
							selectedJobId={selectedJobId}
							onViewDetails={() => navigate(`/jobs/${selectedJobId}`)}
							onFilterByStructure={() => {
								const job = filteredJobs.find((j) => j.job_id === selectedJobId);
								if (job?.structures.length) {
									setFilterStructureId(job.structures[0].structure_id);
								}
							}}
							cancelDisabled={cancelDisabled}
							deleteDisabled={deleteDisabled}
							onCancelJob={handleCancel}
							onDeleteJob={confirmDelete}
							onRefresh={handleRefresh}
							structures={structures}
							selectedStructure={filterStructureId}
							onStructureChange={setFilterStructureId}
							onZipDownload={handleZipDownload}
							onEditJob={() => setEditJobOpen(true)}
							downloadDisabled={downloadDisabled}
							canManageJobs={userRole === "group_admin"}

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
								const isAsc = orderBy === col && order === "asc";
								setOrder(isAsc ? "desc" : "asc");
								setOrderBy(col);

								// Sort dates numerically and other columns alphabetically.
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
							canManageVisibility={userRole === "group_admin"}
						/>

						{/* Pagination controls for the jobs table. */}
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

					{/* Group structure library — separate Paper, styled like the personal library. */}
					<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50], mb: 4 }}>
						{/* Group structure toolbar */}
						<Toolbar
							sx={{
								justifyContent: "space-between",
								borderTopLeftRadius: 5,
								borderTopRightRadius: 5,
							}}
						>
							<Typography
								variant="h6"
								color={grey[800]}
								sx={{
									display: "flex",
									alignItems: "center",
									fontWeight: "bold",
									fontSize: "1.1rem",
								}}
							>
								<Pyramid style={{ marginRight: 10, color: blue[600] }} />
								Group Structures
							</Typography>
						</Toolbar>

						{/* Group structure table */}
						<TableContainer>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: grey[200] }}>
										<TableCell>Name</TableCell>
										<TableCell>Chemical Formula</TableCell>
										<TableCell>Notes</TableCell>
										<TableCell>Tags</TableCell>
										<TableCell>Uploaded At</TableCell>
										{userRole === "group_admin" && <TableCell>Visibility</TableCell>}
									</TableRow>
								</TableHead>
								<TableBody>
									{/* Table placeholder for 0 group structures */}
									{groupStructures.length === 0 && (
										<TableRow>
											<TableCell colSpan={userRole === "group_admin" ? 6 : 5} align="center">
												<Typography variant="body2" color="text.secondary">
													No structures in this group yet.
												</Typography>
											</TableCell>
										</TableRow>
									)}

									{/* Group structure table content */}
									{groupStructures
										.slice(
											structPage * structRowsPerPage,
											structPage * structRowsPerPage + structRowsPerPage,
										)
										.map((structure) => (
											<TableRow key={structure.structure_id}>
												<TableCell>{structure.name}</TableCell>
												<TableCell>{renderFormula(structure.formula)}</TableCell>
												<TableCell>{structure.notes}</TableCell>
												<TableCell>
													{structure.tags && structure.tags.length > 0 ? (
														structure.tags.join(", ")
													) : (
														<Typography variant="body2" color="text.secondary">
															No tags
														</Typography>
													)}
												</TableCell>
												<TableCell>
													{structure.uploaded_at
														? new Date(structure.uploaded_at).toLocaleString()
														: ""}
												</TableCell>
												{userRole === "group_admin" && (
													<TableCell>
														{structure.is_public ? (
															<Tooltip title="Make Private">
																<IconButton
																	size="small"
																	color="primary"
																	onClick={() =>
																		toggleStructureVisibility(structure.structure_id, false)
																	}
																>
																	<VisibilityOutlined />
																</IconButton>
															</Tooltip>
														) : (
															<Tooltip title="Make Public">
																<IconButton
																	size="small"
																	sx={{ color: grey[600] }}
																	onClick={() =>
																		toggleStructureVisibility(structure.structure_id, true)
																	}
																>
																	<VisibilityOffOutlined />
																</IconButton>
															</Tooltip>
														)}
													</TableCell>
												)}
											</TableRow>
										))}
								</TableBody>
							</Table>
						</TableContainer>

						{/* Table pagination for group structure control */}
						<TablePagination
							component="div"
							rowsPerPageOptions={[5, 10, 25]}
							count={groupStructures.length}
							rowsPerPage={structRowsPerPage}
							page={structPage}
							onPageChange={(_, newPage) => setStructPage(newPage)}
							onRowsPerPageChange={(e) => {
								setStructRowsPerPage(+e.target.value);
								setStructPage(0);
							}}
						/>
					</Paper>
				</>
			)}
		</Box>
	);
}

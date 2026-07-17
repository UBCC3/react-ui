import React, { useCallback, useMemo } from "react";
import {
	TableContainer,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	Chip,
	Box,
	Typography,
	IconButton,
	Tooltip,
} from "@mui/material";
import {
	VisibilityOutlined,
	VisibilityOffOutlined,
} from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import { useAuth0 } from "@auth0/auth0-react";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";

import type { Job } from "../../../types";
import { updateVisibility } from "../../../services/api";
import { statusColors, statusIcons, calculationTypes } from "../../../constants";
import { reverseMapping } from "../../../utils";

/**
 * Props for the JobsTable
 */
interface JobsTableProps {
	jobs: Job[];
	loading: boolean;
	page: number;
	rowsPerPage: number;
	order: "asc" | "desc";
	orderBy: keyof Job;
	selectedJobId: string | null;
	onSort: (column: keyof Job) => void;
	onRowClick: (jobId: string) => void;
	displayColumns: {
		job_name: boolean;
		job_notes: boolean;
		status: boolean;
		calculation_type: boolean;
		structures: boolean;
		tags: boolean;
		runtime: boolean;
		submitted_at: boolean;
		completed_at: boolean;
		is_public: boolean;
	};
	isGroupAdmin: boolean;
}

/**
 * Displays a paginated, sortable table of group jobs.
 *
 * The table supports:
 * - dynamic column visibility through displayColumns,
 * - sorting through the parent-provided onSort handler,
 * - row selection through onRowClick,
 * - loading and empty states,
 * - admin-only visibility controls for making jobs public or private
 */
export default function GroupJobsTable({
	jobs,
	loading,
	page,
	rowsPerPage,
	order,
	orderBy,
	selectedJobId,
	onSort,
	onRowClick,
	displayColumns,
	isGroupAdmin = false,
}: JobsTableProps) {
	const { getAccessTokenSilently } = useAuth0();

	// Sorting logic
	const comparator = useCallback(
		(a: Job, b: Job) => {
			let aVal: string | number;
			let bVal: string | number;

			if (orderBy === "submitted_at") {
				aVal = new Date(a.submitted_at).getTime();
				bVal = new Date(b.submitted_at).getTime();
			} else if (orderBy === "structures") {
				aVal = a.structures.length;
				bVal = b.structures.length;
			} else {
				aVal = String(a[orderBy] ?? "").toLowerCase();
				bVal = String(b[orderBy] ?? "").toLowerCase();
			}

			if (aVal < bVal) return order === "asc" ? -1 : 1;
			if (aVal > bVal) return order === "asc" ? 1 : -1;
			return 0;
		},
		[order, orderBy],
	);

	/**
	 * Creates a sorted copy of the jobs array.
	 */
	const sortedJobs = useMemo(() => [...jobs].sort(comparator), [jobs, comparator]);

	/**
	 * Extracts only the jobs that should appear on the current page.
	 */
	const paginatedJobs = useMemo(
		() => sortedJobs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
		[sortedJobs, page, rowsPerPage],
	);

	/**
	 * Reverse the calculation types mapping
	 */
	const reversedCalculationTypes = reverseMapping(calculationTypes);

	/**
	 * Updates whether a job is public or private.
	 */
	const toggleVisibility = async (jobId: string, makePublic: boolean) => {
		try {
			const token = await getAccessTokenSilently();
			await updateVisibility(jobId, makePublic, token);
		} catch (err) {
			console.error("Failed to update visibility:", err);
		}
	};

	/**
	 * Renders a sortable table header cell.
	 */
	const renderHeader = (label: string, column: keyof Job) => (
		<TableCell sx={{ whiteSpace: "nowrap", cursor: "pointer" }} onClick={() => onSort(column)}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					width: "100%",
					fontSize: "0.7rem",
					fontWeight: "bold",
					color: grey[700],
				}}
			>
				{label.toUpperCase()}
				{orderBy === column && (
					<Box sx={{ ml: 1 }}>
						{order === "asc" ? (
							<ArrowUpAZ style={{ width: 18, height: 18 }} />
						) : (
							<ArrowDownAZ style={{ width: 18, height: 18 }} />
						)}
					</Box>
				)}
			</Box>
		</TableCell>
	);

	return (
		<TableContainer>
			<Table>
				<TableHead sx={{ bgcolor: grey[200] }}>
					<TableRow>
						{displayColumns.job_name && renderHeader("Name", "job_name")}
						{displayColumns.job_notes && renderHeader("Notes", "job_notes")}
						{displayColumns.status && renderHeader("Status", "status")}
						{displayColumns.calculation_type && renderHeader("Calculation Type", "structures")}
						{displayColumns.structures && renderHeader("Library Structure", "structures")}
						{displayColumns.tags && renderHeader("Job Tags", "tags")}
						{displayColumns.runtime && renderHeader("Runtime", "runtime")}
						{displayColumns.submitted_at && renderHeader("Submitted At", "submitted_at")}
						{displayColumns.completed_at && renderHeader("Completed At", "completed_at")}
						{displayColumns.is_public && isGroupAdmin && renderHeader("Visibility", "is_public")}
					</TableRow>
				</TableHead>
				<TableBody>
					{loading ? (
						<TableRow>
							<TableCell colSpan={9} align="center">
								<Typography variant="body2" color="text.secondary">
									Loading jobs...
								</Typography>
							</TableCell>
						</TableRow>
					) : (
						<>
							{paginatedJobs.length === 0 ? (
								<TableRow>
									<TableCell colSpan={9} align="center">
										<Typography variant="body2" color="text.secondary">
											Nothing here yet — run your first analysis from the sidebar.
										</Typography>
									</TableCell>
								</TableRow>
							) : (
								<>
									{paginatedJobs.map((job) => (
										<TableRow
											key={job.job_id}
											onClick={() => onRowClick(job.job_id)}
											sx={{
												backgroundColor:
													job.job_id === selectedJobId ? "rgba(0,0,0,0.08)" : "inherit",
												cursor: "pointer",
											}}
										>
											{displayColumns.job_name && <TableCell>{job.job_name}</TableCell>}
											{displayColumns.job_notes && <TableCell>{job.job_notes || "N/A"}</TableCell>}
											{displayColumns.status && (
												<TableCell>
													<Chip
														label={job.status}
														size="small"
														sx={{
															bgcolor: statusColors[job.status] ?? grey[300],
															color: "white",
															textTransform: "capitalize",
															fontSize: "0.65rem",
														}}
														icon={
															statusIcons[job.status]
																? React.createElement(statusIcons[job.status], {
																		style: { color: "white", width: 16, height: 16 },
																	})
																: undefined
														}
													/>
												</TableCell>
											)}
											{displayColumns.calculation_type && (
												<TableCell>
													<Chip
														label={reversedCalculationTypes[job.calculation_type]}
														variant="outlined"
														size="small"
														sx={{ mr: 0.5, mb: 0.5 }}
													/>
												</TableCell>
											)}
											{displayColumns.structures && (
												<TableCell>
													{job.structures.length
														? job.structures.map((s) => (
																<Chip
																	key={s.structure_id}
																	label={s.name}
																	variant="outlined"
																	size="small"
																	sx={{ mr: 0.5, mb: 0.5 }}
																/>
															))
														: "N/A"}
												</TableCell>
											)}
											{displayColumns.tags && (
												<TableCell>
													{job.tags.length > 0 ? (
														job.tags.join(", ")
													) : (
														<Typography variant="body2" color="text.secondary">
															No tags
														</Typography>
													)}
												</TableCell>
											)}
											{displayColumns.runtime && (
												<TableCell>{job.runtime ?? "unavailable"}</TableCell>
											)}
											{displayColumns.submitted_at && (
												<TableCell>{new Date(job.submitted_at).toLocaleString()}</TableCell>
											)}
											{displayColumns.completed_at && (
												<TableCell>
													{job.completed_at ? new Date(job.completed_at).toLocaleString() : "N/A"}
												</TableCell>
											)}
											{displayColumns.is_public && isGroupAdmin && (
												<TableCell>
													{job.is_public ? (
														<Tooltip title="Make Private">
															<IconButton
																size="small"
																color="primary"
																onClick={(e) => {
																	e.stopPropagation();
																	toggleVisibility(job.job_id, false);
																}}
															>
																<VisibilityOutlined />
															</IconButton>
														</Tooltip>
													) : (
														<Tooltip title="Make Public">
															<IconButton
																size="small"
																sx={{ color: grey[600] }}
																onClick={(e) => {
																	e.stopPropagation();
																	toggleVisibility(job.job_id, true);
																}}
															>
																<VisibilityOffOutlined />
															</IconButton>
														</Tooltip>
													)}
												</TableCell>
											)}
										</TableRow>
									))}
								</>
							)}
						</>
					)}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

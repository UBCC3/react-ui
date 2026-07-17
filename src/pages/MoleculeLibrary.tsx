import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
	Paper,
	Typography,
	Box,
	Grid,
	Button,
	TableContainer,
	Table,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	Toolbar,
	IconButton,
	Tooltip,
	TablePagination,
	Avatar,
} from "@mui/material";
import { Refresh, VisibilityOutlined, DeleteOutlineOutlined, Add } from "@mui/icons-material";
import { ArrowUpAZ, ArrowDownAZ } from "lucide-react";
import { grey, blue } from "@mui/material/colors";
import { MolmakerPageTitle, MolmakerLoading, MolmakerConfirm } from "../components/custom";
import { getLibraryStructures, deleteStructure } from "../services/api";
import type { Structure } from "../types";
import MoleculeInfo from "../components/MoleculeInfo";
import MoleculeUpload from "../components/MoleculeUpload";
import { Pyramid } from "lucide-react";

const MoleculeLibrary = () => {
	// Auth0 helper used to retrieve access tokens before calling protected APIs.
	const { getAccessTokenSilently } = useAuth0();

	// state for molecule dialog
	const [open, setOpen] = useState<boolean>(false);
	const [openAdd, setOpenAdd] = useState<boolean>(false);
	const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false);

	// state for user experience
	const [loading, setLoading] = useState<boolean>(true);
	const [order, setOrder] = useState<"asc" | "desc">("desc");
	const [orderBy, setOrderBy] = useState<keyof Structure>("uploaded_at");
	const [page, setPage] = useState<number>(0);
	const [rowsPerPage, setRowsPerPage] = useState<number>(5);

	// form state
	const [libraryStructures, setLibraryStructures] = useState<Structure[]>([]);
	const [selectedStructureId, setSelectedStructureId] = useState<string>("");

	// Reloads the structure library from the backend.
	const handleRefresh = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();
			const response = await getLibraryStructures(token);
			setLibraryStructures(response.data);
			setSelectedStructureId("");
		} catch (err) {
			console.error("Failed to refresh jobs", err);
		} finally {
			setLoading(false);
		}
	};

	// Deletes the currently selected structure from the library.
	const handleDelete = async () => {
		// Do nothing if no structure is selected.
		if (!selectedStructureId) return;

		try {
			const token = await getAccessTokenSilently();

			// Delete the selected structure through the backend.
			await deleteStructure(selectedStructureId, token);

			// Remove the deleted structure from local state so the table updates immediately
			setLibraryStructures((prev) =>
				prev.filter((molecule) => molecule.structure_id !== selectedStructureId),
			);

			// Clear the selection after deletion.
			setSelectedStructureId("");
		} catch (err) {
			console.error("Failed to delete molecule", err);
		}
	};

	// Loads saved molecules when the library page first renders.
	useEffect(() => {
		const loadSavedMolecules = async () => {
			try {
				const token = await getAccessTokenSilently();

				// Fetch structures saved in the user's molecule library.
				const response = await getLibraryStructures(token);

				// Normalize the backend response into the Structure shape expected by the UI.
				setLibraryStructures(
					response.data.map((item: any) => ({
						structure_id: item.structure_id,
						user_sub: item.user_sub,
						name: item.name,
						formula: item.formula || "",
						notes: item.notes || "",
						location: item.location,
						uploaded_at: item.uploaded_at,
						tags: item.tags || [],
						imageS3URL: item.imageS3URL,
					})),
				);
			} catch (err) {
				console.error("Failed to fetch jobs", err);
			} finally {
				setLoading(false);
			}
		};

		setLoading(true);
		loadSavedMolecules();
	}, []);

	// Show the loading screen while the initial molecule list is being fetched.
	if (loading) {
		return <MolmakerLoading />;
	}

	// Renders a sortable table header cell for the given structure column.
	const renderHeader = (label: string, column: keyof Structure) => (
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

				{/* Show the active sort icon only for the currently sorted column. */}
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

	// Converts a chemical formula string into JSX with subscripts and superscripts..
	const renderFormula = (formula: string) => {
		if (!formula) {
			return (
				<Typography variant="body2" color="text.secondary">
					No formula
				</Typography>
			);
		}

		// Regex: match {...} or (...) for superscript, or numbers for subscript
		const regex = /\{([^}]+)\}|\(([^)]+)\)|(\d+)/g;
		// Stores each piece of rendered formula text.
		const parts: React.ReactNode[] = [];
		// Tracks the end of the previous match so normal text can be preserved.
		let lastIndex = 0;
		// Counter used to give generated <sup> and <sub> elements unique keys.
		let i = 0;
		let match;

		// Walk through the formula and split it into normal text, superscripts, and subscripts.
		while ((match = regex.exec(formula)) !== null) {
			// Add any normal text before the current matched token.
			if (match.index > lastIndex) {
				parts.push(formula.slice(lastIndex, match.index));
			}
			if (match[1] !== undefined) {
				// {superscript}
				parts.push(<sup key={i++}>{match[1]}</sup>);
			} else if (match[2] !== undefined) {
				// (superscript)
				parts.push(<sup key={i++}>{match[2]}</sup>);
			} else if (match[3] !== undefined) {
				// subscript
				parts.push(<sub key={i++}>{match[3]}</sub>);
			}
			lastIndex = regex.lastIndex;
		}

		// Add any remaining normal text after the last match.
		if (lastIndex < formula.length) {
			parts.push(formula.slice(lastIndex));
		}
		return <Typography variant="body2">{parts}</Typography>;
	};

	// Sorts the molecule table by the selected column.
	const onSort = (column: keyof Structure) => {
		// Toggle direction if the user clicks the currently sorted column.
		const isAsc = orderBy === column && order === "asc";
		const newOrder = isAsc ? "desc" : "asc";
		setOrder(newOrder);
		setOrderBy(column);

		// Sort a copied array so the existing state array is not mutated directly.
		const sorted = [...libraryStructures].sort((a, b) => {
			const aValue = a[column];
			const bValue = b[column];

			// Use localeCompare for string fields like name, formula, notes, and dates.
			if (typeof aValue === "string" && typeof bValue === "string") {
				return newOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
			}
			// Handle undefined values
			if (aValue === undefined && bValue === undefined) return 0;
			if (aValue === undefined) return newOrder === "asc" ? 1 : -1;
			if (bValue === undefined) return newOrder === "asc" ? -1 : 1;

			// Fallback comparison for non-string values.
			return newOrder === "asc" ? (aValue < bValue ? -1 : 1) : aValue > bValue ? -1 : 1;
		});
		setLibraryStructures(sorted);
	};

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
			{/* Confirmation dialog shown before permanently deleting a structure. */}
			<MolmakerConfirm
				open={openConfirmDelete}
				onClose={() => setOpenConfirmDelete(false)}
				textToShow={"Are you sure you want to delete this row? This action cannot be undone."}
				onConfirm={() => {
					handleDelete();
					setOpenConfirmDelete(false);
				}}
			/>

			{/* Dialog for upploading a new molecule or structure to the library. */}
			<MoleculeUpload
				open={openAdd}
				setOpen={setOpenAdd}
				setLibraryStructures={setLibraryStructures}
			/>

			{/* Dialog for viewing details about the selected structure. */}
			<MoleculeInfo
				open={open}
				setOpen={setOpen}
				selectedStructureId={selectedStructureId}
				onStructureUpdated={(updated: Partial<Structure>) => {
					setLibraryStructures((prev) =>
						prev.map((s) => (s.structure_id === updated.structure_id ? { ...s, ...updated } : s)),
					);
				}}
			/>

			{/* Page heading and short description. */}
			<MolmakerPageTitle
				title="My Structure Library"
				subtitle="Upload and manage the structures in your library."
			/>

			<Grid container spacing={3} sx={{ marginTop: 3 }}>
				<Grid size={12}>
					<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50] }}>
						{/* Table toolbar containing the title and action buttons. */}
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
								Structures
							</Typography>

							<Box sx={{ display: "flex", alignItems: "center" }}>
								{/* Action buttons for adding, viewing, and deleting structures. */}
								<Box
									sx={{
										borderRadius: 1,
										display: "flex",
										alignItems: "center",
										px: 2,
										bgcolor: grey[100],
										mr: 1,
									}}
								>
									<Tooltip title="Add new structure">
										<IconButton
											onClick={() => {
												setSelectedStructureId("");
												setOpenAdd(true);
											}}
										>
											<Add />
										</IconButton>
									</Tooltip>

									<Tooltip title="View structure">
										<IconButton
											disabled={!selectedStructureId}
											onClick={() => {
												setOpen(true);
											}}
										>
											<VisibilityOutlined />
										</IconButton>
									</Tooltip>

									<Tooltip title="Delete structure">
										<IconButton
											disabled={!selectedStructureId}
											onClick={() => setOpenConfirmDelete(true)}
										>
											<DeleteOutlineOutlined />
										</IconButton>
									</Tooltip>
								</Box>

								{/* Refresh button group. */}
								<Box
									sx={{
										borderRadius: 1,
										display: "flex",
										alignItems: "center",
										px: 2,
										bgcolor: grey[100],
									}}
								>
									<Tooltip title="Refresh structures">
										<IconButton onClick={handleRefresh}>
											<Refresh />
										</IconButton>
									</Tooltip>
								</Box>
							</Box>
						</Toolbar>

						{/* Main structures table. */}
						<TableContainer>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: grey[200] }}>
										{renderHeader("Thumbnail", "imageS3URL")}
										{renderHeader("Name", "name")}
										{renderHeader("Chemical Formula", "formula")}
										{renderHeader("Notes", "notes")}
										{renderHeader("Job Tags", "tags")}
										{renderHeader("Uploaded At", "uploaded_at")}
									</TableRow>
								</TableHead>

								<TableBody>
									{/* Empty-state row shown when the library has no structures. */}
									{libraryStructures.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} align="center">
												<Typography variant="body2" color="text.secondary">
													No structures have been added yet.
												</Typography>
												<Button
													variant="contained"
													color="primary"
													sx={{ textTransform: "none", mt: 2 }}
													startIcon={<Add />}
													onClick={() => setOpenAdd(true)}
												>
													Add Molecule
												</Button>
											</TableCell>
										</TableRow>
									)}

									{/* Render only the structures on the current pagination page. */}
									{libraryStructures
										.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
										.map((molecule) => (
											<TableRow
												key={molecule.structure_id}
												onClick={() => {
													setSelectedStructureId(
														molecule.structure_id == selectedStructureId
															? ""
															: molecule.structure_id,
													);
												}}
												sx={{
													backgroundColor:
														molecule.structure_id === selectedStructureId
															? "rgba(0, 0, 0, 0.1)"
															: "transparent",
													cursor: "pointer",
												}}
											>
												{/* Molecule thumbnail image. */}
												<TableCell>
													<Avatar
														variant="rounded"
														alt={`Thumbnail for ${molecule.name}`}
														src={molecule.imageS3URL}
														sx={{ width: 64, height: 64 }}
													/>
												</TableCell>
												{/* Molecule display name. */}
												<TableCell>{molecule.name}</TableCell>
												{/* Chemical formula rendered with subscript and superscript formatting. */}
												<TableCell>{renderFormula(molecule.formula)}</TableCell>
												{/* Optional notes attached to the structure. */}
												<TableCell>{molecule.notes}</TableCell>
												{/* Tags shown as a comma-separated list, with a fallback if none exist. */}
												<TableCell>
													{molecule.tags.length > 0 ? (
														molecule.tags.join(", ")
													) : (
														<Typography variant="body2" color="text.secondary">
															No tags
														</Typography>
													)}
												</TableCell>

												{/* Upload timestamp formatted for the user's locale. */}
												<TableCell>{new Date(molecule.uploaded_at).toLocaleString()}</TableCell>
											</TableRow>
										))}
								</TableBody>
							</Table>
						</TableContainer>

						{/* Pagination controls for navigating the structure table. */}
						<TablePagination
							component="div"
							rowsPerPageOptions={[5, 10, 25]}
							count={libraryStructures.length}
							rowsPerPage={rowsPerPage}
							page={page}
							onPageChange={(_, newPage) => setPage(newPage)}
							onRowsPerPageChange={(e) => {
								setRowsPerPage(+e.target.value);
								setPage(0);
							}}
						/>
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
};

export default MoleculeLibrary;

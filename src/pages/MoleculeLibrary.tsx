import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
	Paper,
	Typography,
	Divider,
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
} from "@mui/material";
import {
	CloudUpload,
	Refresh,
	Visibility,
	Delete,
	AddToPhotos,
	ArrowDropUpOutlined,
	ArrowDropDownOutlined,
} from "@mui/icons-material";
import { blueGrey } from "@mui/material/colors";
import { 
	MolmakerMoleculePreview, 
	MolmakerSectionHeader, 
	MolmakerTextField,
	MolmakerPageTitle,
	MolmakerAlert,
	MolmakerLoading,
} from "../components/custom";
import { 
	getStructureDataFromS3, 
	AddAndUploadStructureToS3, 
	getLibraryStructures 
} from "../services/api";
import type { Structure } from "../types";

const MoleculeLibrary = () => {
	const { getAccessTokenSilently } = useAuth0();

	// state for user experience
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [order, setOrder] = useState<'asc' | 'desc'>('asc');
	const [orderBy, setOrderBy] = useState<keyof Structure>('name');
	const [page, setPage] = useState<number>(0);
  	const [rowsPerPage, setRowsPerPage] = useState<number>(5);

	// form state
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [structureName, setStructureName] = useState<string>("");
	const [notes, setNotes] = useState<string>("");
	const [structureData, setStructureData] = useState<string>("");
	const [libraryStructures, setLibraryStructures] = useState<Structure[]>([]);
	const [filteredStructures, setFilteredStructures] = useState<Structure[]>([]);
	const [selectedStructureId, setSelectedStructureId] = useState<string>("");

	const handleRefresh = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();
			const response = await getLibraryStructures(token);
			setLibraryStructures(response.data);
			setFilteredStructures(response.data);
			setSelectedStructureId("");
			setError(null);
		} catch (err) {
			setError('Failed to refresh molecules. Please try again later.');
			console.error('Failed to refresh jobs', err);
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		// prevent multiple submissions and submission while loading
		if (submitAttempted) return;
		if (loading) return;

		// validate inputs
		if (!uploadedFile) {
			setError('Please select a file to upload.');
			setLoading(false);
			return;
		}
		if (!structureName) {
			setError('Please enter a name for the molecule.');
			setLoading(false);
			return;
		}
		
		setSubmitAttempted(true);
		setError(null);
		setLoading(true);

		try {
			const token = await getAccessTokenSilently();
			await AddAndUploadStructureToS3(uploadedFile, structureName, token);

			// Refresh the library after successful submission
			const response = await getLibraryStructures(token);
			setLibraryStructures(response.data);
			setFilteredStructures(response.data);

			// Reset form state
			setUploadedFile(null);
			setStructureName("");
			setStructureData("");
			setNotes("");
			setSelectedStructureId("");
			setError(null);
			setSubmitAttempted(false);
		} catch (err) {
			setError('Molecule submission failed. Please try again.');
			console.error("Molecule submission failed", err);
		} finally {
			setLoading(false);
		}
	}

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
            setStructureData(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to load molecule structure. Please try again.');
            console.error("Failed to load molecule structure:", err);
        } finally {
            setLoading(false);
        }
    };

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		const selected = files && files[0];
		setUploadedFile(selected);
		if (selected) {
			const reader = new FileReader();
			reader.onload = (ev) => {
				if (ev.target && typeof ev.target.result === "string") {
					setStructureData(ev.target.result);
				}
			};
			reader.readAsText(selected);
		}
	};

	useEffect(() => {
		const loadSavedMolecules = async () => {
			try {
				const token = await getAccessTokenSilently();
				const response = await getLibraryStructures(token);
				setLibraryStructures(response.data);
				setFilteredStructures(response.data);
			} catch (err) {
				setError('Failed to fetch molecules. Please try again later.');
				console.error("Failed to fetch jobs", err);
			} finally {
				setLoading(false);
			}
		}

		setLoading(true);
		loadSavedMolecules();
	}, [])

	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

	const renderHeader = (label: string, column: keyof Structure) => (
		<TableCell
			sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
			onClick={() => onSort(column)}
		>
			<Box sx={{ display: 'flex', alignItems: 'bottom' }}>
				{label}
				{orderBy === column && (
				<Box sx={{ ml: 1 }}>
					{order === 'asc' ? (
						<ArrowDropUpOutlined color="primary" />
					) : (
						<ArrowDropDownOutlined color="primary" />
					)}
				</Box>
				)}
			</Box>
		</TableCell>
	);

	const onSort = (column: keyof Structure) => {
		const isAsc = orderBy === column && order === 'asc';
		const newOrder = isAsc ? 'desc' : 'asc';
		setOrder(newOrder);
		setOrderBy(column);
		const sorted = [...filteredStructures].sort((a, b) => {
			const aValue = a[column];
			const bValue = b[column];
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return newOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
			}
			return newOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
		});
		setFilteredStructures(sorted);
	};

  	return (
		<Box bgcolor={'rgb(247, 249, 252)'} p={4}>
			<MolmakerPageTitle 
				title="Molecule Library" 
				subtitle="Upload and manage your molecules in the library." 
			/>
			<Grid container spacing={3}>
				<Grid size={{ xs: 12, md: 6 }}>
					<Paper elevation={3} sx={{ padding: 4 }}>
						<Box component="form" onSubmit={handleSubmit}>
							<Grid container direction="column" spacing={2}>
								{/* Error message */}
								{error && (
									<MolmakerAlert
										text={error}
										severity="error"
										outline="error"
									/>
								)}
								<MolmakerSectionHeader text="Required fields are marked with *" />
								<Grid sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
									<Button
										variant="contained"
										component="label"
										startIcon={<CloudUpload />}
										sx={{ textTransform: 'none' }}
										size='large'
										fullWidth
									>
										{uploadedFile ? uploadedFile.name : 'Select File'}
										<input
											hidden
											type="file"
											accept=".xyz"
											onChange={handleFileChange}
										/>
									</Button>
								</Grid>
								<Grid>
									<MolmakerTextField
										fullWidth
										label="Name"
										value={structureName}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStructureName(e.target.value)}
										error={submitAttempted && structureName === ""}
										helperText={submitAttempted && structureName === "" ? "Name is required" : ""}
										required
									/>
								</Grid>
								<Grid>
									<MolmakerTextField
										fullWidth
										label="Notes"
										value={notes}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
										multiline
										rows={2}
									/>
								</Grid>
								<Grid>
									<Button
										variant="contained"
										type="submit"
										startIcon={<AddToPhotos />}
										sx={{ textTransform: 'none' }}
										size='large'
										fullWidth
									>
										Add to Library
									</Button>
								</Grid>
							</Grid>
						</Box>
					</Paper>
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<MolmakerMoleculePreview
						data={structureData}
						format={'xyz'}
						sx={{
							width: '100%',
							height: '100%',
							borderColor: 'grey.300',
							position: 'relative',
						}}
					/>
				</Grid>
			</Grid>
			<Grid container spacing={3} sx={{ marginTop: 3 }}>
				<Grid size={12}>
					<Paper elevation={3}>
						<Toolbar sx={{ justifyContent: 'space-between', bgcolor: blueGrey[200] }}>
							<Typography variant="h6" color="text.secondary">
								Saved Molecules
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center' }}>
								<Box sx={{ display: 'flex', alignItems: 'center' }}>
									<Tooltip title="View structure">
										<IconButton disabled={!selectedStructureId} onClick={() => {
											openMoleculeViewer(selectedStructureId);
										}}>
											<Visibility />
										</IconButton>
									</Tooltip>
									<Tooltip title="Delete structure">
										<IconButton disabled={!selectedStructureId}>
											<Delete />
										</IconButton>
									</Tooltip>
								</Box>
								<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
								<Tooltip title="Refresh structures">
									<IconButton onClick={handleRefresh}>
										<Refresh />
									</IconButton>
								</Tooltip>
							</Box>
						</Toolbar>
						<Divider />
						<TableContainer>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: blueGrey[50] }}>
										{renderHeader('Structure ID', 'structure_id')}
										{renderHeader('Name', 'name')}
									</TableRow>
								</TableHead>
								<TableBody>
									{filteredStructures.length === 0 && (
										<TableRow>
											<TableCell colSpan={3} align="center">
												<Typography variant="body2" color="text.secondary">
													No saved molecules found.
												</Typography>
											</TableCell>
										</TableRow>
									)}
									{filteredStructures.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((molecule) => (
										<TableRow 
											key={molecule.structure_id} 
											onClick={() => {
												setSelectedStructureId(molecule.structure_id == selectedStructureId ? "" : molecule.structure_id);
											}}
											sx={{
												backgroundColor: molecule.structure_id === selectedStructureId ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
												cursor: 'pointer'
											}}
										>
											<TableCell>{molecule.structure_id}</TableCell>
											<TableCell>{molecule.name}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							component="div"
							rowsPerPageOptions={[5, 10, 25]}
							count={filteredStructures.length}
							rowsPerPage={rowsPerPage}
							page={page}
							onPageChange={(_, newPage) => setPage(newPage)}
							onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
							sx={{ bgcolor: blueGrey[200] }}
						/>
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
};

export default MoleculeLibrary;

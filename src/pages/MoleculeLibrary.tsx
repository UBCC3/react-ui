import React, { useEffect } from "react";
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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { submitStructure } from "../services/api";
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AddToPhotosIcon from "@mui/icons-material/AddToPhotos";
import { fetchStructures } from "../services/api";
import { blueGrey } from "@mui/material/colors";
import { MolmakerMoleculePreview, MolmakerSectionHeader, MolmakerTextField } from "../MolmakerFormComponents";
import MolmakerPageTitle from "../MolmakerFormComponents/MolmakerPageTitle";

const MoleculeLibrary = () => {
	const { getAccessTokenSilently } = useAuth0();
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [name, setName] = useState("");
	const [molData, setMolData] = useState("");
	type Molecule = {
		structure_id: string;
		name: string;
		// add other properties if needed
	};
	const [savedMolecules, setSavedMolecules] = useState<Molecule[]>([]);
	const [selectedStructure, setSelectedStructure] = useState("");
	const [notes, setNotes] = useState("");

	const [page, setPage] = useState(0);
  	const [rowsPerPage, setRowsPerPage] = useState(5); 

	const handleChangePage = (_, newPage) => setPage(newPage);
	const handleChangeRowsPerPage = (e) => {                              
		setRowsPerPage(parseInt(e.target.value, 10));
		setPage(0);
	};   

	const handleRefresh = async () => {
		try {
		  const token = await getAccessTokenSilently();
		  const structs = await fetchStructures(token);
		  setSavedMolecules(structs);
		  setSelectedStructure("");
		} catch (err) {
		  console.error('Failed to refresh jobs', err);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSubmitAttempted(true);
		try {
			const token = await getAccessTokenSilently();
			await submitStructure(file, name, token);
			setFile(null);
			setName("");
			setMolData("");
		}
		catch (err) {
			console.error("Molecule submission failed", err);
		}
	}

	const openMoleculeViewer = async (structureId) => {
        try {
            const token = await getAccessTokenSilently();

            const res = await fetch(`${import.meta.env.VITE_STORAGE_API_URL}/presigned/${structureId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { url } = await res.json();

            const fileRes = await fetch(url);
            const xyz = await fileRes.text();
            setMolData(xyz);
        } catch (err) {
            console.error("Failed to load molecule structure:", err);
        }
    };

	useEffect(() => {
		const loadSavedMolecules = async () => {
			try {
				const token = await getAccessTokenSilently();
				const res = await fetchStructures(token);
				setSavedMolecules(res);
			} catch (err) {
				console.error("Failed to fetch jobs", err);
			}
		}

		loadSavedMolecules();
	}, [])


  	return (
		<Box bgcolor={'rgb(247, 249, 252)'} p={4}>
			<MolmakerPageTitle 
				title="Molecule Library" 
				subtitle="Upload and manage your molecules in the library." 
			/>
			<Grid container spacing={3}>
				<Grid size={{ xs: 12, md: 6 }}>
					<Paper elevation={3} sx={{ padding: 4 }}>
						<Box component="form">
							<Grid container direction="column" spacing={2}>
								<MolmakerSectionHeader text="Required fields are marked with *" />
								<Grid sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
									<Button
										variant="contained"
										component="label"
										startIcon={<CloudUploadIcon />}
										sx={{ textTransform: 'none' }}
										size='large'
										fullWidth
									>
										{file ? file.name : 'Select File'}
										<input
											hidden
											type="file"
											accept=".xyz,.pdb"
											onChange={(e) => {
												const files = e.target.files;
												const selected = files && files[0];
												setFile(selected);
												if (selected) {
													const reader = new FileReader();
													reader.onload = (ev) => {
														if (ev.target && typeof ev.target.result === "string") {
															setMolData(ev.target.result);
														}
													};
													reader.readAsText(selected);
												}
											}}
										/>
									</Button>
								</Grid>
								<Grid>
									<MolmakerTextField
										fullWidth
										label="Name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										error={submitAttempted && name === ""}
										helperText={submitAttempted && name === "" ? "Name is required" : ""}
										required
									/>
								</Grid>
								<Grid>
									<MolmakerTextField
										fullWidth
										label="Notes"
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										multiline
										rows={2}
									/>
								</Grid>
								<Grid>
									<Button
										variant="contained"
										component="label"
										startIcon={<AddToPhotosIcon />}
										sx={{ textTransform: 'none' }}
										size='large'
										onClick={handleSubmit}
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
						data={molData}
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
				<Grid size={{ xs: 12, md: 12 }}>
					<Paper elevation={3}>
						<Toolbar sx={{ justifyContent: 'space-between', bgcolor: blueGrey[200] }}>
							<Typography variant="h6" color="text.secondary">
								Saved Molecules
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center' }}>
								<Box sx={{ display: 'flex', alignItems: 'center' }}>
									<Tooltip title="View structure">
										<IconButton disabled={!selectedStructure} onClick={() => {
											openMoleculeViewer(selectedStructure);
										}}>
											<VisibilityIcon />
										</IconButton>
									</Tooltip>
									<Tooltip title="Delete structure">
										<IconButton disabled={!selectedStructure}>
											<DeleteIcon />
										</IconButton>
									</Tooltip>
								</Box>
								<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
								<Tooltip title="Refresh structures">
									<IconButton onClick={handleRefresh}>
										<RefreshIcon />
									</IconButton>
								</Tooltip>
							</Box>
						</Toolbar>
						<Divider />
						<TableContainer>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: blueGrey[50] }}>
										<TableCell>Structure ID</TableCell>
										<TableCell>Name</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{savedMolecules.length === 0 && (
										<TableRow>
											<TableCell colSpan={3} align="center">
												<Typography variant="body2" color="text.secondary">
													No saved molecules found.
												</Typography>
											</TableCell>
										</TableRow>
									)}
									{/* Map through saved molecules and create rows */}
									{savedMolecules.map((molecule) => (
										<TableRow 
											key={molecule.structure_id} 
											onClick={() => {
												setSelectedStructure(molecule.structure_id == selectedStructure ? "" : molecule.structure_id);
											}}
											sx={{
												backgroundColor: molecule.structure_id === selectedStructure ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
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
							count={savedMolecules.length}
							rowsPerPage={rowsPerPage}
							page={page}
							onPageChange={handleChangePage}
							onRowsPerPageChange={handleChangeRowsPerPage}
							sx={{ bgcolor: blueGrey[200] }}
						/>
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
};

export default MoleculeLibrary;

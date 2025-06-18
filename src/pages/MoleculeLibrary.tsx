import React, {useState, useEffect, useRef} from "react";
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
	Avatar,
} from "@mui/material";
import {
	Refresh,
	VisibilityOutlined,
	DeleteOutlineOutlined,
	ArrowDropUpOutlined,
	ArrowDropDownOutlined,
	Add
} from "@mui/icons-material";
import { blueGrey } from "@mui/material/colors";
import {
	MolmakerPageTitle,
	MolmakerLoading,
	MolmakerConfirm
} from "../components/custom";
import {
	getLibraryStructures,
	deleteStructure,
} from "../services/api";
import type { Structure } from "../types";
import MoleculeInfo from "../components/MoleculeInfo";
import MoleculeUpload from "../components/MoleculeUpload";

const MoleculeLibrary = () => {
	const { getAccessTokenSilently } = useAuth0();

	const [open, setOpen] = useState<boolean>(false);
	const [openAdd, setOpenAdd] = useState<boolean>(false);
	const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false);

	// state for user experience
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [order, setOrder] = useState<'asc' | 'desc'>('desc');
	const [orderBy, setOrderBy] = useState<keyof Structure>('uploaded_at');
	const [page, setPage] = useState<number>(0);
  	const [rowsPerPage, setRowsPerPage] = useState<number>(5);

	// form state
	const [libraryStructures, setLibraryStructures] = useState<Structure[]>([]);
	const [selectedStructureId, setSelectedStructureId] = useState<string>("");

	const handleRefresh = async () => {
		setLoading(true);
		try {
			const token = await getAccessTokenSilently();
			const response = await getLibraryStructures(token);
			setLibraryStructures(response.data);
			setSelectedStructureId("");
			setError(null);
		} catch (err) {
			setError('Failed to refresh molecules. Please try again later.');
			console.error('Failed to refresh jobs', err);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedStructureId) return;

		try {
			const token = await getAccessTokenSilently();
			await deleteStructure(selectedStructureId, token);
			setLibraryStructures(prev => prev.filter(molecule => molecule.structure_id !== selectedStructureId));
			setSelectedStructureId("");
			setError(null);
		} catch (err) {
			setError('Failed to delete molecule. Please try again later.');
			console.error('Failed to delete molecule', err);
		}
	};

	useEffect(() => {
		const loadSavedMolecules = async () => {
			try {
				const token = await getAccessTokenSilently();
				const response = await getLibraryStructures(token);
				setLibraryStructures(response.data.map((item: any) => ({
					structure_id: item.structure_id,
					user_sub: item.user_sub,
					name: item.name,
					notes: item.notes || '',
					location: item.location,
					uploaded_at: item.uploaded_at,
					tags: item.tags || [],
					imageS3URL: item.imageS3URL,
				})));
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
		const sorted = [...libraryStructures].sort((a, b) => {
			const aValue = a[column];
			const bValue = b[column];
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return newOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
			}
			// Handle undefined values
			if (aValue === undefined && bValue === undefined) return 0;
			if (aValue === undefined) return newOrder === 'asc' ? 1 : -1;
			if (bValue === undefined) return newOrder === 'asc' ? -1 : 1;
			return newOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
		});
		setLibraryStructures(sorted);
	};

  	return (
		<Box bgcolor={'rgb(247, 249, 252)'} p={4}>
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
			<MoleculeUpload
				open={openAdd}
				setOpen={setOpenAdd}
				setLibraryStructures={setLibraryStructures}
			/>
			<MoleculeInfo open={open} setOpen={setOpen} selectedStructureId={selectedStructureId} />
			<MolmakerPageTitle
				title="My Structure Library" 
				subtitle="Upload and manage the structures in your library." 
			/>
			<Grid container spacing={3} sx={{ marginTop: 3 }}>
				<Grid size={12}>
					<Paper elevation={3}>
						<Toolbar sx={{ justifyContent: 'space-between', bgcolor: blueGrey[200] }}>
							<Typography variant="h6" color="text.secondary">
								Structures
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center' }}>
								<Box sx={{ display: 'flex', alignItems: 'center' }}>
									<Tooltip title="Add new structure">
										<IconButton onClick={() => {
											setSelectedStructureId("");
											setOpenAdd(true);
										}}>
											<Add />
										</IconButton>
									</Tooltip>
									<Tooltip title="View structure">
										<IconButton disabled={!selectedStructureId} onClick={() => {
											setOpen(true);
										}}>
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
										{renderHeader('Name', 'name')}
										{renderHeader('Image','imageS3URL')}
										{renderHeader('Notes', 'notes')}
										{renderHeader('Tags', 'tags')}
										{renderHeader('Uploaded At', 'uploaded_at')}
									</TableRow>
								</TableHead>
								<TableBody>
									{libraryStructures.length === 0 && (
										<TableRow>
											<TableCell colSpan={4} align="center">
												<Typography variant="body2" color="text.secondary">
													No structures have been added yet.
												</Typography>
												<Button
													variant="contained"
													color="primary"
													sx={{ textTransform: 'none', mt: 2 }}
													startIcon={<Add />}
													onClick={() => setOpenAdd(true)}
												>
													Add Molecule
												</Button>
											</TableCell>
										</TableRow>
									)}
									{libraryStructures.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((molecule) => (
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
											<TableCell>{molecule.name}</TableCell>
											<TableCell>
												<Avatar
													variant="square"
													alt={`Thumbnail for ${molecule.name}`}
													src={molecule.imageS3URL}
													sx={{ width: 64, height: 64 }}
												/>
											</TableCell>
											<TableCell>{molecule.notes}</TableCell>
											<TableCell>
												{molecule.tags.length > 0 ? (
													molecule.tags.join(', ')
												) : (
													<Typography variant="body2" color="text.secondary">No tags</Typography>
												)}
											</TableCell>
											<TableCell>{new Date(molecule.uploaded_at).toLocaleString()}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							component="div"
							rowsPerPageOptions={[5, 10, 25]}
							count={libraryStructures.length}
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

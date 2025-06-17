import React, {useState, useEffect} from 'react'
import { Box, Button, Drawer, Grid, Autocomplete, Chip, TextField } from '@mui/material'
import { MolmakerMoleculePreview, MolmakerTextField, MolmakerSectionHeader,  } from '../components/custom'
import { useAuth0 } from '@auth0/auth0-react'
import { CloudUploadOutlined, AddPhotoAlternateOutlined, Close } from '@mui/icons-material'
import { AddAndUploadStructureToS3, getLibraryStructures, getStructuresTags, getChemicalFormula } from '../services/api' 


const MoleculeUpload = ({ open, setOpen, setLibraryStructures }) => {
	const [state, setState] = useState({
		right: false,
	})
	const [structureData, setStructureData] = useState<string>('')
	const [structureName, setStructureName] = useState<string>('')
	const [structureNotes, setStructureNotes] = useState<string>('')
	const [strucutreImageURL, setStructureImageURL] = useState<string>('')
	const [loading, setLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)
	const [uploadedFile, setUploadedFile] = useState<File | null>(null)
	const [submitAttempted, setSubmitAttempted] = useState<boolean>(false)
	const [tags, setTags] = useState<string[]>([])
	const [options, setOptions] = useState<string[]>([])
	const [chemicalFormula, setChemicalFormula] = useState<string>('')

	useEffect(() => {
		const fetchTags = async () => {
			try {
				const token = await getAccessTokenSilently();
				const response = await getStructuresTags(token);
				if (response.data) {
					setOptions(response.data);
				}
			} catch (err) {
				console.error("Failed to fetch tags", err);
			}
		}

		fetchTags();
	}, [])

	useEffect(() => {
		if (open) {
			setStructureData('')
			setStructureName('')
			setStructureNotes('')
			setUploadedFile(null)
			setSubmitAttempted(false)
			setTags([])
		}
	}, [open])

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
			await AddAndUploadStructureToS3(uploadedFile, structureName, chemicalFormula, structureNotes, strucutreImageURL, token, tags);

			// Refresh the library after successful submission
			const response = await getLibraryStructures(token);
			setLibraryStructures(response.data);
			// Reset form state
			setUploadedFile(null);
			setStructureName("");
			setStructureData("");
			setStructureNotes("");
			setError(null);
			setSubmitAttempted(false);
			setOpen(false);
			setTags([]);
		} catch (err) {
			setError('Molecule submission failed. Please try again.');
			console.error("Molecule submission failed", err);
		} finally {
			setLoading(false);
		}
	}
	
	const { getAccessTokenSilently } = useAuth0()

	const toggleDrawer = (anchor: 'right', open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
		if (
			event.type === 'keydown' &&
			(event as React.KeyboardEvent).key === 'Tab' ||
			(event as React.KeyboardEvent).key === 'Shift'
		) {
			return
		}
		setOpen(open)
		if (open) {
			setState({ ...state, [anchor]: true })
		} else {
			setState({ ...state, [anchor]: false })
		}
	}

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

		if (selected && selected.name.endsWith('.xyz')) {
			try {
				const token = await getAccessTokenSilently();
				const formula = await getChemicalFormula(selected, token);
				setChemicalFormula(formula.data['formula'] || '');
			} catch (err) {
				console.error("Failed to get chemical formula", err);
				setError('Failed to get chemical formula. Please try again.');
			}
		} else {
			setError('Please upload a valid .xyz file.');
			setStructureData('');
		}
	};

	const anchor = 'right'

	return (
		<React.Fragment key={anchor}>
			{loading && <div>Loading...</div>}
			{error && <div style={{ color: 'red' }}>{error}</div>}
			<Drawer
				anchor={'right'}
				open={open}
				onClose={toggleDrawer(anchor, false)}
				sx={{
					'& .MuiDrawer-paper': {
						width: 450,
					},
				}}
			>
				<MolmakerMoleculePreview
					data={structureData}
					format={'xyz'}
					sx={{
						width: '100%',
						height: '350px',
						borderColor: 'grey.300',
						position: 'relative',
					}}
					title="Add Structure"
					onSnapshot={setStructureImageURL}
				/>
				<Box sx={{ padding: 2, display: 'flex', flexDirection: 'column', gap: 2 }} component="form" onSubmit={handleSubmit}>
					<MolmakerSectionHeader text="Structure Information" />
					<Button
						variant="contained"
						component="label"
						startIcon={<CloudUploadOutlined />}
						sx={{ textTransform: 'none' }}
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
					<MolmakerTextField
						fullWidth
						label="Name"
						value={structureName}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStructureName(e.target.value)}
						error={submitAttempted && structureName === ""}
						helperText={submitAttempted && structureName === "" ? "Name is required" : ""}
						required
					/>
					<MolmakerTextField
						fullWidth
						label="Chemical Formula"
						value={chemicalFormula}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChemicalFormula(e.target.value)}
						error={submitAttempted && chemicalFormula === ""}
						helperText={submitAttempted && chemicalFormula === "" ? "Chemical formula is required" : ""}
						required
					/>
					<MolmakerTextField
						fullWidth
						label="Notes"
						value={structureNotes}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStructureNotes(e.target.value)}
						multiline
						rows={4}
					/>
					<Autocomplete
						multiple
						freeSolo
						id="tags-input"
						options={options}
						value={tags}
						onChange={(e, newValue) => {
							setTags(newValue.filter(tag => tag.trim() !== ''));
						}}
						renderInput={(params) => (
							<TextField
								{...params}
								variant="outlined"
								label="Tags"
								placeholder="Press enter to add tags"
							/>
						)}
					/>
					<Grid container spacing={2}>
						<Grid size={6}>
							<Button
								variant="outlined"
								type="submit"
								startIcon={<AddPhotoAlternateOutlined />}
								sx={{ textTransform: 'none' }}
								fullWidth
							>
								Add to Library
							</Button>
						</Grid>
						<Grid size={6}>
							<Button
								variant="outlined"
								color="inherit"
								onClick={() => setOpen(false)}
								startIcon={<Close />}
								sx={{ textTransform: 'none' }}
								fullWidth
							>
								Close
							</Button>
						</Grid>
					</Grid>
				</Box>
			</Drawer>
		</React.Fragment>
	)
}

export default MoleculeUpload
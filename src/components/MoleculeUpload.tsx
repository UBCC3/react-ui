import React, {useState, useEffect} from 'react'
import { Box, Button, Drawer, Grid, Autocomplete, Chip, TextField } from '@mui/material'
import {
	MolmakerMoleculePreview,
	MolmakerTextField,
	MolmakerSectionHeader,
	MolmakerConfirm,
} from '../components/custom'
import { useAuth0 } from '@auth0/auth0-react'
import { CloudUploadOutlined, AddPhotoAlternateOutlined, Close } from '@mui/icons-material'
import { AddAndUploadStructureToS3, getLibraryStructures, getStructuresTags, getChemicalFormula } from '../services/api' 
import {Structure} from "../types";

/**
 * Props for the MoleculeUpload
 */
interface MoleculeUploadProps {
	open: boolean,
	setOpen: React.Dispatch<React.SetStateAction<boolean>>,
	setLibraryStructures:  React.Dispatch<React.SetStateAction<Structure[]>>,
}

/**
 * Drawer component for uploading a new molecule structure to the user's library.
 * 
 * This component handles:
 * - Selecting and reading a `.xyz` molecule file
 * - Previewing the molecule before upload
 * - Automatically extracting the chemical formula from the uploaded file
 * - Capturing the molecule preview image after user confirmation
 * - Uploading the molecule file, metadata, tags, and preview image to S3/backend
 * - Refreshing the molecule library after upload
 * 
 * Props:
 * - `open` contrls whether the drawer is visible.
 * - `setOpen` opens or closes the drawer from the parent component.
 * - `setLibraryStructures` updates the parent library list after a successful upload.
 */
const MoleculeUpload: React.FC<MoleculeUploadProps> = ({
	open,
	setOpen,
	setLibraryStructures,
}) => {
	const [state, setState] = useState({
		right: false,
	})
	const [structureData, setStructureData] = useState<string>('')
	const [structureName, setStructureName] = useState<string>('')
	const [structureNotes, setStructureNotes] = useState<string>('')
	const [loading, setLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)
	const [uploadedFile, setUploadedFile] = useState<File | null>(null)
	const [submitAttempted, setSubmitAttempted] = useState<boolean>(false)
	const [tags, setTags] = useState<string[]>([])
	const [options, setOptions] = useState<string[]>([])
	const [chemicalFormula, setChemicalFormula] = useState<string>('')

	const [structureImageData, setStructureImageData] = useState<string>('')
	const [openConfirmImage, setOpenConfirmImage] = useState<boolean>(false);
	const [submitConfirmed, setSubmitConfirmed] = useState<boolean>(false);

    /**
     * Performs the upload after the preview image has been captured.
     */
	useEffect(() => {
		const getStructureImageSubmit = async () => {
			if (!submitConfirmed || structureImageData === '') return

			await performUpload();
			setSubmitConfirmed(false);
		}

		getStructureImageSubmit();
	}, [structureImageData]);

    /**
     * Fetches all existing structure tags when the component first mounts.
     */
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

    /**
     * Resets the upload form whenever the drawer is opened.
     */
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

    /**
     * Uploads the selected molecule and its metadata to the backend.
     * 
     * This function:
     * - Prevents duplpicate submissions
     * - Validates that a file and molecule name exist
     * - Uploads the file, chemical formula, notes, preview image, and tags
     * - Refreshes the library list after a successful upload
     * - Resets the form and closes the drawer
     */
	async function performUpload() {
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
			await AddAndUploadStructureToS3(
				uploadedFile,
				structureName,
				chemicalFormula,
				structureNotes,
				structureImageData,
				token,
				tags
			);

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

    /**
     * Handles the upload form submission.
     */
	const handleSubmit = (event: React.FormEvent<HTMLFormElement>):void => {
		event.preventDefault();
		setOpenConfirmImage(true);
	}
	
	const { getAccessTokenSilently } = useAuth0()

    /**
     * Creates a drawer toggle handler for opening or closing the upload drawer.
     * 
     * The returned handler ignores Tab and Shift keydown events so normal keyboard
     * navigation does not accidentally close the drawer.
     */
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

    /**
     * Handles molecule file selection from the hidden file input.
     * 
     * This function:
     * - Stores the selected file
     * - Reads the `.xyz` file as text for molecule preview
     * - Sends the file to the backend to extract its chemical formula
     * - Rejects non-`.xyz` files and clears the preview
     */
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
				<MolmakerConfirm
					open={openConfirmImage}
					onClose={() => setOpenConfirmImage(false)}
					textToShow={
						<>
							Confirm the current zoom and orientation to capture the structure image.<br />
							This view will be captured and saved as the snapshot for this structure.<br />
							You can scroll to zoom and drag to rotate the molecule before confirming.
						</>
					}
					onConfirm={async () => {
						setSubmitConfirmed(true);
						setOpenConfirmImage(false);
					}}
				/>
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
					submitConfirmed={submitConfirmed}
					setStructureImageData={setStructureImageData}
				/>
				<Box p={3} className="bg-stone-100 h-full display flex flex-col" gap={3} component="form" onSubmit={handleSubmit}>
					<MolmakerSectionHeader text="Structure Information" sx={{ fontWeight: 'bold', mt: 1 }} />
					<Button
						variant="contained"
						component="label"
						startIcon={<CloudUploadOutlined />}
						sx={{ textTransform: 'none', borderRadius: 2 }}
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
								sx={{ textTransform: 'none', borderRadius: 2 }}
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
								sx={{ textTransform: 'none', borderRadius: 2 }}
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
};

export default MoleculeUpload;

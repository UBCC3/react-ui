import React, {useState, useEffect} from 'react'
import { Box, Button, Drawer, Grid, Autocomplete, TextField } from '@mui/material'
import { MolmakerMoleculePreview, MolmakerTextField, MolmakerSectionHeader } from '../components/custom'
import { getStructureDataFromS3, getStructureById, updateStructure, getStructuresTags } from '../services/api'
import { useAuth0 } from '@auth0/auth0-react'
import { Edit, Close, Save } from '@mui/icons-material'

const MoleculeInfo = ({ open, setOpen, selectedStructureId }) => {
	const [isEditing, setIsEditing] = useState<boolean>(false)
	const [state, setState] = useState({
		right: false,
	})
	const [structureData, setStructureData] = useState<string>('')
	const [structureName, setStructureName] = useState<string>('')
	const [chemicalFormula, setChemicalFormula] = useState<string>('')
	const [structureNotes, setStructureNotes] = useState<string>('')
	const [tags, setTags] = useState<string[]>([])
	const [loading, setLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)
	const [options, setOptions] = useState<string[]>([])
	const { getAccessTokenSilently } = useAuth0()

	useEffect(() => {
		const fetchTags = async () => {
			try {
				const token = await getAccessTokenSilently()
				const response = await getStructuresTags(token)
				if (response.data) {
					setOptions(response.data)
				}
			}
			catch (err) {
				console.error("Failed to fetch tags", err)
				setError('Failed to load tags. Please try again.')
			}
		}
		fetchTags()
	}, [])

	useEffect(() => {
		const fetchStructureInfo = async () => {
			if (!selectedStructureId) return
			setLoading(true)
			setError(null)
			try {
				const token = await getAccessTokenSilently()
				const response = await getStructureById(selectedStructureId, token)
				if (response.error) {
					setError('Failed to load structure info. Please try again.')
					return
				}
				setStructureName(response.data.name || '')
				setStructureNotes(response.data.notes || '')
				setTags(response.data.tags || [])
				setChemicalFormula(response.data.formula || '')
			} catch (err) {
				setError('Failed to load structure info. Please try again.')
				console.error("Failed to load structure info:", err)
			} finally {
				setLoading(false)
			}
		}

		console.log('Selected Molecule:', selectedStructureId)
		if (selectedStructureId) {
			openMoleculeViewer(selectedStructureId)
			fetchStructureInfo()
		} else {
			setStructureData('')
		}
	}, [selectedStructureId])

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
			setIsEditing(false)
		} else {
			setState({ ...state, [anchor]: false })
			setIsEditing(false)
		}
	}

	const handleSave = async () => {
		if (!selectedStructureId) return
		setLoading(true)
		setError(null)
		
		try {
			const token = await getAccessTokenSilently()
			const response = await updateStructure(selectedStructureId, structureName, chemicalFormula, structureNotes, token, tags)
			if (response.error) {
				setError('Failed to save changes. Please try again.')
				return
			}
			setIsEditing(false)
			setError(null)
		} catch (err) {
			setError('Failed to save changes. Please try again.')
			console.error("Failed to save changes:", err);
		} finally {
			setLoading(false)
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

	const anchor = 'right'

	return (
		<React.Fragment key={anchor}>
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
					title={isEditing ? 'Edit Structure' : 'View Structure'}
				/>
				{loading && <div>Loading...</div>}
				{error && <div style={{ color: 'red' }}>{error}</div>}
				{selectedStructureId && (
					<Box sx={{ padding: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
						<MolmakerSectionHeader text="Structure Information" />
						<MolmakerTextField
							label="Name"
							value={structureName}
							onChange={(e) => setStructureName(e.target.value)}
							fullWidth
							disabled={!isEditing}
						/>
						<MolmakerTextField
							label="Chemical Formula"
							value={chemicalFormula}
							onChange={(e) => setChemicalFormula(e.target.value)}
							fullWidth
							disabled={!isEditing}
						/>
						<MolmakerTextField
							label="Notes"
							value={structureNotes}
							onChange={(e) => setStructureNotes(e.target.value)}
							fullWidth
							multiline
							rows={4}
							disabled={!isEditing}
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
							disabled={!isEditing}
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
							<Grid size={{ xs: 6, sm: 6, md: 6 }}>
								{isEditing ? (
									<Button
										variant="contained"
										color="primary"
										onClick={handleSave}
										sx={{ textTransform: 'none' }}
										fullWidth
										startIcon={<Save />}
									>
										Save
									</Button>
								) : (
									<Button
										variant="outlined"
										color="primary"
										onClick={() => setIsEditing(true)}
										sx={{ textTransform: 'none' }}
										fullWidth
										startIcon={<Edit />}
									>
										Edit
									</Button>
								)}
							</Grid>
							<Grid size={{ xs: 6, sm: 6, md: 6 }}>
								<Button
									variant="outlined"
									color="inherit"
									onClick={() => setOpen(false)}
									sx={{ textTransform: 'none' }}
									fullWidth
									startIcon={<Close />}
								>
									Close
								</Button>
							</Grid>
						</Grid>
					</Box>
				)}
			</Drawer>
		</React.Fragment>
	)
}

export default MoleculeInfo
import React, {useState, useEffect} from 'react'
import { Box, Button, Drawer, Grid, Autocomplete, TextField } from '@mui/material'
import { MolmakerMoleculePreview, MolmakerTextField, MolmakerSectionHeader, MolmakerConfirm } from '../components/custom'
import { getStructureDataFromS3, getStructureById, updateStructure, getStructuresTags } from '../services/api'
import { useAuth0 } from '@auth0/auth0-react'
import { Edit, Close, Save } from '@mui/icons-material'

/**
 * Side drawer component for viewing and editing information about a selected molecule.
 * 
 * This componnet handles:
 * - Loading molecule structure data from S3
 * - Displaying the molecule preview
 * - Loading saved structure metadata such as name, formula, notes, and tags
 * - Fetching available tag options
 * - Switching between view mode and edit mode
 * - Saving edited structure information back to the backend
 */
const MoleculeInfo = ({ open, setOpen, selectedStructureId, onStructureUpdated }) => {
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

    // States to manage unsaved structure edits
    const [showUnsavedDialog, setShowUnsavedDialog] = useState<boolean>(false)
    const [originalValues, setOriginalValues] = useState({ name: '', formula: '', notes: '', tags: [] as string[] })

	const { getAccessTokenSilently } = useAuth0()

    /**
     * Fetches all existing structure tags when the component first mounts.
     * 
     * These tags are used as autocomplete suggestions in the tags input field.
     */
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

    /**
     * Loads molecule structure data and metadata whenever the selected structure changes.
     * 
     * If a structure is selected, this effect:
     * - Loads the molecule geometry for the preview
     * - Loads the structure name, notes, tags, and formula
     * 
     * If no structure is selected, it clears the molecule preiview data.
     */
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

                setOriginalValues({
                    name: response.data.name || '',
                    formula: response.data.formula || '',
                    notes: response.data.notes || '',
                    tags: response.data.tags || []
                })
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

    /**
     * Creates a drawer toggle handler for opening or closing the molecule info drawer.
     * 
     * The returned handler ignores Tab and Shift keydown events so keyboard navigation
     * does not accidentally close or open the drawer.
     * 
     * When the drawer opens or closes, edit mode is also reset to false.
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
			setIsEditing(false)
		} else {
			setState({ ...state, [anchor]: false })
			setIsEditing(false)
		}
	}

    /**
     * Saves the edited structure information to the backend
     * 
     * This sends the updated name, chemical formula, notes, and tags for the
     * currently selected structure. If the save succeeds, the component exits
     * edit mode.
     */
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

            // Handle structure table update without page refresh
            onStructureUpdated?.({
                structure_id: selectedStructureId,
                name: structureName,
                formula: chemicalFormula,
                notes: structureNotes,
                tags: tags
            })
		} catch (err) {
			setError('Failed to save changes. Please try again.')
			console.error("Failed to save changes:", err);
		} finally {
			setLoading(false)
		}
	}

    /**
     * Loads molecule geometry data for the selected structure.
     * 
     * The molecule data is fetched from S3 and stored in `structureData`,
     * which is then passed into the molecule preview component.
     */
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

    const hasUnsavedChanges = () => isEditing && (
        structureName !== originalValues.name ||
        chemicalFormula !== originalValues.formula ||
        structureNotes !== originalValues.notes ||
        JSON.stringify(tags) !== JSON.stringify(originalValues.tags)
    )

    const handleClose = () => {
        if (hasUnsavedChanges()) {
            setShowUnsavedDialog(true)
        } else {
            setIsEditing(false)
            setOpen(false)
        }
    }

	const anchor = 'right'

	return (
		<React.Fragment key={anchor}>
            <MolmakerConfirm
                open={showUnsavedDialog}
                onClose={() => setShowUnsavedDialog(false)}
                textToShow={"You have unsaved changes. Do you want to save before closing?"}
                onConfirm={async () => {
                    await handleSave()
                    setShowUnsavedDialog(false)
                    setIsEditing(false)
                    setOpen(false)
                }}
            />
			<Drawer
				anchor={'right'}
				open={open}
				// onClose={toggleDrawer(anchor, false)}
                onClose={handleClose}
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
					<Box p={3} className="bg-stone-100 h-full display flex flex-col" gap={3}>
						<MolmakerSectionHeader text="Structure Information" sx={{ fontWeight: 'bold', mt: 1 }} />
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
										sx={{ textTransform: 'none', borderRadius: 2 }}
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
										sx={{ textTransform: 'none', borderRadius: 2 }}
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
									// onClick={() => setOpen(false)}
                                    onClick={handleClose}
									sx={{ textTransform: 'none', borderRadius: 2 }}
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
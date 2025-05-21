import { useEffect, useRef, useState } from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	CircularProgress,
	Box
} from '@mui/material'

const MoleculeViewerDialogue = ({ structure_id, open, setOpen }) => {
	const [structure, setStructure] = useState(null)
	const [loading, setLoading] = useState(true)
	const viewerRef = useRef()

	useEffect(() => {
		if (!structure_id || !window.$3Dmol) return

		const loadMolecule = async () => {
			try {
				const res = await fetch(`${import.meta.env.VITE_STORAGE_API_URL}/presigned/${structure_id}`)
				const { url } = await res.json()
				const fileRes = await fetch(url)
				const xyz = await fileRes.text()
				setStructure(xyz)
			} catch (err) {
				console.error("Failed to load molecule structure:", err)
			} finally {
				setLoading(false)
			}
		}

		setStructure(null)
		setLoading(true)
		loadMolecule()
	}, [structure_id])

	useEffect(() => {
		if (!structure || !window.$3Dmol || !viewerRef.current) return

		viewerRef.current.innerHTML = "" // clear previous render
		const viewer = window.$3Dmol.createViewer(viewerRef.current, {
			backgroundColor: "white",
		})
		viewer.addModel(structure, "xyz")
		viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } })
		viewer.zoomTo()
		viewer.resize()
		viewer.render()
	}, [structure])

	const handleClose = () => {
		setStructure(null)
		setOpen(false)
	}

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
			<DialogTitle>Molecule Viewer</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: 2 }}>
					Here is the structure of the molecule you selected.
				</DialogContentText>
				{loading ? (
					<Box display="flex" justifyContent="center" alignItems="center" height="100%">
						<CircularProgress />
					</Box>
				) : (
					<Box
						sx={{
							width: '100%',
							height: '400px',
							flex: 1,
							position: 'relative',
							border: '1px solid',
							borderColor: 'grey.300'
						}}
					>
						<div
							ref={viewerRef}
							style={{
									width: '100%',
									height: '100%',
									border: '1px solid #ccc',
									boxSizing: 'border-box'
							}}
						/>
					</Box>
				)}
			</DialogContent>
		</Dialog>
	)
}

export default MoleculeViewerDialogue

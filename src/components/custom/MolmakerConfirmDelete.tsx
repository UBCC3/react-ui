import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Button
} from '@mui/material'

const MolmakerConfirmDelete = ({ open, onClose, onConfirm }) => {
	return (
		<Dialog open={open} onClose={onClose}>
			<DialogTitle>
				Confirm
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Are you sure you want to delete this job? This action cannot be undone.
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={onConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>
					Delete
				</Button>
				<Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
					Cancel
				</Button>
			</DialogActions>
		</Dialog>
	)
}

export default MolmakerConfirmDelete
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Button
} from '@mui/material'

const MolmakerConfirm = ({ 
	open,
	onClose,
	textToShow,
	onConfirm 
}) => {
	return (
		<Dialog open={open} onClose={onClose}>
			<DialogTitle>
				Confirm
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					{textToShow}
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={onConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>
					Confirm
				</Button>
				<Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
					Cancel
				</Button>
			</DialogActions>
		</Dialog>
	)
}

export default MolmakerConfirm
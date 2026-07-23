import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Button,
} from "@mui/material";
import { ReactNode } from "react";

interface MolmakerConfirmProps {
	open: boolean;
	onClose: () => void;
	textToShow: ReactNode;
	onConfirm: () => void;
}

/**
 * Renders a reusable Confirmation dialog.
 *
 * Props:
 * - open: whether the dialog opens or not
 * - onClose: actions taken after closing the dialog
 * - textToShow: written text on the dialog
 * - onConfirm: actions taken after confirming the prompt
 */
const MolmakerConfirm = ({ open, onClose, textToShow, onConfirm }: MolmakerConfirmProps) => {
	return (
		<Dialog open={open} onClose={onClose}>
			<DialogTitle>Confirm</DialogTitle>
			<DialogContent>
				<DialogContentText>{textToShow}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={onConfirm}
					variant="contained"
					color="error"
					sx={{ textTransform: "none" }}
				>
					Confirm
				</Button>
				<Button onClick={onClose} variant="outlined" sx={{ textTransform: "none" }}>
					Cancel
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default MolmakerConfirm;

import React, { useState } from "react";
import {
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Divider,
	Autocomplete,
	TextField,
} from "@mui/material";
import { AddPhotoAlternateOutlined } from "@mui/icons-material";
import { grey, blueGrey } from "@mui/material/colors";
import { useAuth0 } from "@auth0/auth0-react";
import { MolmakerTextField } from "../custom";
import { AddAndUploadStructureToS3 } from "../../services/api";

interface AddStructureToLibraryProps {
	viewerObj: any;
	viewerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Button + dialog for saving the structure currently shown in a JSmol viewer
 * to the user's library. Captures the canvas as a PNG preview and exports the
 * on-screen structure as XYZ, then uploads both with the entered metadata.
 */
const AddStructureToLibrary = ({ viewerObj, viewerRef }: AddStructureToLibraryProps) => {
	const { getAccessTokenSilently } = useAuth0();

	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const options: string[] = [];
	const [moleculeName, setMoleculeName] = useState("");
	const [chemicalFormula, setChemicalFormula] = useState("");
	const [moleculeNotes, setMoleculeNotes] = useState("");
	const [structureTags, setStructureTags] = useState<string[]>([]);
	const [submitAttempted, setSubmitAttempted] = useState(false);

	const handleSubmit = async () => {
		setSubmitAttempted(true);
		if (!moleculeName || !chemicalFormula) return;

		const canvas = viewerRef.current?.querySelector("canvas");
		const imageDataUrl = canvas?.toDataURL("image/png") || "";

		const xyzString = window.Jmol.evaluate(viewerObj, 'write("xyz")');
		const xyzBlob = new Blob([xyzString], { type: "chemical/x-xyz" });
		const xyzFile = new File([xyzBlob], `${moleculeName || "structure"}.xyz`, {
			type: "chemical/x-xyz",
		});

		const token = await getAccessTokenSilently();

		await AddAndUploadStructureToS3(
			xyzFile,
			moleculeName,
			chemicalFormula,
			moleculeNotes,
			imageDataUrl,
			token,
			structureTags,
		);

		setAddDialogOpen(false);
		setMoleculeName("");
		setChemicalFormula("");
		setMoleculeNotes("");
		setStructureTags([]);
		setSubmitAttempted(false);
	};

	return (
		<>
			<Button
				variant="contained"
				color="primary"
				sx={{ textTransform: "none " }}
				startIcon={<AddPhotoAlternateOutlined />}
				onClick={() => setAddDialogOpen(true)}
				disabled={!viewerObj}
			>
				Add Structure to My Library
			</Button>
			<Dialog
				open={addDialogOpen}
				onClose={() => setAddDialogOpen(false)}
				container={typeof window !== "undefined" ? document.body : undefined}
				sx={{ zIndex: 9999 }}
				disableEnforceFocus
			>
				<DialogTitle
					sx={{ bgcolor: blueGrey[300], color: grey[800], display: "flex", alignItems: "center" }}
				>
					<AddPhotoAlternateOutlined sx={{ mr: 1 }} />
					Add Structure to My Library
				</DialogTitle>
				<Divider />
				<DialogContent sx={{ display: "flex", flexDirection: "column", p: 2, minWidth: 500 }}>
					<MolmakerTextField
						fullWidth
						label="Structure Name"
						value={moleculeName}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMoleculeName(e.target.value)}
						required
						error={submitAttempted && !moleculeName}
						helperText={submitAttempted && !moleculeName ? "Please enter a name" : ""}
						sx={{ mt: 1 }}
					/>
					<MolmakerTextField
						fullWidth
						label="Chemical Formula"
						value={chemicalFormula}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setChemicalFormula(e.target.value)
						}
						required
						error={submitAttempted && !chemicalFormula}
						helperText={
							submitAttempted && !chemicalFormula ? "Please enter a chemical formula" : ""
						}
						sx={{ mt: 2 }}
					/>
					<MolmakerTextField
						fullWidth
						label="Structure Notes"
						value={moleculeNotes}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMoleculeNotes(e.target.value)}
						multiline
						rows={3}
						sx={{ mt: 2 }}
					/>
					<Autocomplete
						multiple
						freeSolo
						disablePortal
						options={options}
						value={structureTags}
						onChange={(_, newValue) => setStructureTags(newValue)}
						renderInput={(params) => (
							<TextField
								{...params}
								variant="outlined"
								label="Structure Tags"
								placeholder="Press enter to add tags"
							/>
						)}
						sx={{ mt: 2 }}
					/>
				</DialogContent>
				<DialogActions sx={{ pr: 2, pb: 2 }}>
					<Button onClick={() => setAddDialogOpen(false)} sx={{ textTransform: "none" }}>
						Cancel
					</Button>
					<Button variant="contained" onClick={handleSubmit} sx={{ textTransform: "none" }}>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default AddStructureToLibrary;

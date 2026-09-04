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
	Alert,
} from "@mui/material";
import { AddPhotoAlternateOutlined } from "@mui/icons-material";
import { grey, blueGrey } from "@mui/material/colors";
import { useAuth0 } from "@auth0/auth0-react";
import { MolmakerTextField } from "../custom";
import { AddAndUploadStructureToS3, getChemicalFormula } from "../../services/api";

interface AddStructureToLibraryProps {
	viewerObj: any;
	viewerRef: React.RefObject<HTMLDivElement | null>;
	infoText?: React.ReactNode;
	onDialogOpen?: () => void;
}

/**
 * Button + dialog for saving the structure currently shown in a JSmol viewer
 * to the user's library. Captures the canvas as a PNG preview and exports the
 * on-screen structure as XYZ, then uploads both with the entered metadata.
 */
const AddStructureToLibrary = ({
	viewerObj,
	viewerRef,
	infoText,
	onDialogOpen,
}: AddStructureToLibraryProps) => {
	const { getAccessTokenSilently } = useAuth0();

	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const options: string[] = [];
	const [moleculeName, setMoleculeName] = useState("");
	const [chemicalFormula, setChemicalFormula] = useState("");
	const [moleculeNotes, setMoleculeNotes] = useState("");
	const [structureTags, setStructureTags] = useState<string[]>([]);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [formulaLoading, setFormulaLoading] = useState(false);
	const [formulaError, setFormulaError] = useState<string | null>(null);

	const exportDisplayedStructure = (filename: string) => {
		const xyzString = String(window.Jmol.evaluate(viewerObj, 'write("xyz")'));
		if (!xyzString.trim()) throw new Error("The displayed structure could not be exported.");

		const xyzBlob = new Blob([xyzString], { type: "chemical/x-xyz" });
		return new File([xyzBlob], filename, { type: "chemical/x-xyz" });
	};

	const handleOpen = async () => {
		onDialogOpen?.();
		setAddDialogOpen(true);
		setChemicalFormula("");
		setFormulaError(null);
		setSubmitAttempted(false);
		setFormulaLoading(true);

		try {
			// Calculate from the same displayed result structure that will be saved.
			window.Jmol.script(viewerObj, "vibration OFF; frame last;");
			const xyzFile = exportDisplayedStructure("result-structure.xyz");
			const token = await getAccessTokenSilently();
			const response = await getChemicalFormula(xyzFile, token);
			const formula = response.data?.formula;
			if (response.error || typeof formula !== "string" || !formula.trim()) {
				throw new Error(response.error || "No chemical formula was returned.");
			}
			setChemicalFormula(formula);
		} catch (error) {
			console.error("Failed to calculate the result structure formula", error);
			setFormulaError("Formula could not be calculated automatically. Enter it manually.");
		} finally {
			setFormulaLoading(false);
		}
	};

	const handleSubmit = async () => {
		setSubmitAttempted(true);
		if (!moleculeName || !chemicalFormula) return;

		// Freeze any animation and settle to the reference frame before capture,
		// so we never export a mid-vibration/mid-optimization geometry even if the
		// caller forgot to stop it via onDialogOpen.
		window.Jmol.script(viewerObj, "vibration OFF; frame last;");

		const canvas = viewerRef.current?.querySelector("canvas");
		const imageDataUrl = canvas?.toDataURL("image/png") || "";

		const xyzFile = exportDisplayedStructure(`${moleculeName || "structure"}.xyz`);

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
				onClick={handleOpen}
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
					{infoText && (
						<Alert severity="info" sx={{ mb: 2 }}>
							{infoText}
						</Alert>
					)}
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
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							setChemicalFormula(e.target.value);
							setFormulaError(null);
						}}
						required
						disabled={formulaLoading}
						error={Boolean(formulaError) || (submitAttempted && !chemicalFormula)}
						helperText={
							formulaLoading
								? "Calculating formula from the displayed structure..."
								: formulaError ||
									(submitAttempted && !chemicalFormula ? "Please enter a chemical formula" : "")
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
					<Button
						variant="contained"
						onClick={handleSubmit}
						disabled={formulaLoading}
						sx={{ textTransform: "none" }}
					>
						Save
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default AddStructureToLibrary;

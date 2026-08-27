import {
	ListItemText,
	MenuItem,
	MenuList,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import { blueGrey, grey } from "@mui/material/colors";
import { Atom } from "../../types/JSmol";
import React, { useEffect, useState } from "react";

/**
 * Props for the PartialCharge component.
 */
interface PartialChargeProps {
	viewerObj: any;
	frameNo: number;
	onError?: (message: string) => void;
}

/** Narrow one raw JSmol atomInfo entry into the app's Atom shape. */
const toAtom = (info: any): Atom => ({
	atomIndex: info.atomIndex,
	atomNo: info.atomno,
	bondCount: info.bondCount,
	element: info.element,
	model: info.model,
	partialCharge: info.partialCharge,
	sym: info.sym,
	x: info.x,
	y: info.y,
	z: info.z,
});

/**
 * Displays partial charges for atoms in the selected JSmol frame.
 *
 * This component asks JSmol to calculate partial charges, extracts atom
 * information from the viewer, and displays the charges in a table. Clicking
 * an atom row labels that atom in the viewer with its partial charge.
 */
const PartialCharge: React.FC<PartialChargeProps> = ({ viewerObj, frameNo, onError }) => {
	// Atom information extracted from JSmol after partial charge calculation.
	const [atoms, setAtoms] = useState<Atom[]>([]);

	// Currently selected atom to highlight/label in the viewer.
	const [selectAtom, setSelectAtom] = useState<Atom | null>(null);

	// Run the calculation synchronously so atomInfo is read only after the Jmol
	// script queue reports completion.
	useEffect(() => {
		if (!viewerObj) return;

		try {
			const scriptResult = window.Jmol.scriptWait(
				viewerObj,
				`frame ${frameNo};
				calculate PARTIALCHARGE;`,
			);
			if (
				typeof scriptResult === "string" &&
				/script (?:compiler )?error|terminated unsuccessfully/i.test(scriptResult)
			) {
				throw new Error("JSmol reported a partial-charge script error");
			}

			const atomInfo = window.Jmol.getPropertyAsArray(viewerObj, "atomInfo");
			if (!Array.isArray(atomInfo) || atomInfo.length === 0) {
				setAtoms([]);
				onError?.("JSmol could not calculate partial charges for this model.");
				return;
			}
			setAtoms(atomInfo.map(toAtom));
		} catch (error) {
			console.error("Failed to calculate JSmol partial charges", error);
			setAtoms([]);
			onError?.("JSmol could not calculate partial charges for this model.");
		}
	}, [viewerObj, frameNo, onError]);

	// Label the selected atom with its partial charge in the JSmol viewer.
	useEffect(() => {
		if (!selectAtom) return;

		const script: string = `
			frame ${frameNo};
			label OFF;
			isosurface delete;
			mo delete all;
			select atomno=${selectAtom.atomNo};
			label %a %P;
		`;
		window.Jmol.script(viewerObj, script);
	}, [selectAtom]);

	return (
		<>
			<MenuList>
				<MenuItem
					onClick={() => {
						setSelectAtom(null);

						const script = `
						frame ${frameNo};
						label OFF;
						isosurface delete;
						mo delete all;
						select *;
						label %P;
						set labelfront;
						color label black;
						background LABELS white;
					`;
						window.Jmol.script(viewerObj, script);
					}}
					sx={{
						mb: 1,
						mx: 1,
						p: 2,
						borderRadius: 2,
						bgcolor: grey[200],
						"&:hover": {
							backgroundColor: blueGrey[50],
						},
					}}
				>
					<ListItemText primary={"Display All Partial Charges"} />
				</MenuItem>
			</MenuList>
			<TableContainer sx={{ flex: 1 }}>
				<Table>
					<TableHead>
						<TableRow sx={{ bgcolor: grey[200] }}>
							<TableCell>Atom</TableCell>
							<TableCell>Symbol</TableCell>
							<TableCell>Charge</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{atoms &&
							atoms.map((a: Atom, idx: number) => (
								<TableRow
									key={idx}
									onClick={() => setSelectAtom(a)}
									sx={{
										cursor: "pointer",
										bgcolor: selectAtom && a === selectAtom ? blueGrey[100] : grey[50],
										"&:hover": {
											backgroundColor: blueGrey[50],
										},
									}}
								>
									<TableCell>{a.atomNo}</TableCell>
									<TableCell>{a.sym}</TableCell>
									<TableCell>{a.partialCharge}</TableCell>
								</TableRow>
							))}
					</TableBody>
				</Table>
			</TableContainer>
		</>
	);
};

export default PartialCharge;

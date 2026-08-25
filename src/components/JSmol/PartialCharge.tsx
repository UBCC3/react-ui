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
 * How long to wait after issuing "calculate PARTIALCHARGE" before reading the
 * result. Jmol.script() does not report completion, so this is a fixed guess
 * rather than a real handshake; raise it if large structures come back empty.
 */
const PARTIAL_CHARGE_READ_DELAY_MS = 500;

/**
 * Props for the PartialCharge component.
 */
interface PartialChargeProps {
	viewerObj: any;
	frameNo: number;
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
const PartialCharge: React.FC<PartialChargeProps> = ({ viewerObj, frameNo }) => {
	// Atom information extracted from JSmol after partial charge calculation.
	const [atoms, setAtoms] = useState<Atom[]>([]);

	// Currently selected atom to highlight/label in the viewer.
	const [selectAtom, setSelectAtom] = useState<Atom | null>(null);

	// Ask JSmol to calculate partial charges, then read them back once it has
	// had time to finish. Jmol.script() is fire-and-forget with no completion
	// callback, so the delay below is the only available handshake.
	useEffect(() => {
		if (!viewerObj) return;

		window.Jmol.script(
			viewerObj,
			`frame ${frameNo}
			calculate PARTIALCHARGE;`,
		);

		const timeoutId = setTimeout(() => {
			const atomInfo = window.Jmol.getPropertyAsArray(viewerObj, "atomInfo");
			// `?? []` does not cover it: Jmol returns a non-array object, not
			// null, when nothing is loaded.
			setAtoms(Array.isArray(atomInfo) ? atomInfo.map(toAtom) : []);
		}, PARTIAL_CHARGE_READ_DELAY_MS);

		return () => clearTimeout(timeoutId);
	}, [viewerObj, frameNo]);

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

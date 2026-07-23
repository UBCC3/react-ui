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
import React, { useEffect, useMemo, useState } from "react";

/**
 * Props for the PartialCharge component.
 */
interface PartialChargeProps {
	viewerObj: any;
	frameNo: number;
}

/**
 * DIsplays partial charges for atoms in the selected JSmol frame.
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

	// Calculate and fetch partial charges from JSmol when the viewer is ready.
	useMemo(() => {
		if (!viewerObj) return;

		const fetchPartialCharges = async () => {
			window.Jmol.script(
				viewerObj,
				`frame ${frameNo}
				calculate PARTIALCHARGE;`,
			);
			setTimeout(() => {
				const atomsArray = window.Jmol.getPropertyAsArray(viewerObj, "atomInfo");
				console.log("atomsArray", atomsArray);
				const atoms: Atom[] = atomsArray.map((a: any): Atom => ({
					atomIndex: a.atomIndex,
					atomNo: a.atomno,
					bondCount: a.bondCount,
					element: a.element,
					model: a.model,
					partialCharge: a.partialCharge,
					sym: a.sym,
					x: a.x,
					y: a.y,
					z: a.z,
				}));
				setAtoms(atoms);
			}, 500);
		};

		fetchPartialCharges();
	}, [viewerObj]);

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

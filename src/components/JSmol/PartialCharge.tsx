import {
	ListItemText,
	MenuItem,
	MenuList,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow
} from "@mui/material";
import {blueGrey, grey} from "@mui/material/colors";
import {Atom} from "../../types/JSmol";
import React, {useEffect, useMemo, useState} from "react";

interface PartialChargeProps {
	viewerObj: any;
	frameNo: number;
}

const PartialCharge: React.FC<PartialChargeProps> = ({
	viewerObj,
	frameNo,
}) => {
	const [atoms, setAtoms] = useState<Atom[]>([]);
	const [selectAtom, setSelectAtom] = useState<Atom | null>(null);

	useMemo(() => {
		if (!viewerObj) return;

		const fetchPartialCharges = async () => {
			window.Jmol.script(
				viewerObj,
				`frame ${frameNo}
				calculate PARTIALCHARGE;`
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
				}))
				setAtoms(atoms);
			}, 500);
		}

		fetchPartialCharges();
	}, [viewerObj]);

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

	return (<>
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
					'&:hover': {
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
					{atoms && atoms.map((a:Atom, idx: number) => (
						<TableRow
							key={idx}
							onClick={() => setSelectAtom(a)}
							sx={{
								cursor: 'pointer',
								bgcolor: (selectAtom && a === selectAtom) ? blueGrey[100]:grey[50],
								'&:hover': {
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
	</>)
};

export default PartialCharge;
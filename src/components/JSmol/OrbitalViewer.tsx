import React, { useEffect, useRef, useState } from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Grid,
	MenuItem,
	MenuList,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Typography,
	ListItemText,
	Tab
} from "@mui/material";
import { Orbital } from "../../types";
import { blueGrey, grey } from "@mui/material/colors";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OrbitalProperty from "./OrbitalProperty";

declare global {
	interface Window {
		Jmol: any;
	}
}

interface OrbitalViewerProp {
	moldenFile: string;
	viewerObjId: string;
}

// Define each property option
enum PropertyMenu {
  ELECTRON_DENSITY = 'electronDensity',
  ELECTROSTATIC_POTENTIAL = 'electrostaticPotential',
  ELECTROPHILIC_HOMO = 'electrophilicHOMO',
  ELECTROPHILIC_LUMO = 'electrophilicLUMO',
  RADIAL_FRONTIER_DENSITY = 'radialFrontierDensity',
}

const OrbitalViewer: React.FC<OrbitalViewerProp> = ({
	moldenFile,
	viewerObjId,
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);

	const [viewerObj, setViewerObj] = useState<any>(null);

	// orbital table state
	const [orbitals, setOrbitals] = useState<Orbital[]>([]);
	const rowsPerPage = 5;
	const [page, setPage] = useState(0);
	const [selectedOrbital, setSelectedOrbital] = useState<Orbital | null>(null);

	// selected property from menu
	const [selectedProperty, setSelectedProperty] = useState<PropertyMenu>(
		PropertyMenu.ELECTRON_DENSITY
	);

	useEffect(() => {
		if (!viewerObj || orbitals.length === 0 || selectedOrbital === null) return;

		// show selected orbital
		const script = `mo ${selectedOrbital.index}`;
		window.Jmol.script(viewerObj, script);
	}, [orbitals, selectedOrbital, viewerObj]);

	useEffect(() => {
		if (!viewerObj) return;

		// fetch MO properties
		const mos = window.Jmol.getPropertyAsArray(
			viewerObj,
			"auxiliaryInfo.models[0].moData.mos"
		);
		const orbitalsArray: Orbital[] = mos.map((mo: any): Orbital => ({
			index: mo.index,
			energy: mo.energy,
			occupancy: mo.occupancy,
			spin: mo.spin,
			symmetry: mo.symmetry,
			type: mo.type,
		}));
		setOrbitals(orbitalsArray);
	}, [viewerObj]);

	useEffect(() => {
		const jsmolIsReady = (obj: any) => {
			window.Jmol.script(obj, `reset; zoom 50;`);
			setViewerObj(obj);
		};

		const Info = {
			color: "#FFFFFF",
			width: "100%",
			height: "100%",
			use: "HTML5",
			j2sPath: "/jsmol/j2s",
			src: moldenFile,
			script: `load \"${moldenFile}\";`,
			disableInitialConsole: true,
			addSelectionOptions: false,
			debug: false,
			readyFunction: jsmolIsReady,
		};

		window.Jmol.getApplet(viewerObjId, Info);
		if (viewerRef.current) {
			viewerRef.current.innerHTML = window.Jmol.getAppletHtml(viewerObjId, Info);
		}
	}, []);

	const handleChangePage = (_: any, newPage: number) => {
		setPage(newPage);
	};

	return (
		<Grid container spacing={2}>
			<Grid size={{ xs: 12, md: 4 }}>
				<Paper elevation={3} sx={{ height: '100%' }}>
					<Typography variant="h6" sx={{ pl: 2, py: 1, color: 'text.secondary', bgcolor: blueGrey[200] }}>
						Orbitals
					</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow sx={{ bgcolor: blueGrey[50] }}>
									<TableCell>Sym</TableCell>
									<TableCell>Eigenvalue (a.u.)</TableCell>
									<TableCell>Occ</TableCell>
									<TableCell>Spin</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{orbitals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(orbital => (
									<TableRow
										key={orbital.index}
										onClick={() => setSelectedOrbital(orbital)}
										sx={{
											backgroundColor: selectedOrbital?.index === orbital.index ? 'rgba(0,0,0,0.1)' : 'transparent',
											cursor: 'pointer'
										}}
									>
										<TableCell>{orbital.symmetry}</TableCell>
										<TableCell>{orbital.energy.toFixed(6)}</TableCell>
										<TableCell>{orbital.occupancy}</TableCell>
										<TableCell>{orbital.spin}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
					<TablePagination
						component="div"
						count={orbitals.length}
						page={page}
						onPageChange={handleChangePage}
						rowsPerPage={rowsPerPage}
						rowsPerPageOptions={[]}
						showFirstButton
						showLastButton
					/>
				</Paper>
			</Grid>
			<Grid size={{ xs: 12, md: 8}}>
				<Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
					<Typography variant="h6" sx={{ pl: 2, py: 1, color: 'text.secondary', bgcolor: blueGrey[200] }}>
						Properties
					</Typography>
					<Grid container spacing={2} sx={{ flex: 1 }}>
						<OrbitalProperty viewerObj={viewerObj}/>
					</Grid>
				</Paper>
			</Grid>
			<Grid container size={{ xs: 12 }} spacing={2} alignItems="stretch">
				<Grid size={{ xs: 12, md: 4 }}>
					<Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
						<Typography variant="h6" sx={{ pl: 2, py: 1, color: 'text.secondary', bgcolor: blueGrey[200] }}>
							Calculated Quantities
						</Typography>
						<Grid container spacing={2} sx={{ flex: 1 }}>
							<TableContainer sx={{ flex: 1 }}>
								<Table size="small">
									<TableHead>
										<TableRow sx={{ bgcolor: blueGrey[50] }}>
											<TableCell>Quantity</TableCell>
											<TableCell>Value</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										<TableRow>
											<TableCell>Symmetry</TableCell>
											<TableCell>cs</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>Basis</TableCell>
											<TableCell>
												6-31G(D)
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>SCF Energy</TableCell>
											<TableCell>
												-76.010720255688 Hartree
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>Dipole Moment</TableCell>
											<TableCell>
												2.19764298641837 Debye
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>CPU time</TableCell>
											<TableCell>
												3 sec
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</TableContainer>
						</Grid>
					</Paper>
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
						<Typography variant="h6" sx={{ pl: 2, py: 1, color: 'text.secondary', bgcolor: blueGrey[200] }}>
							Partial Charges
						</Typography>
						<Grid container spacing={2} sx={{ flex: 1 }}>
							<TableContainer sx={{ flex: 1 }}>
								<Table size="small">
									<TableHead>
										<TableRow sx={{ bgcolor: blueGrey[50] }}>
											<TableCell>Atom</TableCell>
											<TableCell>Charge</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										<TableRow>
											<TableCell>O</TableCell>
											<TableCell>-0.86889</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>H</TableCell>
											<TableCell>0.43445</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>H</TableCell>
											<TableCell>0.43445</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</TableContainer>
						</Grid>
					</Paper>
				</Grid>
				<Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto', position: 'relative' }}>
					<Box ref={viewerRef} sx={{ width: '100%', height: '100%', boxSizing: 'border-box' }} />
				</Grid>
			</Grid>
		</Grid>
	);
};

export default OrbitalViewer;

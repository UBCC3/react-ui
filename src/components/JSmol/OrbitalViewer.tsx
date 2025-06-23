import React, { useEffect, useRef, useState } from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Grid,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Typography
} from "@mui/material";
import {Orbital} from "../../types";
import {blueGrey} from "@mui/material/colors";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OrbitalProperty from "./OrbitalProperty";

declare global {
	interface Window {
		Jmol: any;
	}
}

interface OrbitalViewerProp {
	moldenFile: string,
	viewerObjId: string,
}

enum expandableMenu {
	'orbital',
	'density',
}

const OrbitalViewer: React.FC<OrbitalViewerProp> = ({
	moldenFile,
	viewerObjId,
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);

	const [viewerObj, setViewerObj] = useState<any>(null);
	const [expanded, setExpanded] = useState<false | expandableMenu>(expandableMenu.density);

	// orbital table
	const [orbitals, setOrbitals] = useState<Orbital[]>([]);
	const rowsPerPage: number = 25;
	const [page, setPage] = useState(0);
	const [selectedOrbital, setSelectedOrbital] = useState<Orbital | null>(null);

	useEffect(() => {
		if (orbitals.length === 0) return;

		if (selectedOrbital === null) return;

		const showOrbital = () => {
			const script= `
				mo ${selectedOrbital.index};
			`;
			window.Jmol.script(viewerObj, script);
			return;
		}

		showOrbital();
	}, [orbitals, selectedOrbital]);

	useEffect(() => {
		if (!viewerObj) return;

		function fetchOrbitals() {
			const mos = window.Jmol.getPropertyAsArray(
				viewerObj,
				"auxiliaryInfo.models[0].moData.mos",
			);

			const orbitalsArray: Orbital[] = mos.map((mo: any, idx: number):Orbital => ({
				index: mo.index,
				energy: mo.energy,
				occupancy: mo.occupancy,
				spin: mo.spin,
				symmetry: mo.symmetry,
				type: mo.type,
			}));

			setOrbitals(orbitalsArray);
		}

		fetchOrbitals();
	}, [viewerObj]);

	useEffect(() => {
		const jsmolIsReady = (viewerObj: any) => {
			window.Jmol.script(viewerObj, `
			    reset;
			    zoom 50;
			`);

			setViewerObj(viewerObj);
		}

		const Info = {
			color: "#FFFFFF",
			width: "100%",
			height: "100%",
			use: "HTML5",
			j2sPath: "/jsmol/j2s",
			src: moldenFile,
			script: `
				load "${moldenFile}";
			`,
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

	const handleExpandMenuChange = (panel: expandableMenu) => (e: React.SyntheticEvent, newExpanded: boolean) => {
			setExpanded(newExpanded ? panel : false);
	};

	return (
		<Grid container spacing={2}>
			<Grid size={12} sx={{ height: '800px'}}>
				<Paper elevation={3} sx={{padding: 0, height: '100%', }}>
					<Grid container spacing={2} alignItems="stretch" sx={{ height: '100%'}} >
						<Grid
							sx={{
								xs: 12,
								md: 3,
								display: 'flex',
								flexDirection: 'column',
								width: '23%',
								maxHeight: '100%',
								border: '2px solid gray' // TODO: temperate distinguish boundary
							}}
						>
							<Accordion
								expanded={expanded === expandableMenu.orbital}
								onChange={handleExpandMenuChange(expandableMenu.orbital)}
								sx={{
									justifyContent: 'space-between',
									flex: expanded === expandableMenu.orbital ? '1 1 0%' : '0 0 auto',
									minHeight: 0,
									display: 'flex',
									flexDirection: 'column'
								}}
								disableGutters
							>
								<AccordionSummary
									expandIcon={ <ExpandMoreIcon /> }
									aria-controls="orbitals-content"
									id="orbitals-header"
									sx={{
										bgcolor: blueGrey[200],
									}}
								>
									<Typography component={'span'} variant="h6" color="text.secondary">
										Orbitals
									</Typography>
								</AccordionSummary>
								<AccordionDetails
									sx={{
										p: 0,
										flex: 1,
										minHeight: 0,
										display: 'flex',
										flexDirection: 'column',
									}}
								>
									<TableContainer
										sx={{
											height: '630px',
										}}
									>
										<Table stickyHeader size="small" >
											<TableHead>
												<TableRow sx={{ bgcolor: blueGrey[50] }}>
													<TableCell>#</TableCell>
													<TableCell>Sym</TableCell>
													<TableCell>Eigenvalue (a.u.)</TableCell>
													<TableCell>Occ</TableCell>
													<TableCell>Spin</TableCell>
												</TableRow>
											</TableHead>
											<TableBody >
												{orbitals
													.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
													.map(orbital => (
														<TableRow
															key={orbital.index}
															onClick={() => {
																setSelectedOrbital(orbital);
															}}
															sx={{
																backgroundColor: (
																	selectedOrbital !== null &&
																	orbital.index === selectedOrbital.index
																) ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
																cursor: 'pointer'
															}}
														>
															<TableCell>{orbital.index}</TableCell>
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
										sx={{
											bgcolor: blueGrey[200],
											position: "sticky",
											bottom: 0,
										}}
										showFirstButton
										showLastButton
									/>
								</AccordionDetails>
							</Accordion>
							<Accordion
								expanded={expanded === expandableMenu.density}
								onChange={handleExpandMenuChange(expandableMenu.density)}
								disableGutters
								sx={{
									flex: expanded === expandableMenu.density ? '1 1 0%' : '0 0 auto',
									minHeight: 0,
									display: 'flex',
									flexDirection: 'column'
								}}
							>
								<AccordionSummary
									expandIcon={ <ExpandMoreIcon /> }
									aria-controls="orbitals-content"
									id="orbitals-header"
									sx={{
										bgcolor: blueGrey[200],
									}}
								>
									<Typography component={'span'} variant="h6" color="text.secondary">
										Properties
									</Typography>
								</AccordionSummary>
								<AccordionDetails
									sx={{
										p: 0,
										flex: 1,
										minHeight: 0,
										display: 'flex',
										flexDirection: 'column',
									}}
								>
									<OrbitalProperty viewerObj={viewerObj} />
								</AccordionDetails>
							</Accordion>
						</Grid>
						<Grid
							sx={{
								xs: 12,
								md: 8,
								display: 'flex',
								flexDirection: 'column',
								flex: '1 0 auto',
								position: 'relative'
							}}
						>
							<Box
								ref={viewerRef}
								sx={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
							/>
						</Grid>
					</Grid>
				</Paper>
			</Grid>
		</Grid>
	);
};

export default OrbitalViewer;
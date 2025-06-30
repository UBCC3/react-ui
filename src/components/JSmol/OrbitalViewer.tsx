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
	Tab,
	Drawer,
	Toolbar,
	IconButton,
	Divider,
	Button
} from "@mui/material";
import { Orbital } from "../../types";
import { grey, blueGrey, blue } from "@mui/material/colors";
import OrbitalProperty from "./OrbitalProperty";
import { ExpandMore, DataObjectOutlined, AdjustOutlined, ContrastOutlined, ChevronRight, CalculateOutlined, Fullscreen, FullscreenExit } from "@mui/icons-material";

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

const fullWidth = 400;
const miniWidth = 80;

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
	const [open, setOpen] = useState(true);
	const [selected, setSelected] = useState<Orbital | null>(null);

	// selected property from menu
	const [selectedProperty, setSelectedProperty] = useState<PropertyMenu>(
		PropertyMenu.ELECTRON_DENSITY
	);

	// Replace single open state with an object for each accordion
	const [accordionOpen, setAccordionOpen] = useState({
		orbitals: true,
		properties: false,
		quantities: false,
		charges: false,
	});

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

	const toggle = () => {
		if (open) {
			setOpen(false);
			setAccordionOpen({
				orbitals: false,
				properties: false,
				quantities: false,
				charges: false,
			});
		}
		else {
			setOpen(true);
		}
	}

	// Accordion handlers
	const handleAccordionChange = (panel: keyof typeof accordionOpen) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
		setAccordionOpen(prev => ({ ...prev, [panel]: isExpanded }));
		if (isExpanded && !open) setOpen(true); // Open drawer if opening an accordion
	};

	return (
		<Grid container spacing={2} sx={{ width: '100%' }}>
			<Grid size={12} sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
				<Typography variant="h5">
					View Results
				</Typography>
				<Divider sx={{ mt: 3, width: '100%' }} />
			</Grid>
			<Grid sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto', position: 'relative' }}>
				<Paper 
					ref={viewerRef} 
					sx={{ 
						width: '100%', 
						height: '70vh', 
						boxSizing: 'border-box', 
						borderRadius: 2 
					}} 
					elevation={3} 
				/>
			</Grid>
			<Drawer 
				variant="persistent" 
				anchor="right" 
				sx={{ 
					width: open? 
					fullWidth:miniWidth, 
					flexShrink: 0,
					'& .MuiDrawer-paper': {
						width: open ? fullWidth : miniWidth,
						boxSizing: 'border-box',
						overflowX: 'hidden',
						backgroundColor: grey['A100'],
					},
				}}
				open
			>
				<Toolbar sx={{ justifyContent:'flex-start', display: 'flex', alignItems: 'center' }}>
					<IconButton onClick={toggle} size="small" sx={{ color: grey[500], mr: 2 }}>
						{open ? <FullscreenExit /> : <Fullscreen/>}
					</IconButton>
				</Toolbar>
				<Accordion
					expanded={accordionOpen.orbitals}
					onChange={handleAccordionChange('orbitals')}
					sx={{ 
						backgroundColor: accordionOpen.orbitals ? grey[300] : grey[100],
						borderRadius: 0, 
						boxShadow: 'none', 
						mb: 0, 
						transition: 'background-color 0.3s ease' 
					}}
				>
					<AccordionSummary 
						expandIcon={accordionOpen.orbitals && <ExpandMore />} 
						aria-controls="panel1-content"
						id="panel1-header"
						sx={{ color: grey[900], px: accordionOpen.orbitals ? 2 : 1 }}
					>
						<Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
							<AdjustOutlined sx={open ? { mr: 1 } : { ml: 2 }} />
							{open && (<span>Orbitals</span>)}
						</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
						<TableContainer sx={{ flex: 1 }}>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: grey[200] }}>
										<TableCell>Sym</TableCell>
										<TableCell>Energy</TableCell>
										<TableCell>Occ</TableCell>
										<TableCell>Spin</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{orbitals.slice(page*5,page*5+5).map(orbital => (
										<TableRow
											key={orbital.index}
											onClick={() => setSelectedOrbital(orbital)}
											sx={{
												cursor: 'pointer',
												bgcolor: grey[50],
												'&:hover': {
													backgroundColor: blueGrey[50],
												},
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
					</AccordionDetails>
				</Accordion>
				<Accordion
					expanded={accordionOpen.properties}
					onChange={handleAccordionChange('properties')}
					sx={{ 
						backgroundColor: accordionOpen.properties ? grey[300] : grey[100],
						borderRadius: 0, 
						boxShadow: 'none', 
						mb: 0, 
						transition: 'background-color 0.3s ease' 
					}}
				>
					<AccordionSummary 
						expandIcon={accordionOpen.properties && <ExpandMore />}
						aria-controls="panel2-content"
						id="panel2-header"
						sx={{ color: grey[900], px: accordionOpen.properties ? 2 : 1 }}
					>
						<Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
							<DataObjectOutlined sx={open ? { mr: 1 } : { ml: 2 }}  />
							{open && <span>Orbital Properties</span>}
						</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0, borderBottom: '1px solid', borderColor: grey[300] }}>
						<OrbitalProperty viewerObj={viewerObj} />
					</AccordionDetails>
				</Accordion>
				<Accordion
					expanded={accordionOpen.quantities}
					onChange={handleAccordionChange('quantities')}
					sx={{ 
						backgroundColor: accordionOpen.quantities ? grey[300] : grey[100],
						borderRadius: 0, 
						boxShadow: 'none', 
						mb: 0, 
						transition: 'background-color 0.3s ease' 
					}}
				>
					<AccordionSummary
						expandIcon={accordionOpen.quantities && <ExpandMore />}
						aria-controls="panel3-content"
						id="panel3-header"
						sx={{ 
							color: grey[900],
							px: accordionOpen.quantities ? 2 : 1 
						}}
					>
						<Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
							<CalculateOutlined sx={open ? { mr: 1 } : { ml: 2 }}  />
							{open && <span>Calculated Quantities</span>}
						</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
						<TableContainer sx={{ flex: 1 }}>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: grey[200] }}>
										<TableCell>Quantity</TableCell>
										<TableCell>Value</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{[
										{ label: 'Symmetry', value: 'cs' },
										{ label: 'Basis', value: '6-31G(D)' },
										{ label: 'SCF Energy', value: '-76.010720255688 Hartree' },
										{ label: 'Dipole Moment', value: '2.19764298641837 Debye' },
										{ label: 'CPU time', value: '3 sec' },
									].map((item, index) => (
										<TableRow 
											key={index}
											sx={{
												cursor: 'pointer',
												bgcolor: grey[50],
												'&:hover': {
													backgroundColor: blueGrey[50],
												},
											}}
										>
											<TableCell>{item.label}</TableCell>
											<TableCell>{item.value}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</AccordionDetails>
				</Accordion>
				<Accordion
					expanded={accordionOpen.charges}
					onChange={handleAccordionChange('charges')}
					sx={{ 
						backgroundColor: accordionOpen.charges ? grey[300] : grey[100],
						borderRadius: 0, 
						boxShadow: 'none', 
						mb: 0, 
						transition: 'background-color 0.3s ease' 
					}}
				>
					<AccordionSummary 
						expandIcon={accordionOpen.charges && <ExpandMore />} 
						aria-controls="panel4-content"
						id="panel4-header"
						sx={{ color: grey[900], px: accordionOpen.charges ? 2 : 1 }}
					>
						<Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
							<ContrastOutlined sx={open ? { mr: 1 } : { ml: 2 }} />
							{open && <span>Partial Charges</span>}
						</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
						<TableContainer sx={{ flex: 1 }}>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: grey[200] }}>
										<TableCell>Atom</TableCell>
										<TableCell>Charge</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{[
										{ atom: 'O', charge: -0.86889 },
										{ atom: 'H', charge: 0.43445 },
										{ atom: 'H', charge: 0.43445 },
									].map((item, index) => (
										<TableRow 
											key={index}
											sx={{
												cursor: 'pointer',
												bgcolor: grey[50],
												'&:hover': {
													backgroundColor: blueGrey[50],
												},
											}}
										>
											<TableCell>{item.atom}</TableCell>
											<TableCell>{item.charge}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</AccordionDetails>
				</Accordion>
			</Drawer>
		</Grid>
	);
};

export default OrbitalViewer;

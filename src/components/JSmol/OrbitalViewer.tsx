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
	Button,
	Tabs,
	GlobalStyles
} from "@mui/material";
import {Job, JobResult, Orbital} from "../../types";
import { grey, blueGrey, blue } from "@mui/material/colors";
import OrbitalProperty from "./OrbitalProperty";
import { ExpandMore, DataObjectOutlined, AdjustOutlined, ContrastOutlined, ChevronRight, CalculateOutlined, Fullscreen, FullscreenExit, Add } from "@mui/icons-material";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { LineChart } from '@mui/x-charts/LineChart';
import {Atom} from "../../types/JSmol";

declare global {
	interface Window {
		Jmol: any;
	}
}

interface OrbitalViewerProp {
	job: Job;
	jobResultFiles: JobResult;
	viewerObjId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}


const fullWidth = 400;
const miniWidth = 80;

const OrbitalViewer: React.FC<OrbitalViewerProp> = ({
	job,
	jobResultFiles,
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

	// partial charge table
	const [atoms, setAtoms] = useState<Atom[]>([]);
	const [selectAtom, setSelectAtom] = useState<Atom | null>(null);

	// Replace single open state with an object for each accordion
	const [accordionOpen, setAccordionOpen] = useState({
		orbitals: true,
		properties: false,
		quantities: false,
		charges: false,
	});

	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [molName, setMolName] = useState('');
	const [molNotes, setMolNotes] = useState('');
	const [value, setValue] = React.useState(0);

	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};

	useEffect(() => {
		if (!selectAtom) return;

		const script: string = `
			frame 2;
			label OFF;
			isosurface delete;
			mo delete all;
			select atomno=${selectAtom.atomNo};
			label %a %P;
		`;
		window.Jmol.script(viewerObj, script);
	}, [selectAtom]);

	useEffect(() => {
		if (!viewerObj || orbitals.length === 0 || selectedOrbital === null) return;

		// show selected orbital
		const script = `
			frame 1;
			mo ${selectedOrbital.index};
		`;
		window.Jmol.script(viewerObj, script);
	}, [orbitals, selectedOrbital, viewerObj]);

	useEffect(() => {
		if (!viewerObj) return;

		// fetch molecular orbitals info for table
		const mos = window.Jmol.getPropertyAsArray(
			viewerObj,
			"auxiliaryInfo.models[1].moData.mos" // models[1] map to loaded file 1
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

		// fetch partial charges
		window.Jmol.script(
			viewerObj,
			`calculate PARTIALCHARGE;`
		);
		setTimeout(() => {
			const atomsArray = window.Jmol.getPropertyAsArray(
				viewerObj,
				"atomInfo"
			)
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
		}, 500)
	}, [viewerObj]);

	useEffect(() => {
		const moldenFile = jobResultFiles.urls["molden"];
		const espFile = jobResultFiles.urls["esp"];
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
			serverURL: "https://chemapps.stolaf.edu/jmol/jsmol/php/jsmol.php", // TODO backend to proxy
			script: `
				load FILES \"${moldenFile}\" \"${espFile}\";
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
		<>
			<GlobalStyles styles={{
				'.MuiDialog-root, .MuiDialog-container, .MuiDialog-paper, .MuiBackdrop-root': {
					zIndex: 9999,
				},
			}} />
			<Grid container spacing={2} sx={{ width: '100%' }}>
				<Grid size={12} sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
					<Typography variant="h5">
						Molecular Orbital Result
					</Typography>
					<Divider sx={{ mt: 3, width: '100%' }} />
				</Grid>
				<Grid sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto', position: 'relative' }}>
					<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
						<Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
							<Tab label="Structure Viewer" {...a11yProps(0)} />
							<Tab label="Graph Viewer" {...a11yProps(1)} />
						</Tabs>
					</Box>
					{value === 0 && (
						<Paper
							ref={viewerRef}
							sx={{
								width: '100%',
								height: '70vh',
								boxSizing: 'border-box',
								borderRadius: 2
								// zIndex removed
							}}
							elevation={3}
						/>
					)}
					{value === 1 && (
						<Paper
							sx={{
								width: '100%',
								height: '70vh',
								boxSizing: 'border-box',
								borderRadius: 2,
								p: 4,
							}}
							elevation={3}
						>
							<LineChart
								xAxis={[{ data: [1, 2, 3, 5, 8, 10] }]}
								series={[
									{
										data: [2, 5.5, 2, 8.5, 1.5, 5],
									},
								]}
								height={300}
							/>
						</Paper>
					)}
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
													bgcolor: (selectedOrbital && orbital === selectedOrbital) ? blueGrey[100]:grey[50],
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
							<OrbitalProperty
								viewerObj={viewerObj}
							/>
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
						<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0, bgcolor: grey[50]}}>
							<MenuList>
								<MenuItem
									onClick={() => {
										setSelectAtom(null);

										const script = `
											frame 2;
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
						</AccordionDetails>
					</Accordion>
					<Button
						variant="contained"
						color="primary"
						sx={{
							m: 2,
							width: 'calc(100% - 32px)',
							alignSelf: 'center',
							display: open ? 'flex' : 'none',
							textTransform: 'none',
						}}
						startIcon={<Add />}
						onClick={() => setAddDialogOpen(true)}
					>
						Add Structure to My Library
					</Button>
				</Drawer>
			</Grid>
			<Dialog
				open={addDialogOpen}
				onClose={() => setAddDialogOpen(false)}
				container={typeof window !== 'undefined' ? document.body : undefined}
				sx={{ zIndex: 9999 }}
				disableEnforceFocus
			>
				<DialogTitle>Add Structure to My Library</DialogTitle>
				<DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3, minWidth: 500 }}>
					<TextField
						label="Molecule Name"
						value={molName}
						onChange={e => setMolName(e.target.value)}
						fullWidth
						autoFocus
					/>
					<TextField
						label="Notes"
						value={molNotes}
						onChange={e => setMolNotes(e.target.value)}
						fullWidth
						multiline
						minRows={2}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddDialogOpen(false)} variant="outlined" color="primary">Cancel</Button>
					<Button onClick={() => {/* submit logic here */}} variant="contained" color="primary">Submit</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default OrbitalViewer;

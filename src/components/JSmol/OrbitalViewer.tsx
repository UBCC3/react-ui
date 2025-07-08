import React, { useEffect, useRef, useState } from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Autocomplete,
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
	Typography,
	Tab,
	Drawer,
	Toolbar,
	IconButton,
	Divider,
	Button,
	Tabs,
	GlobalStyles
} from "@mui/material";
import { Orbital } from "../../types";
import { grey, blueGrey, blue } from "@mui/material/colors";
import OrbitalProperty from "./OrbitalProperty";
import { ExpandMore, DataObjectOutlined, AdjustOutlined, ContrastOutlined, ChevronRight, CalculateOutlined, Fullscreen, FullscreenExit, Add } from "@mui/icons-material";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { LineChart } from '@mui/x-charts/LineChart';
import { useAuth0 } from "@auth0/auth0-react";
import { AddAndUploadStructureToS3, getStructuresTags } from "../../services/api";
import MolmakerTextField from "../custom/MolmakerTextField";

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
	moldenFile,
	viewerObjId,
}) => {
	const { getAccessTokenSilently } = useAuth0();
	const viewerRef = useRef<HTMLDivElement>(null);

	const [viewerObj, setViewerObj] = useState<any>(null);

	// orbital table state
	const [orbitals, setOrbitals] = useState<Orbital[]>([]);
	const rowsPerPage = 5;
	const [page, setPage] = useState(0);
	const [selectedOrbital, setSelectedOrbital] = useState<Orbital | null>(null);
	const [open, setOpen] = useState(true);

	// dialog state
	const [options, setOptions] = useState<string[]>([]);
	const [moleculeName, setMoleculeName] = useState('');
	const [chemicalFormula, setChemicalFormula] = useState('');
	const [moleculeNotes, setMoleculeNotes] = useState('');
	const [structureTags, setStructureTags] = useState<string[]>([]);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	
	const handleSubmit = async () => {
		setSubmitAttempted(true);
		const canvas = viewerRef.current?.querySelector('canvas');
		const imageDataUrl = canvas?.toDataURL('image/png') || '';

		const xyzString = window.Jmol.evaluate(viewerObj, 'write("xyz")');
		console.log("Generated XYZ:\n", xyzString);
		const xyzBlob = new Blob([xyzString], { type: 'chemical/x-xyz' });
		const xyzFile = new File([xyzBlob], `${moleculeName || 'structure'}.xyz`, {
			type: 'chemical/x-xyz',
		});

		const token = await getAccessTokenSilently();

		await AddAndUploadStructureToS3(
			xyzFile,
			moleculeName,
			chemicalFormula,
			moleculeNotes,
			imageDataUrl,
			token,
			structureTags
		);

		setAddDialogOpen(false);
		setMoleculeName('');
		setChemicalFormula('');
		setMoleculeNotes('');
		setStructureTags([]);
		setSubmitAttempted(false);
	}

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

	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [value, setValue] = React.useState(0);

	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};

	const onMoleculeNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setMoleculeName(event.target.value);
	};

	const onChemicalFormulaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setChemicalFormula(event.target.value);
	};

	const onMoleculeNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setMoleculeNotes(event.target.value);
	};

	const onStructureTagsChange = (event: React.ChangeEvent<{}>, value: string[]) => {
		setStructureTags(value);
	};

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

		const fetchTags = async () => {
			try {
				const token = await getAccessTokenSilently()
				const response = await getStructuresTags(token)
				console.log("Fetched tags:", response.data);
				if (response.data) {
					setOptions(response.data)
				}
			}
			catch (err) {
				console.error("Failed to fetch tags", err)
			}
		}
		fetchTags()
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
					<Paper
						ref={viewerRef}
						sx={{
							width: '100%',
							height: '70vh',
							boxSizing: 'border-box',
							borderRadius: 2,
							display: value === 0 ? 'block' : 'none',
						}}
						elevation={3}
					/>
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
					<MolmakerTextField
						fullWidth
						label="Structure Name"
						value={moleculeName}
						onChange={onMoleculeNameChange}
						required
						error={submitAttempted && !moleculeName}
						helperText={submitAttempted && !moleculeName ? 'Please enter a name' : ''}
						sx={{ mt: 1 }}
					/>
					<MolmakerTextField
						fullWidth
						label="Chemical Formula"
						value={chemicalFormula}
						onChange={onChemicalFormulaChange}
						required
						error={submitAttempted && !chemicalFormula}
						helperText={submitAttempted && !chemicalFormula ? 'Please enter a chemical formula' : ''}
						sx={{ mt: 2 }}
					/>
					<MolmakerTextField
						fullWidth
						label="Structure Notes"
						value={moleculeNotes}
						onChange={onMoleculeNotesChange}
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
				<DialogActions>
					<Button onClick={() => setAddDialogOpen(false)} variant="outlined" color="primary">Cancel</Button>
					<Button
						onClick={handleSubmit}
						variant="contained"
						color="primary"
					>
						Submit
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default OrbitalViewer;

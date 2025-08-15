import React, { useEffect, useRef, useState } from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
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
	Drawer,
	Toolbar,
	IconButton,
	Divider,
	Button,
	GlobalStyles, Autocomplete,
} from "@mui/material";
import {Job, JobResult, Orbital} from "../../types";
import { grey, blueGrey } from "@mui/material/colors";
import OrbitalProperty from "./OrbitalProperty";
import {
	ExpandMore,
	DataObjectOutlined,
	AdjustOutlined,
	ContrastOutlined,
	CalculateOutlined,
	Fullscreen,
	FullscreenExit,
	AddPhotoAlternateOutlined
} from "@mui/icons-material";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import {Atom} from "../../types/JSmol";
import {fetchRawFileFromS3Url} from "./util";
import MolmakerLoading from "../custom/MolmakerLoading";
import CalculatedQuantities from "./CalculatedQuantities";
import PartialCharge from "./PartialCharge";
import {useAuth0} from "@auth0/auth0-react";
import {MolmakerTextField} from "../custom";
import {AddAndUploadStructureToS3} from "../../services/api";

interface OrbitalViewerProp {
	job: Job;
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError: React.Dispatch<React.SetStateAction<string | null>>,
}

const fullWidth = 400;
const miniWidth = 80;

const OrbitalViewer: React.FC<OrbitalViewerProp> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError,
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

	// orbital display option
	const [meshOrFill, setMeshOrFill] = useState<"fill" | "mesh">("fill");
	const [showIsosurface, setShowIsosurface] = useState(true);


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

	// calculated quantities
	const resultURL = jobResultFiles.urls["result"];
	const [result, setResult] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);

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

	useEffect(() => {
		fetchRawFileFromS3Url(resultURL, 'json').then((res) => {
			const workflowKeys = ['geometric optimization', 'molecular orbitals', 'vibrational frequencies'];
			const isWorkflowSchema = Object.keys(res).some(k => workflowKeys.includes(k));
			const resultJson = isWorkflowSchema ? (res as any)["molecular orbitals"] : res;
			setResult(resultJson);
			// console.log(resultJson);
		}).catch((err) => {
			setError("Failed to fetch job details or results");
			console.error("Failed to fetch job details or results", err);
		}).finally(() => {
			setLoading(false);
		})

	}, [resultURL]);

	// useEffect(() => {
	// 	if (!selectAtom) return;
	//
	// 	const script: string = `
	// 		frame 2;
	// 		label OFF;
	// 		isosurface delete;
	// 		mo delete all;
	// 		select atomno=${selectAtom.atomNo};
	// 		label %a %P;
	// 	`;
	// 	window.Jmol.script(viewerObj, script);
	// }, [selectAtom]);

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
		// isosurface COLOR red blue MO ${selectedOrbital.index} ${displayOption};
		const displayOption: string = meshOrFill === "fill" ? "NOMESH FILL" : "NOFILL MESH";
		const script = `
			frame 1;
			mo delete all;
			label OFF;
			isosurface delete;
			mo ${selectedOrbital.index};
			mo ${displayOption};
			mo titleFormat " ";
			${showIsosurface ? "mo on; isosurface on;" : "mo off; isosurface off;"}
		`;
		window.Jmol.script(viewerObj, script);
	}, [orbitals, selectedOrbital, viewerObj, meshOrFill]);

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
		// window.Jmol.script(
		// 	viewerObj,
		// 	`calculate PARTIALCHARGE;`
		// );
		// setTimeout(() => {
		// 	const atomsArray = window.Jmol.getPropertyAsArray(
		// 		viewerObj,
		// 		"atomInfo"
		// 	)
		// 	console.log("atomsArray", atomsArray);
		// 	const atoms: Atom[] = atomsArray.map((a: any): Atom => ({
		// 		atomIndex: a.atomIndex,
		// 		atomNo: a.atomno,
		// 		bondCount: a.bondCount,
		// 		element: a.element,
		// 		model: a.model,
		// 		partialCharge: a.partialCharge,
		// 		sym: a.sym,
		// 		x: a.x,
		// 		y: a.y,
		// 		z: a.z,
		// 	}))
		// 	setAtoms(atoms);
		// }, 500)
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
			j2sPath: import.meta.env.J2S_PATH,
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
	}, [jobResultFiles, viewerObjId, loading]);

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

	if (loading) { return (<MolmakerLoading />); }

	return (
		<>
			<GlobalStyles styles={{
				'.MuiDialog-root, .MuiDialog-container, .MuiDialog-paper, .MuiBackdrop-root': {
					zIndex: 9999,
				},
			}} />
			<Grid container spacing={2} sx={{ width: '100%' }}>
				{ (job.calculation_type !== "standard") && (
					<Grid size={12} sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
						<Typography variant="h5">
							Molecular Orbital Result
						</Typography>
						<Divider sx={{ mt: 3, width: '100%' }} />
					</Grid>
				)}
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
								selectedOrbital={selectedOrbital}
								meshOrFill={meshOrFill}
								setMeshOrFill={setMeshOrFill}
								showIsosurface={showIsosurface}
								setShowIsosurface={setShowIsosurface}
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
							<CalculatedQuantities job={job} result={result} />
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
							<PartialCharge
								frameNo={2}
								viewerObj={viewerObj}
							/>
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
						startIcon={<AddPhotoAlternateOutlined />}
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
				<DialogTitle sx={{ bgcolor: blueGrey[300], color: grey[800], display: 'flex', alignItems: 'center' }}>
					<AddPhotoAlternateOutlined sx={{ mr: 1 }} />
					Add Structure to My Library
				</DialogTitle>
				<Divider />
				<DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 2, minWidth: 500 }}>
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
				<DialogActions sx={{ pr: 2, pb: 2 }}>
					<Button 
						onClick={() => setAddDialogOpen(false)} 
						variant="outlined" 
						color="primary"
						sx={{ textTransform: 'none' }}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						variant="contained"
						color="primary"
						sx={{ textTransform: 'none' }}
					>
						Submit
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default OrbitalViewer;

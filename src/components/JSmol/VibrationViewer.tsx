import React, {useEffect, useRef, useState} from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Checkbox,
	Divider,
	Drawer,
	FormControlLabel,
	FormGroup,
	Grid,
	IconButton,
	Paper, Slider, Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow, Tabs,
	Toolbar,
	Typography
} from "@mui/material";
import {blueGrey, grey} from "@mui/material/colors";
import {
	AdjustOutlined,
	CalculateOutlined,
	DataObjectOutlined,
	ExpandMore,
	Fullscreen,
	FullscreenExit
} from "@mui/icons-material";
import {Job, JobResult, VibrationMode, ComplexNumber} from "../../types";
import {fetchRawFileFromS3Url} from "./util"
import MolmakerLoading from "../custom/MolmakerLoading";
import CalculatedQuantities from "./CalculatedQuantities";
import IRSpectrumPlot from "../IRSpectrumPlot";
import {formatComplex} from "../../utils";


function a11yProps(index: number) {
	return {
		id: `simple-tab-${index}`,
		'aria-controls': `simple-tabpanel-${index}`,
	};
}

enum viewerTab {
	structure,
	graph,
}

const fullWidth = 400;
const miniWidth = 80;

interface VibrationViewerProps {
	job: Job,
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError: React.Dispatch<React.SetStateAction<string | null>>,
}

const VibrationViewer: React.FC<VibrationViewerProps> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);
	const appletRef = useRef<any>(null);

	const [viewerObj, setViewerObj] = useState<any>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const xyzFileUrl = jobResultFiles.urls["vib"];
	const resultURL = jobResultFiles.urls["result"];
	const [result, setResult] = useState<any | null>(null);

	const [modes, setModes] = useState<VibrationMode[]>([]);
	const rowsPerPage = 25;
	const [page, setPage] = useState(0);
	const [selectedMode, setSelectedMode] = useState<VibrationMode | null>(null);
	const [vibrationOn, setVibrationOn] = useState(true);
	const [vectorOn, setVectorOn] = useState(true);
	const [open, setOpen] = useState(true);
	const [accordionOpen, setAccordionOpen] = useState({ 
		modes: true, 
		options: false,
		spectrum: false,
		quantities: false
	});

	// structure viewer & graph viewer tab
	const [value, setValue] = React.useState<viewerTab>(viewerTab.structure);
	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};

	// IR Spectra Graph
	const [graphData, setGraphData] = useState<{freq: number, intensity: number}[]>([]);
	const [width, setWidth] = useState(15);
	const [shape, setShape] = useState<'gaussian' | 'lorentzian'>('gaussian');

	useEffect(() => {
		setLoading(true);
		fetchRawFileFromS3Url(resultURL, 'json').then((res) => {
			const workflowKeys = ['geometric optimization', 'molecular orbitals', 'vibrational frequencies'];
			const isWorkflowSchema = Object.keys(res).some(k => workflowKeys.includes(k));
			const resultJson = isWorkflowSchema ? ((res as any)["vibrational frequencies"]) : res;
			setResult(resultJson);
		}).catch((err) => {
			setError("Failed to fetch job details or results");
			console.error("Failed to fetch job details or results", err);
		}).finally(() => {
			setLoading(false);
		})

	}, [resultURL]);

	// Initialize Jmol viewer
	useEffect(() => {
		if (loading) return;
		if (value !== viewerTab.structure) return;
		if (!viewerRef.current) return;

		const jsmolIsReady = (obj: any) => {
			appletRef.current = obj;
			window.Jmol.script(obj, `reset; zoom 50;`);
			setViewerObj(obj);
		};

		const Info = {
			color: "#FFFFFF",
			width: "100%",
			height: "100%",
			use: "HTML5",
			j2sPath: "/ubchemica/jsmol/j2s",
			src: xyzFileUrl,
			serverURL: "https://chemapps.stolaf.edu/jmol/jsmol/php/jsmol.php",
			script: `load async "${xyzFileUrl}";`,
			disableInitialConsole: true,
			addSelectionOptions: false,
			debug: false,
			readyFunction: jsmolIsReady,
		};

		// create and mount
		window.Jmol.getApplet(viewerObjId, Info);
		viewerRef.current.innerHTML = window.Jmol.getAppletHtml(viewerObjId, Info);

		// cleanup on unmount or when xyzFileUrl/viewer changes
		return () => {
			try {
				if (appletRef.current) {
					window.Jmol.script(appletRef.current, `!exit; spin off; animation off; set refreshing off;`);
				}
			} catch {}
			if (viewerRef.current) viewerRef.current.innerHTML = "";
			appletRef.current = null;
			setViewerObj(null);
		};
	}, [xyzFileUrl, viewerObjId, loading, value]);

	// when switching away from structure, stop and clear immediately
	useEffect(() => {
		if (value === viewerTab.structure) return;
		try {
			if (appletRef.current) {
				window.Jmol.script(appletRef.current, `!exit;`); // immediate stop
			}
		} catch {}
		if (viewerRef.current) viewerRef.current.innerHTML = "";
		appletRef.current = null;
		setViewerObj(null);
	}, [value]);


	// Fetch vibration modes
	useEffect(() => {
		if (!viewerObj) return;
		if (!result) return;
		if (value !== viewerTab.structure) return;

		const charTemp: number[] = result.extras.Psi4.char_temp;
		const forceConstant: number[] = result.extras.Psi4.force_constant;
		const frequency: ComplexNumber[] = result.extras.Psi4.frequency;
		const irIntensity: number[] = result.extras.Psi4.ir_intensity;
		const realFrequency: number[] = result.extras.Psi4.real_frequency;
		const realIrIntensity: number[] = result.extras.Psi4.real_ir_intensity;
		const symmetry: string[] = result.extras.Psi4.symmetry;

		const modes: VibrationMode[] = frequency.map((freq: ComplexNumber, idx: number) => {
			return {
				index: idx + 1,
				frequencyCM: freq,
				irIntensity: irIntensity[idx],
				symmetry: (symmetry[idx] === null ? "None" : symmetry[idx]),
				forceConstant: forceConstant[idx],
				charTemp: charTemp[idx],
			}
		})
		setModes(modes);
		const graphData: {freq: number, intensity: number}[] = realFrequency.map((freq: number, idx: number) => {
			return {
				freq: freq,
				intensity: realIrIntensity[idx]
			}
		})
		setGraphData(graphData);
	}, [viewerObj, result]);

	// Update display on selection or toggles
	useEffect(() => {
		if (!viewerObj || selectedMode === null) return;
		if (value !== viewerTab.structure) return;

		let script = `model ${selectedMode.index}; vibration ${vibrationOn ? 'ON' : 'OFF'}; vector ${vectorOn ? 'ON' : 'OFF'};`;
		if (vectorOn) script += ` color vectors yellow; vector 19;`;
		window.Jmol.script(viewerObj, script);
	}, [viewerObj, selectedMode, vibrationOn, vectorOn]);

	const toggle = () => {
		if (open) {
			setOpen(false);
			setAccordionOpen({
				modes: false,
				options: false,
				spectrum: false,
				quantities: false
			});
		}
		else {
			setOpen(true);
		}
	}

	const handleAccordionChange = (panel: keyof typeof accordionOpen) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
		setAccordionOpen(prev => ({ ...prev, [panel]: isExpanded }));
		if (isExpanded && !open) setOpen(true); // Open drawer if opening an accordion
	};

	if (loading) { return (<MolmakerLoading />); }

	return (
		<Grid container spacing={2} sx={{ width: '100%' }}>
			{ (job.calculation_type !== "standard") && (
				<Grid size={12} sx={{ display: 'flex', flexDirection: 'column' }}>
					<Typography variant="h5">
						Vibration Analysis Result
					</Typography>
					<Divider sx={{ mt: 3, width: '100%' }} />
				</Grid>
			)}
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
						<IRSpectrumPlot data={graphData} width={width} shape={shape}/>
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
					expanded={accordionOpen.modes}
					onChange={handleAccordionChange('modes')}
					sx={{
						backgroundColor: accordionOpen.modes ? grey[300] : grey[100],
						borderRadius: 0,
						boxShadow: 'none',
						mb: 0,
						transition: 'background-color 0.3s ease',
					}}
				>
					<AccordionSummary 
						expandIcon={accordionOpen.modes && <ExpandMore />}
						aria-controls="panel1-content"
						id="panel1-header"
						sx={{ color: grey[900], px: accordionOpen.modes ? 2 : 1 }}
					>
						<Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
							<AdjustOutlined sx={open ? { mr: 1 } : { ml: 2 }} />
							{open && (<span>Vibration Modes</span>)}
						</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
						<TableContainer sx={{ flex: 1 }}>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: grey[200] }}>
										<TableCell>Mode</TableCell>
										<TableCell>Symmetry</TableCell>
										<TableCell>Frequency (cm<sup>-1</sup>)</TableCell>
										<TableCell>IR Intensity</TableCell>
										<TableCell>Force Constant (mDyne/A)</TableCell>
										<TableCell>Char Temp (K)</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{modes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((mode) => (
										<TableRow
											key={mode.index}
											onClick={() => {
												if (value !== viewerTab.structure) { setValue(viewerTab.structure); }
												setSelectedMode(mode);
											}}
											sx={{ 
												cursor: 'pointer',
												bgcolor: grey[50],
												'&:hover': {
													backgroundColor: blueGrey[50],
												},
											}}
										>
											<TableCell>{mode.index}</TableCell>
											<TableCell>{mode.symmetry}</TableCell>
											<TableCell>{formatComplex(mode.frequencyCM)}</TableCell>
											<TableCell>{mode.irIntensity.toFixed(2)}</TableCell>
											<TableCell>{mode.forceConstant.toFixed(2)}</TableCell>
											<TableCell>{mode.charTemp.toFixed(2)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							component="div"
							count={modes.length}
							page={page}
							onPageChange={(_e, newPage) => setPage(newPage)}
							rowsPerPage={rowsPerPage}
							rowsPerPageOptions={[]}
							showFirstButton
							showLastButton
						/>
					</AccordionDetails>
				</Accordion>
				<Accordion
					expanded={accordionOpen.options}
					onChange={handleAccordionChange('options')}
					sx={{ 
						backgroundColor: accordionOpen.options ? grey[300] : grey[100],
						borderRadius: 0, 
						boxShadow: 'none', 
						mb: 0, 
						transition: 'background-color 0.3s ease' 
					}}
				>
					<AccordionSummary
						expandIcon={accordionOpen.options && <ExpandMore />}
						aria-controls="panel2-content"
						id="panel2-header"
						sx={{ color: grey[900], px: accordionOpen.options ? 2 : 1 }}
					>
						<Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
							<DataObjectOutlined sx={open ? { mr: 1 } : { ml: 2 }}  />
							{open && <span>Vibration Properties</span>}
						</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
						<Grid container sx={{ width: '100%', height: '100%', bgcolor: grey[50], display: 'flex', flexDirection: 'row' }}>
							<Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', px: 2, pb: 2, flexGrow: 1, mt: 0, pt: 0 }}>
								<FormControlLabel
									control={<Checkbox checked={vibrationOn} onChange={e => setVibrationOn(e.target.checked)} />}
									label="Vibration ON"
								/>
								<FormControlLabel
									control={<Checkbox checked={vectorOn} onChange={e => setVectorOn(e.target.checked)} />}
									label="Vector ON"
								/>
							</Grid>
						</Grid>
					</AccordionDetails>
				</Accordion>
				<Accordion
					expanded={accordionOpen.spectrum}
					onChange={handleAccordionChange('spectrum')}
					sx={{
						backgroundColor: accordionOpen.spectrum ? grey[300] : grey[100],
						borderRadius: 0,
						boxShadow: 'none',
						mb: 0,
						transition: 'background-color 0.3s ease'
					}}
				>
					<AccordionSummary
						expandIcon={accordionOpen.spectrum && <ExpandMore />}
						aria-controls="panel2-content"
						id="panel2-header"
						sx={{ color: grey[900], px: accordionOpen.spectrum ? 2 : 1 }}
					>
						<Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
							<DataObjectOutlined sx={open ? { mr: 1 } : { ml: 2 }}  />
							{open && <span>IR Intensity</span>}
						</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0, borderBottom: '1px solid', borderColor: grey[300] }}>
						<Grid container sx={{ width: '100%', height: '100%', bgcolor: grey[50], display: 'flex', flexDirection: 'row' }}>
							<Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', px: 2, pb: 2,flexGrow: 1, mt: 0, pt: 2 }}>
								<Box sx={{ border: '1px solid', borderRadius: 2, p: 1, borderColor: 'divider' }}>
									<Typography variant="caption" sx={{ mb: 1, color: 'text.secondary' }}>
										Function
									</Typography>
									<FormGroup sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
										<FormControlLabel
											control={<Checkbox checked={shape==="gaussian"} onChange={(_, checked) => {
												if (value !== viewerTab.graph) { setValue(viewerTab.graph); }
												setShape("gaussian");
											}} />}
											label="Gaussian"
										/>
										<FormControlLabel
											control={<Checkbox checked={shape==="lorentzian"} onChange={(_, checked) => {
												if (value !== viewerTab.graph) { setValue(viewerTab.graph); }
												setShape("lorentzian");
											}} />}
											label="Lorentzian"
										/>
									</FormGroup>
								</Box>
							</Grid>
							<Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', px: 2, pb: 2,flexGrow: 1, mt: 0 }}>
								<Box sx={{ border: '1px solid', borderRadius: 2, p: 1, borderColor: 'divider' }}>
									<Typography variant="caption" sx={{ mb: 1, color: 'text.secondary' }}>
										Width
									</Typography>
									<FormGroup>
										<Slider
											value={width}
											min={0}
											max={150}
											step={1}
											marks={[{ value: 0, label: '0' }, { value: 150, label: '150' }]}
											valueLabelDisplay="auto"
											onChange={(_, newValue) => {
												if (value !== viewerTab.graph) { setValue(viewerTab.graph); }
												setWidth(newValue as number);
											}}
											sx={{ width: '80%', alignSelf: 'center', my: 2 }}
										/>
									</FormGroup>
								</Box>
							</Grid>
						</Grid>
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
			</Drawer>
		</Grid>
	);
};

export default VibrationViewer;

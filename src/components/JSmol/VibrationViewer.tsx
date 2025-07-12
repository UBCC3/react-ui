import React, {useEffect, useRef, useState} from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Checkbox,
	Divider,
	Drawer,
	FormControlLabel,
	Grid,
	IconButton,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
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
import {Job, JobResult, VibrationMode} from "../../types";
import {fetchRawFileFromS3Url} from "./util"
import MolmakerLoading from "../custom/MolmakerLoading";

declare global {
	interface Window {
		Jmol: any;
	}
}

const fullWidth = 400;
const miniWidth = 80;

interface VibrationViewerProps {
	job: Job,
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError:   React.Dispatch<React.SetStateAction<string | null>>,
}

const VibrationViewer: React.FC<VibrationViewerProps> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);
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
		quantities: false
	});

	useEffect(() => {
		fetchRawFileFromS3Url(resultURL, 'json').then((res) => {
			console.log(res);
			setResult(res);
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
			src: xyzFileUrl,
			serverURL: "https://chemapps.stolaf.edu/jmol/jsmol/php/jsmol.php", // TODO backend to proxy
			script: `load async "${xyzFileUrl}";`,
			disableInitialConsole: true,
			addSelectionOptions: false,
			debug: false,
			readyFunction: jsmolIsReady,
		};

		window.Jmol.getApplet(viewerObjId, Info);
		if (viewerRef.current) {
			viewerRef.current.innerHTML = window.Jmol.getAppletHtml(viewerObjId, Info);
		}
	}, [xyzFileUrl, viewerObjId, loading]);

	// Fetch vibration modes
	useEffect(() => {
		if (!viewerObj) return;
		if (!result) return;

		const charTemp: number[] = result.extras.Psi4.char_temp;
		const forceConstant: number[] = result.extras.Psi4.force_constant;
		const frequency: number[] = result.extras.Psi4.frequency;
		const irIntensity: number[] = result.extras.Psi4.ir_intensity;
		const symmetry: string[] = result.extras.Psi4.symmetry;

		const modes: VibrationMode[] = frequency.map((freq: number, idx: number) => {
			return {
				index: idx + 1,
				frequencyCM: freq,
				irIntensity: irIntensity[idx],
				symmetry: symmetry[idx],
				forceConstant: forceConstant[idx],
				charTemp: charTemp[idx],
			}
		})
		setModes(modes);
	}, [viewerObj, result]);

	// Update display on selection or toggles
	useEffect(() => {
		if (!viewerObj || selectedMode === null) return;

		let script = `model ${selectedMode.index}; vibration ${vibrationOn ? 'ON' : 'OFF'}; vector ${vectorOn ? 'ON' : 'OFF'};`;
		if (vectorOn) script += ` color vectors yellow; vector 10;`;
		window.Jmol.script(viewerObj, script);
	}, [viewerObj, selectedMode, vibrationOn, vectorOn]);

	const toggle = () => {
		if (open) {
			setOpen(false);
			setAccordionOpen({
				modes: false,
				options: false,
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
			<Grid size={12} sx={{ display: 'flex', flexDirection: 'column' }}>
				<Typography variant="h5">
					Vibration Analysis Result
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
											onClick={() => setSelectedMode(mode)}
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
											<TableCell>{mode.frequencyCM.toFixed(2)}</TableCell>
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
										{ label: 'method', value: result.model.method },
										// TODO what does this symmetry for?
										{ label: 'Symmetry', value: 'cs' },
										{ label: 'Basis', value: result.model.basis },
										{ label: 'SCF Energy', value: `${result.extras.qcvars["SCF ITERATION ENERGY"]} Hartree` },
										// TODO Which Dipole Moment?
										{ label: 'Dipole Moment', value: '2.19764298641837 Debye' },
										{ label: 'CPU time', value: job.runtime },
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
			</Drawer>
		</Grid>
	);
};

export default VibrationViewer;

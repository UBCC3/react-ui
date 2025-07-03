import React, { useEffect, useRef, useState } from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Checkbox,
	FormControlLabel,
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
	Divider
} from "@mui/material";
import { grey, blueGrey } from "@mui/material/colors";
import {
	AdjustOutlined,
	DataObjectOutlined,
	ExpandMore,
	Fullscreen,
	FullscreenExit,
	CalculateOutlined
} from "@mui/icons-material";

declare global {
	interface Window {
		Jmol: any;
	}
}

interface VibrationViewerProps {
	xyzFile: string;
	viewerObjId: string;
}

type VibrationMode = {
	index: number;
	frequencyCM: number;
	pbc: string;
};

const fullWidth = 400;
const miniWidth = 80;

const VibrationViewer: React.FC<VibrationViewerProps> = ({ xyzFile, viewerObjId }) => {
	const viewerRef = useRef<HTMLDivElement>(null);
	const [viewerObj, setViewerObj] = useState<any>(null);
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

	// Initialize Jmol viewer
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
			src: xyzFile,
			script: `load \"XYZ::${xyzFile}\";`,
			disableInitialConsole: true,
			addSelectionOptions: false,
			debug: false,
			readyFunction: jsmolIsReady,
		};

		window.Jmol.getApplet(viewerObjId, Info);
		if (viewerRef.current) {
			viewerRef.current.innerHTML = window.Jmol.getAppletHtml(viewerObjId, Info);
		}
	}, [xyzFile, viewerObjId]);

	// Fetch vibration modes
	useEffect(() => {
		if (!viewerObj) return;

		const models = window.Jmol.getPropertyAsArray(viewerObj, "auxiliaryInfo.models");
		const frequencyRegExp = /frequency_cm-1=([+-]?\d+(?:\.\d+)?)/;
		const pbcRegExp = /pbc=\"([^\"]*)\"/;

		const parsed = models.map((m: any) => {
			const name: string = m.modelName;
			const fMatch = name.match(frequencyRegExp) || [];
			const pMatch = name.match(pbcRegExp) || [];
			return {
				index: m.modelNumber,
				frequencyCM: parseFloat(fMatch[1] || "0"),
				pbc: pMatch[1] || "",
			};
		});

		parsed.sort((a, b) => a.index - b.index);
		setModes(parsed);
	}, [viewerObj]);

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
										<TableCell>Frequency</TableCell>
										<TableCell>PBC</TableCell>
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
											<TableCell>{mode.frequencyCM.toFixed(2)}</TableCell>
											<TableCell>{mode.pbc}</TableCell>
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
			</Drawer>
		</Grid>
	);
};

export default VibrationViewer;

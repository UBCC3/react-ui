import React, {useEffect, useState} from "react";
import {
	Box,
	Checkbox,
	Divider,
	FormControlLabel,
	FormGroup,
	Grid,
	Paper,
    Slider,
    Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
    Tabs,
	Typography
} from "@mui/material";
import { blueGrey, grey } from "@mui/material/colors";
import {
	AdjustOutlined,
	CalculateOutlined,
	DataObjectOutlined,
} from "@mui/icons-material";
import { Job, JobResult, VibrationMode, ComplexNumber } from "../../types";
import MolmakerLoading from "../custom/MolmakerLoading";
import CalculatedQuantities from "./CalculatedQuantities";
import IRSpectrumPlot from "../IRSpectrumPlot";
import { formatComplex } from "../../utils";
import { useResultDrawer } from "../../hooks/UseResultDrawer";
import { useJsmolViewer } from "../../hooks/UseJsmolViewer";
import { useJobResult } from "../../hooks/UseJobResult";
import { ResultDrawer } from "../results/ResultDrawer";
import { ResultDrawerSection } from "../results/ResultDrawerSection";

/**
 * Generate accessibility props for a Material UI Tab.
 */
function a11yProps(index: number) {
	return {
		id: `simple-tab-${index}`,
		'aria-controls': `simple-tabpanel-${index}`,
	};
}

/**
 * Main display tabs for the vibration result page.
 */
enum viewerTab {
	structure,
	graph,
}

/**
 * Props for the VibrationViewer component.
 */
interface VibrationViewerProps {
	job: Job,
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError: React.Dispatch<React.SetStateAction<string | null>>,
}

/**
 * Displays the vibrational frequency analysis result viewer.
 * 
 * Loads vibrational trajectory data into JSmol, extracts vibration modes
 * from the result JSON, displays vibration mode information in a table, and
 * renders an IR specturm graph from the calculated real frequencies and
 * intensities.
 */
const VibrationViewer: React.FC<VibrationViewerProps> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError
}) => {
	const xyzFileUrl = jobResultFiles.urls["vib"];
	const resultURL = jobResultFiles.urls["result"];

    const { result, loading } = useJobResult(resultURL, "vibrational frequencies", setError);

    // structure viewer & graph viewer tab
    const [value, setValue] = useState<viewerTab>(viewerTab.structure);
    const handleChange = (_event: React.SyntheticEvent, newValue: number) => setValue(newValue)

    const { viewerRef, viewerObj, appletRef } = useJsmolViewer({
        viewerObjId,
        src: xyzFileUrl,
        loadScript: `load async "${xyzFileUrl}";`,
        onReadyScript: `reset; zoom 50;`,
        skip: loading || value !== viewerTab.structure,
        cleanupOnChange: true,
    });

    const { open, accordionOpen, toggle, handleAccordionChange } = useResultDrawer({
        modes: true,
        options: false,
        spectrum: false,
        quantities: false,
    });

    // Parsed vibration modes displayed in the mode table.
    const [modes, setModes] = useState<VibrationMode[]>([]);

    // Pagination state for the vibration mode table.
    const rowsPerPage = 25;
    const [page, setPage] = useState(0);

    // Currently selected vibration mode shown in the JSmol viewer.
    const [selectedMode, setSelectedMode] = useState<VibrationMode | null>(null);

    // JSmol display toggles for vibration animation and displacement vectors.
    const [vibrationOn, setVibrationOn] = useState(true);
    const [vectorOn, setVectorOn] = useState(true);

	// IR Spectra Graph
	const [graphData, setGraphData] = useState<{freq: number, intensity: number}[]>([]);
	const [width, setWidth] = useState(15);
	const [shape, setShape] = useState<'gaussian' | 'lorentzian'>('gaussian');

	// When switching away from structure, stop and clear the applet
    // immediately rather than waiting for useJsmolViewer's own cleanup
    // (which only fires once `skip` flips true on the next render).
	useEffect(() => {
		if (value === viewerTab.structure) return;
		try {
			if (appletRef.current) {
				window.Jmol.script(appletRef.current, `!exit;`);
			}
		} catch {}
		if (viewerRef.current) viewerRef.current.innerHTML = "";
		appletRef.current = null;
	}, [value]);


	// Fetch vibration modes
	useEffect(() => {
		if (!viewerObj || !result || value !== viewerTab.structure) return;

		const charTemp: number[] = result.extras.Psi4.char_temp;
		const forceConstant: number[] = result.extras.Psi4.force_constant;
		const frequency: ComplexNumber[] = result.extras.Psi4.frequency;
		const irIntensity: number[] = result.extras.Psi4.ir_intensity;
		const realFrequency: number[] = result.extras.Psi4.real_frequency;
		const realIrIntensity: number[] = result.extras.Psi4.real_ir_intensity;
		const symmetry: string[] = result.extras.Psi4.symmetry;

		const parsedModes: VibrationMode[] = frequency.map((freq: ComplexNumber, idx: number) => {
			return {
				index: idx + 1,
				frequencyCM: freq,
				irIntensity: irIntensity[idx],
				symmetry: (symmetry[idx] === null ? "None" : symmetry[idx]),
				forceConstant: forceConstant[idx],
				charTemp: charTemp[idx],
			}
		})
		setModes(parsedModes);

		const parsedGraphData = realFrequency.map((freq: number, idx: number) => ({
			freq: freq,
			intensity: realIrIntensity[idx]
		}))
		setGraphData(parsedGraphData);
	}, [viewerObj, result]);

	// Update display on selection or toggles
	useEffect(() => {
		if (!viewerObj || selectedMode === null || value !== viewerTab.structure) return;

		let script = `model ${selectedMode.index}; vibration ${vibrationOn ? 'ON' : 'OFF'}; vector ${vectorOn ? 'ON' : 'OFF'};`;
		if (vectorOn) script += ` color vectors yellow; vector 19;`;
		window.Jmol.script(viewerObj, script);
	}, [viewerObj, selectedMode, vibrationOn, vectorOn]);

	if (loading) { return (<MolmakerLoading />); }

	return (
		<Grid container spacing={2} sx={{ width: '100%' }}>
			{(job.calculation_type !== "standard") && (
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
			<ResultDrawer open={open} onToggle={toggle}>
                <ResultDrawerSection
                    open={open}
                    expanded={accordionOpen.modes}
                    onChange={handleAccordionChange('modes')}
                    icon={<AdjustOutlined />}
                    label="Vibration Modes"
                    ariaId="panel1"
                >
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
                                {modes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((mode) =>(
                                    <TableRow
                                        key={mode.index}
                                        onClick={() => {
                                            if (value !== viewerTab.structure) setValue(viewerTab.structure);
                                            setSelectedMode(mode);
                                        }}
                                        sx={{
                                            cursor: 'pointer',
                                            bgcolor: grey[50],
                                            '&:hover': { backgroundColor: blueGrey[50] },
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
                </ResultDrawerSection>
                <ResultDrawerSection
                    open={open}
                    expanded={accordionOpen.options}
                    onChange={handleAccordionChange('options')}
                    icon={<DataObjectOutlined />}
                    label="Vibration Properties"
                    ariaId="panel2"
                >
                    <Grid 
                        container
                        sx={{
                            width: '100%',
                            height: '100%',
                            bgcolor: grey[50],
                            display: 'flex',
                            flexDirection: 'row'
                        }}
                    >
                        <Grid
                            size={{ xs: 12 }}
                            sx={{
                                dislay: 'flex',
                                flexDirection: 'column',
                                px: 2,
                                pb: 2,
                                flexGrow: 1,
                                mt: 0,
                                pt: 0
                            }}
                        >
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
                </ResultDrawerSection>
                <ResultDrawerSection
                    open={open}
                    expanded={accordionOpen.spectrum}
                    onChange={handleAccordionChange('spectrum')}
                    icon={<DataObjectOutlined />}
                    label="IR Intensity"
                    ariaId="panel2b"
                    detailsSx={{ borderBottom: '1px solid', borderColor: grey[300] }}
                >
                    <Grid
                        container
                        sx={{
                            width: '100%',
                            height: '100%',
                            bgcolor: grey[50],
                            display: 'flex',
                            flexDirection: 'row'
                        }}
                    >
                        <Grid
                            size={{ xs: 12 }}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                px: 2,
                                pb: 2,
                                flexGrow: 1,
                                mt: 0,
                                pt: 2
                            }}
                        >
                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderRadius: 2,
                                    p: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        mb: 1,
                                        color: 'text.secondary'
                                    }}
                                >
                                    Function
                                </Typography>
                                <FormGroup
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: 1,
                                    }}
                                >
                                    <FormControlLabel
                                        control={<Checkbox checked={shape === "gaussian"}
                                        onChange={() => {
                                            if (value !== viewerTab.graph) setValue(viewerTab.graph);
                                            setShape("gaussian");
                                        }} />}
                                        label="Gaussian"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={shape === "lorentzian"}
                                        onChange={() => {
                                            if (value !== viewerTab.graph) setValue(viewerTab.graph);
                                            setShape("lorentzian");
                                        }} />}
                                        label="Lorentzian"
                                    />
                                </FormGroup>
                            </Box>
                        </Grid>
                        <Grid
                            size={{ xs: 12 }}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                px: 2,
                                pb: 2,
                                flexGrow: 1,
                                mt: 0,
                            }}
                        >
                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderRadius: 2,
                                    p: 1,
                                    borderColor: 'divider'
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        mb: 1,
                                        color: 'text.secondary'
                                    }}
                                >
                                    Width
                                </Typography>
                                <FormGroup>
                                    <Slider
                                        value={width}
                                        min={0}
                                        max={150}
                                        step={1}
                                        marks={[{ value: 0, label: '0'}, { value: 150, label: '150' }]}
                                        valueLabelDisplay="auto"
                                        onChange={(_, newValue) => {
                                            if (value !== viewerTab.graph) setValue(viewerTab.graph);
                                            setWidth(newValue as number);
                                        }}
                                        sx={{
                                            width: '80%',
                                            alignSelf: 'center',
                                            my: 2,
                                        }}
                                    />
                                </FormGroup>
                            </Box>
                        </Grid>
                    </Grid>
                </ResultDrawerSection>
                <ResultDrawerSection
                    open={open}
                    expanded={accordionOpen.quantities}
                    onChange={handleAccordionChange('quantities')}
                    icon={<CalculateOutlined />}
                    label="Calculated Quantities"
                    ariaId="panel3"
                >
                    <CalculatedQuantities job={job} result={result} />
                </ResultDrawerSection>
            </ResultDrawer>
		</Grid>
	);
};

export default VibrationViewer;

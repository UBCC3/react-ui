import {
	Accordion, AccordionDetails, AccordionSummary,
	Box, Checkbox, FormControlLabel,
	Grid,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow, Typography
} from "@mui/material";
import React, {useEffect, useRef, useState} from "react";
import {blueGrey} from "@mui/material/colors";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface VibrationViewerProps {
	xyzFile: string,
	viewerObjId: string,
}

type VibrationMode = {
	index: number;
	frequencyCM: number;
	pbc: string;
}

enum expandableMenu {
	'frequency',
	'option'
}

const VibrationViewer:React.FC<VibrationViewerProps> = ({
	xyzFile,
	viewerObjId,
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);
	const [viewerObj, setViewerObj] = useState<any>(null);

	// vibration modes table
	const [modes, setModes] = useState<any>([]);
	const rowsPerPage: number = 25;
	const [page, setPage] = useState(0);
	const [selectedMode, setSelectedMode] = useState<VibrationMode | null>(null);
	const [vibrationOn, setVibrationOn] = useState<boolean>(true);
	const [vectorOn, setVectorOn] = useState<boolean>(true);

	// accordion
	const [expanded, setExpanded] = useState<expandableMenu | false>(false);

	useEffect(() => {
		if (selectedMode === null) return;

		let script = `
			vibration ${vibrationOn ? 'ON': 'OFF'};
			vector ${vectorOn ? 'ON': 'OFF'};
		`;
		if (vectorOn) { script += `color vectors yellow; vector 10;` }

		window.Jmol.script(viewerObj, script);
	}, [vibrationOn, vectorOn]);

	useEffect(() => {
		if (modes.length === 0) return;

		if (selectedMode === null) return;

		const showVibrationMode = () => {
			const script= `
				model ${selectedMode.index};
				vibration ${vibrationOn ? 'ON': 'OFF'};
				vector ${vectorOn ? 'ON': 'OFF'};
				color vectors yellow;
				vector 10;
			`;
			window.Jmol.script(viewerObj, script);
			return;
		}

		showVibrationMode();
	}, [modes, selectedMode]);

	useEffect(() => {
		if (!viewerObj) return;

		function fetchOrbitals() {
			const models = window.Jmol.getPropertyAsArray(
				viewerObj,
				"auxiliaryInfo.models",
			);

			const frequencyRegExp = /frequency_cm-1=([+-]?\d+(?:\.\d+)?)/;
			const pbcRegExp = /pbc="([^"]*)"/;

			const modes: VibrationMode[] = models.map((m:any) => {
				const frequencyMatch: RegExpMatchArray | null = (m.modelName as string).match(frequencyRegExp);
				const pbcMatch: RegExpMatchArray | null = (m.modelName as string).match(pbcRegExp);

				return {
					index: m.modelNumber,
					frequencyCM: parseFloat(frequencyMatch![1]),
					pbc: pbcMatch![1],
				}
			});

			modes.sort((a, b) => a.index - b.index);

			setModes(modes);
		}

		fetchOrbitals();
	}, [viewerObj]);

	useEffect(() => {
		const jsmolIsReady = (viewerObj: any) => {
			window.Jmol.script(viewerObj, `
			    zoom 50;
			    connect auto;
			`);

			setViewerObj(viewerObj);
		}

		// TODO bondTolerance slider to control?
		const Info = {
			color: "#FFFFFF",
			width: "100%",
			height: "100%",
			use: "HTML5",
			j2sPath: "/jsmol/j2s",
			src: xyzFile,
				// set bondTolerance 1;
			script: `
				load "XYZ::${xyzFile}";
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

	return (
		<Grid container spacing={2}>
			<Grid size={12} sx={{ height: '700px'}}>
				<Paper elevation={3} sx={{padding: 0, height: '100%', }}>
					<Grid container spacing={2} alignItems="stretch" sx={{ height: '100%'}} >
						<Grid
							sx={{
								xs: 12,
								md: 3,
								display: 'flex',
								flexDirection: 'column',
								width: '25%',
								maxHeight: '100%',
								border: '2px solid gray' // TODO: temperate distinguish boundary
							}}
						>
							<Accordion
								expanded={expanded === expandableMenu.frequency}
								onChange={(_: any, expanded: boolean)=> {
									setExpanded(expanded ? expandableMenu.frequency : false);
								}}
								sx={{
									justifyContent: 'space-between',
									flex: expanded === expandableMenu.frequency ? '1 1 0%' : '0 0 auto',
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
										Vibrational Modes
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
											height: '530px',
										}}
									>
										<Table stickyHeader size="small" >
											<TableHead>
												<TableRow sx={{ bgcolor: blueGrey[50] }}>
													<TableCell>#</TableCell>
													<TableCell>Frequency (cm^-1)</TableCell>
													<TableCell>PBC</TableCell>
												</TableRow>
											</TableHead>
											<TableBody >
												{modes
													.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
													.map((mode: VibrationMode) => (
														<TableRow
															key={mode.index}
															onClick={() => {
																setSelectedMode(mode);
															}}
															sx={{
																backgroundColor: (
																	selectedMode !== null &&
																	mode.index === selectedMode.index
																) ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
																cursor: 'pointer'
															}}
														>
															<TableCell>{mode.index}</TableCell>
															<TableCell>{mode.frequencyCM.toFixed(6)}</TableCell>
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
										onPageChange={(event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
											setPage(page);
										}}
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
							{/*Option Menu*/}
							<Accordion
								expanded={expanded === expandableMenu.option}
								onChange={(_: any, expanded: boolean) => {
									setExpanded(expanded ? expandableMenu.option:false);
								}}
								disableGutters
								sx={{
									flex: expanded === expandableMenu.option ? '1 1 0%' : '0 0 auto',
									minHeight: 0,
									display: 'flex',
									flexDirection: 'column'
								}}
							>
								<AccordionSummary
									expandIcon={ <ExpandMoreIcon /> }
									aria-controls="option-content"
									id="option-header"
									sx={{
										bgcolor: blueGrey[200],
									}}
								>
									<Typography component={'span'} variant="h6" color="text.secondary">
										Option
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
									<Box component="fieldset" sx={{ border: '1px solid gray', borderRadius: 2, p: 2, mt: 0 }}>
										<Box component="legend" sx={{ px: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
											Vibration & Vector
										</Box>
										<FormControlLabel
											control={
												<Checkbox
													checked={vibrationOn}
													onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
														setVibrationOn(event.target.checked);
													}}
												/>
											}
											label="Vibration ON"
										/>
										<FormControlLabel
											control={
												<Checkbox
													checked={vectorOn}
													onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
														setVectorOn(event.target.checked);
													}}
												/>
											}
											label="Vector ON"
										/>
									</Box>
									<Box component="fieldset" sx={{ border: '1px solid gray', borderRadius: 2, p: 2, mt: 0 }}>
										<Box component="legend" sx={{ px: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
											Vector
										</Box>

									</Box>
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
	)
}

export default VibrationViewer;
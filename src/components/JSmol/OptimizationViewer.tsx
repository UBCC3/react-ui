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

enum expandableMenu {
	optimization,
}

type OptimizationIteration = {
	index: number;
	energy: number;
}

const OptimizationViewer:React.FC<VibrationViewerProps> = ({
    xyzFile,
    viewerObjId,
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);
	const [viewerObj, setViewerObj] = useState<any>(null);
	const [expanded, setExpanded] = useState<expandableMenu | false>(false);

	// optimization iteration table
	const rowsPerPage: number = 25;
	const [page, setPage] = useState(0);
	const [iterations, setIterations] = useState<OptimizationIteration[]>([]);
	const [selectedIteration, setSelectedIteration] = useState<OptimizationIteration | null>(null);

	useEffect(() => {
		if (iterations.length === 0) return;

		if (selectedIteration === null) return;

		const showVibrationMode = () => {
			const script= `
				model ${selectedIteration.index};
				reset;
				zoom 50;
			`;
			window.Jmol.script(viewerObj, script);
			return;
		}

		showVibrationMode();
	}, [iterations, selectedIteration]);

	useEffect(() => {
		if (!viewerObj) return;

		function fetchOrbitals() {
			const models = window.Jmol.getPropertyAsArray(
				viewerObj,
				"auxiliaryInfo.models",
			);

			console.log(`models:`, models);
			const indexRegExp = /Iteration\s+(\d+)/
			const energyRegExp = /Energy\s+([+-]?\d+(?:\.\d+)?)/

			const iterations: OptimizationIteration[] = models.map((m:any) => {
				const index : RegExpMatchArray | null = (m.modelName as string).match(indexRegExp);
				const energy: RegExpMatchArray | null = (m.modelName as string).match(energyRegExp);

				return {
					index: parseInt(index![1]) + 1,
					energy: parseFloat(energy![1]),
				}
			})

			setIterations(iterations);
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

		const Info = {
			color: "#FFFFFF",
			width: "100%",
			height: "100%",
			use: "HTML5",
			j2sPath: "/jsmol/j2s",
			src: xyzFile,
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
								expanded={expanded === expandableMenu.optimization}
								onChange={(_: any, expanded: boolean)=> {
									setExpanded(expanded ? expandableMenu.optimization : false);
								}}
								sx={{
									justifyContent: 'space-between',
									flex: expanded === expandableMenu.optimization ? '1 1 0%' : '0 0 auto',
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
											height: '585px',
										}}
									>
										<Table stickyHeader size="small" >
											<TableHead>
												<TableRow sx={{ bgcolor: blueGrey[50] }}>
													<TableCell>#</TableCell>
													<TableCell>Energy</TableCell>
												</TableRow>
											</TableHead>
											<TableBody >
												{iterations
													.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
													.map((it: OptimizationIteration) => (
														<TableRow
															key={it.index}
															onClick={() => {
																setSelectedIteration(it);
															}}
															sx={{
																backgroundColor: (
																	selectedIteration !== null &&
																	it.index === selectedIteration.index
																) ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
																cursor: 'pointer'
															}}
														>
															<TableCell>{it.index}</TableCell>
															<TableCell>{it.energy.toFixed(6)}</TableCell>
														</TableRow>
													))}
											</TableBody>
										</Table>
									</TableContainer>
									<TablePagination
										component="div"
										count={iterations.length}
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

export default OptimizationViewer;
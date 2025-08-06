import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Divider,
	Grid,
	IconButton,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow, Toolbar, Typography
} from "@mui/material";
import React, {useEffect, useRef, useState} from "react";
import {blueGrey, grey} from "@mui/material/colors";
import Drawer from "@mui/material/Drawer";
import {AdjustOutlined, CalculateOutlined, ExpandMore, Fullscreen, FullscreenExit} from "@mui/icons-material";
import {fetchRawFileFromS3Url} from "./util";
import {Job, JobResult} from "../../types";
import MolmakerLoading from "../custom/MolmakerLoading";
import CalculatedQuantities from "./CalculatedQuantities";

interface VibrationViewerProps {
	job: Job,
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError:   React.Dispatch<React.SetStateAction<string | null>>,
}

enum expandableMenu {
	optimization,
}

type OptimizationIteration = {
	index: number;
	energy: number;
}

const fullWidth = 400;
const miniWidth = 80;

const OptimizationViewer:React.FC<VibrationViewerProps> = ({
    job,
	jobResultFiles,
    viewerObjId,
	setError,
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);
	const [viewerObj, setViewerObj] = useState<any>(null);
	const xyzFileUrl = jobResultFiles.urls["trajectory"];
	const [loading, setLoading] = useState<boolean>(true);

	// optimization iteration table
	const rowsPerPage: number = 25;
	const [page, setPage] = useState(0);
	const [iterations, setIterations] = useState<OptimizationIteration[]>([]);
	const [selectedIteration, setSelectedIteration] = useState<OptimizationIteration | null>(null);

	// calculated quantities
	const resultURL = jobResultFiles.urls["result"];
	const [result, setResult] = useState<any | null>(null);

	// accordion
	const [open, setOpen] = useState(true);
	const [accordionOpen, setAccordionOpen] = useState({
		modes: true,
		options: false,
		quantities: false
	});

	useEffect(() => {
		fetchRawFileFromS3Url(resultURL, 'json').then((res) => {
			// console.log(res);
			const workflowKeys = ['geometric optimization', 'molecular orbitals', 'vibrational frequencies'];
			const isWorkflowSchema = Object.keys(res).some(k => workflowKeys.includes(k));
			if (isWorkflowSchema) {
				setResult((res as any)["geometric optimization"])
			} else {
				setResult(res);
			}
		}).catch((err) => {
			setError("Failed to fetch job details or results");
			console.error("Failed to fetch job details or results", err);
		}).finally(() => {
			setLoading(false);
		})

	}, [resultURL]);

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
		if (loading) return;

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
			src: xyzFileUrl,
			serverURL: "https://chemapps.stolaf.edu/jmol/jsmol/php/jsmol.php", // TODO backend to proxy
			script: `
				load "XYZ::${xyzFileUrl}";
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
	}, [xyzFileUrl, viewerObjId, loading]);

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
		<Grid container spacing={2} sx={{width: '100%'}}>
			{ (job.calculation_type !== "standard") && (
				<Grid size={12} sx={{ display: 'flex', flexDirection: 'column' }}>
					<Typography variant="h5" >
						Geometric Optimization Result
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
						{open && (<span>Iteration Structures</span>)}
					</Typography>
				</AccordionSummary>
				<AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
					<TableContainer sx={{ flex: 1 }}>
						<Table>
							<TableHead>
								<TableRow sx={{ bgcolor: blueGrey[50] }}>
									<TableCell>Iteration</TableCell>
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
												cursor: 'pointer',
												backgroundColor: (selectedIteration &&  it === selectedIteration) ? blueGrey[100]:grey[50],
												'&:hover': {
													backgroundColor: blueGrey[50],
												},
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
						onPageChange={(_e, newPage) => setPage(newPage)}
						rowsPerPage={rowsPerPage}
						rowsPerPageOptions={[]}
						showFirstButton
						showLastButton
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
		</Drawer>
	</Grid>
	);
};

export default OptimizationViewer;
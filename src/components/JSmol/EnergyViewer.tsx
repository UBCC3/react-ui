import {Job, JobResult} from "../../types";
import React, {useEffect, useRef, useState} from "react";
import {fetchRawFileFromS3Url} from "./util";
import MolmakerLoading from "../custom/MolmakerLoading";
import {
	Accordion, AccordionDetails,
	AccordionSummary,
	Divider,
	Drawer,
	Grid,
	IconButton,
	Paper,
	Toolbar,
	Typography
} from "@mui/material";
import {CalculateOutlined, ContrastOutlined, ExpandMore, Fullscreen, FullscreenExit} from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import CalculatedQuantities from "./CalculatedQuantities";
import PartialCharge from "./PartialCharge";


const fullWidth = 400;
const miniWidth = 80;

type EnergyViewerProps = {
	job: Job,
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError:   React.Dispatch<React.SetStateAction<string | null>>,
}

const EnergyViewer: React.FC<EnergyViewerProps> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError,
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);
	const [viewerObj, setViewerObj] = useState<any>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const xyzFileUrl = jobResultFiles.urls["mol"];

	// calculated quantities
	const resultURL = jobResultFiles.urls["result"];
	const [result, setResult] = useState<any | null>(null);

	// accordion menu
	const [open, setOpen] = useState(true);
	const [accordionOpen, setAccordionOpen] = useState({
		quantities: true,
		charges: false,
	});

	useEffect(() => {
		const fetchResultJson = async () => {
			try {
				const res = await fetchRawFileFromS3Url(resultURL, 'json');
				setResult(res);
			} catch (err) {
				setError("Failed to fetch job details or results");
				console.error("Failed to fetch job details or results", err);
			} finally {
				setLoading(false);
			}
		}

		fetchResultJson();
	}, [resultURL]);

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
			j2sPath: import.meta.env.J2S_PATH,
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
				quantities: false,
				charges: false,
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
						Molecular Energy Result
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
			</Drawer>
		</Grid>
	);
}

export default EnergyViewer;
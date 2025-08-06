import {
	Box, Chip,
	Grid,
	Tab,
	Tabs,
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {Job, JobResult} from "../../types";
import React, {lazy, Suspense, useEffect, useState} from "react";
import {fetchRawFileFromS3Url} from "./util";
import MolmakerLoading from "../custom/MolmakerLoading";
import {MolmakerPageTitle} from "../custom";

const OptimizationViewer = lazy(() => import('./OptimizationViewer'));
const VibrationViewer = lazy(() => import('./VibrationViewer'));
const OrbitalViewer = lazy(() => import('./OrbitalViewer'));

function a11yProps(index: number) {
	return {
		id: `simple-tab-${index}`,
		'aria-controls': `simple-tabpanel-${index}`,
	};
}

enum ResultTab {
	optimization,
	frequency,
	orbitals,
}

interface StandardAnalysisViewerProp {
	job: Job,
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError:   React.Dispatch<React.SetStateAction<string | null>>,
}

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function CustomTabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;
	const isActive = value === index;

	return (
		<div
			role="tabpanel"
			hidden={!isActive}
			id={`simple-tabpanel-${index}`}
			aria-labelledby={`simple-tab-${index}`}
			{...other}
		>
			{isActive && <Box sx={{ p: 3 }}>{children}</Box>}
		</div>
	);
}

const StandardAnalysisViewer: React.FC<StandardAnalysisViewerProp> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError,
}) => {
	const [loading, setLoading] = useState<boolean>(true);

	// result.json
	const resultURL = jobResultFiles.urls["result"];
	const [result, setResult] = useState<any | null>(null);

	// tabs
	const [currentTab, setCurrentTab] = useState<ResultTab>(ResultTab.optimization);

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

	const handleCurrentTabChange = (event: React.SyntheticEvent, newValue: number) => { setCurrentTab(newValue); };
	const jobStatusIcon = (type: ResultTab): React.ReactElement => {
		if (!result) return (<></>);

		switch (type) {
			case ResultTab.optimization:
				return result["geometric optimization"] === "Error" ?
					<CancelIcon color="error" fontSize={"small"} sx={{ p: 0, m: 0  }} /> :
					<CheckCircleIcon color="success" fontSize={"small"} sx={{ p: 0, m: 0  }} />;
			case ResultTab.orbitals:
				return result["molecular orbitals"] === "Error" ?
					<CancelIcon color="error" fontSize={"small"} sx={{ p: 0, m: 0  }} /> :
					<CheckCircleIcon color="success" fontSize={"small"} sx={{ p: 0, m: 0  }} />;
			case ResultTab.frequency:
				return result["vibrational frequencies"] === "Error" ?
					<CancelIcon color="error" fontSize={"small"} sx={{ p: 0, m: 0  }} /> :
					<CheckCircleIcon color="success" fontSize={"small"} sx={{ p: 0, m: 0  }} />;
		}
	}

	const renderCalculationType = (type: string) => {
		switch (type) {
			case "standard":
				return "Standard Analysis";
			case "optimization":
				return "Geometric Optimization";
			case "frequency":
				return "Vibration Frequency";
			case "orbitals":
				return "Molecular Orbital";
			case "energy":
				return "Molecular Energy";
		}

	}

	if (loading) { return (<MolmakerLoading />); }

	return (
		<Box>
			<Box>
				<MolmakerPageTitle title={job.job_name} subtitle={renderCalculationType(job.calculation_type)} removeBottomPadding={true} />
				{job.tags.map((tag, index) => (
					<Chip
						key={`simple-tab-${index}`}
						label={tag}
						variant="outlined"
					/>
				))}
			</Box>
			<Box sx={{ borderBottom: 1, borderColor: 'divider', m: 0, p: 0 }}>
				<Tabs
					value={currentTab}
					onChange={handleCurrentTabChange}
				>
					<Tab
						icon={jobStatusIcon(ResultTab.optimization)}
						iconPosition="end"
						label="Geometric Optimization"
						{...a11yProps(0)}
						sx={{
							py: 0,
							m: 0,
							textTransform: 'none'
						}}
					/>
					<Tab
						icon={jobStatusIcon(ResultTab.frequency)}
						iconPosition="end"
						label="Vibration Analysis"
						{...a11yProps(1)}
						sx={{
							py: 0,
							m: 0,
							textTransform: 'none'
						}}
					/>
					<Tab
						icon={jobStatusIcon(ResultTab.orbitals)}
						iconPosition="end"
						label="Molecular Orbital"
						{...a11yProps(2)}
						sx={{
							py: 0,
							m: 0,
							textTransform: 'none'
						}}
					/>
				</Tabs>
			</Box>
			<CustomTabPanel value={currentTab} index={ResultTab.optimization}>
				<Suspense fallback={<MolmakerLoading />}>
					<OptimizationViewer
						job={job}
						jobResultFiles={jobResultFiles}
						setError={setError}
						viewerObjId={"JSmolSAOptimizationViewer"}
					/>
				</Suspense>
			</CustomTabPanel>
			<CustomTabPanel value={currentTab} index={ResultTab.frequency}>
				<Suspense fallback={<MolmakerLoading />}>
					<VibrationViewer
						job={job}
						jobResultFiles={jobResultFiles}
						setError={setError}
						viewerObjId={"JSmolSAVibrationViewer"}
					/>
				</Suspense>
			</CustomTabPanel>
			<CustomTabPanel value={currentTab} index={ResultTab.orbitals}>
				<Suspense fallback={<MolmakerLoading />}>
					<OrbitalViewer
						job={job}
						jobResultFiles={jobResultFiles}
						setError={setError}
						viewerObjId={"JSmolSAVibrationViewer"}
					/>
				</Suspense>
			</CustomTabPanel>
		</Box>
	);
}

export default StandardAnalysisViewer;
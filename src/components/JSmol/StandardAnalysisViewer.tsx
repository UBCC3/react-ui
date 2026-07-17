import { Box, Tab, Tabs } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { Job, JobResult } from "../../types";
import React, { useEffect, useState } from "react";
import { fetchRawFileFromS3Url } from "./util";
import MolmakerLoading from "../custom/MolmakerLoading";
import JobResultHeader from "./JobResultHeader";
import OptimizationViewer from "./OptimizationViewer";
import VibrationViewer from "./VibrationViewer";
import OrbitalViewer from "./OrbitalViewer";

/**
 * Generate accessibility props for a Material UI Tab.
 *
 * The returned IDs connect each tab with its corresponding tab panel.
 */
function a11yProps(index: number) {
	return {
		id: `simple-tab-${index}`,
		"aria-controls": `simple-tabpanel-${index}`,
	};
}

/**
 * Standard analysis result tabs.
 *
 * The enum numeric values are used directly by the MUI Tabs component.
 */
enum ResultTab {
	optimization,
	frequency,
	orbitals,
}

/**
 * Props for the StandardAnalysisViewer component.
 */
interface StandardAnalysisViewerProp {
	job: Job;
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Props for a tab panel.
 */
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

/**
 * Renders the content for one tab.
 *
 * The panel is hidden unless its index matches the currently selected tab.
 */
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

/**
 * Displays the full standard analysis result page.
 *
 * A standard analysis contains multiple calculation otuputs, including
 * geometric optimization, vibrational frequency analysis, and molecular
 * orbital analysis. This component fetches the workflow result JSON, displays
 * success/error statuts icons for each calculation step, and renders each
 * detailed viewer inside a tab.
 */
const StandardAnalysisViewer: React.FC<StandardAnalysisViewerProp> = ({
	job,
	jobResultFiles,
	setError,
}) => {
	const [loading, setLoading] = useState<boolean>(true);

	// result.json
	const resultURL = jobResultFiles.urls["result"];
	const [result, setResult] = useState<any | null>(null);

	// tabs
	const [currentTab, setCurrentTab] = useState<ResultTab>(ResultTab.optimization);

	// Fetch the standard analysis result JSON when the result URL changes.
	useEffect(() => {
		fetchRawFileFromS3Url(resultURL, "json")
			.then((res) => {
				console.log(res);
				setResult(res);
			})
			.catch((err) => {
				setError("Failed to fetch job details or results");
				console.error("Failed to fetch job details or results", err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [resultURL]);

	/**
	 * Update the currently selected result tab.
	 */
	const handleCurrentTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setCurrentTab(newValue);
	};

	/**
	 * Return a success or error icon for a standard analysis calculation step.
	 *
	 * The workflow result JSON stores each step under a named key. If a step's
	 * value is `"Error"`, the tab shows an error icon. Otherwise, it shows a
	 * success icon.
	 */
	const jobStatusIcon = (type: ResultTab): React.ReactElement => {
		if (!result) return <></>;

		switch (type) {
			case ResultTab.optimization:
				return result["geometric optimization"] === "Error" ? (
					<CancelIcon color="error" fontSize={"small"} sx={{ p: 0, m: 0 }} />
				) : (
					<CheckCircleIcon color="success" fontSize={"small"} sx={{ p: 0, m: 0 }} />
				);
			case ResultTab.orbitals:
				return result["molecular orbitals"] === "Error" ? (
					<CancelIcon color="error" fontSize={"small"} sx={{ p: 0, m: 0 }} />
				) : (
					<CheckCircleIcon color="success" fontSize={"small"} sx={{ p: 0, m: 0 }} />
				);
			case ResultTab.frequency:
				return result["vibrational frequencies"] === "Error" ? (
					<CancelIcon color="error" fontSize={"small"} sx={{ p: 0, m: 0 }} />
				) : (
					<CheckCircleIcon color="success" fontSize={"small"} sx={{ p: 0, m: 0 }} />
				);
		}
	};

	if (loading) {
		return <MolmakerLoading />;
	}

	return (
		<Box>
			<JobResultHeader job={job} />
			<Box sx={{ borderBottom: 1, borderColor: "divider", m: 0, p: 0 }}>
				<Tabs value={currentTab} onChange={handleCurrentTabChange}>
					<Tab
						icon={jobStatusIcon(ResultTab.optimization)}
						iconPosition="end"
						label="Geometric Optimization"
						{...a11yProps(0)}
						sx={{
							py: 0,
							m: 0,
							textTransform: "none",
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
							textTransform: "none",
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
							textTransform: "none",
						}}
					/>
				</Tabs>
			</Box>
			<CustomTabPanel value={currentTab} index={ResultTab.optimization}>
				<OptimizationViewer
					job={job}
					jobResultFiles={jobResultFiles}
					setError={setError}
					viewerObjId={"JSmolSAOptimizationViewer"}
				/>
			</CustomTabPanel>
			<CustomTabPanel value={currentTab} index={ResultTab.frequency}>
				<VibrationViewer
					job={job}
					jobResultFiles={jobResultFiles}
					setError={setError}
					viewerObjId={"JSmolSAVibrationViewer"}
				/>
			</CustomTabPanel>
			<CustomTabPanel value={currentTab} index={ResultTab.orbitals}>
				<OrbitalViewer
					job={job}
					jobResultFiles={jobResultFiles}
					setError={setError}
					viewerObjId={"JSmolSAVibrationViewer"}
				/>
			</CustomTabPanel>
		</Box>
	);
};

export default StandardAnalysisViewer;

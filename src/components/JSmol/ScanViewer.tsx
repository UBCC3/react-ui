import {
	Alert,
	Box,
	Checkbox,
	Chip,
	FormControlLabel,
	Grid,
	Paper,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	Typography,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { CalculateOutlined, TableChartOutlined } from "@mui/icons-material";
import React, { useEffect, useMemo, useState } from "react";
import { grey } from "@mui/material/colors";
import { Job, JobResult } from "../../types";
import MolmakerLoading from "../custom/MolmakerLoading";
import { useJsmolViewer } from "../../hooks/UseJsmolViewer";
import { useJobResult } from "../../hooks/UseJobResult";
import { useResultDrawer } from "../../hooks/UseResultDrawer";
import { ResultDrawer } from "../results/ResultDrawer";
import { ResultDrawerSection } from "../results/ResultDrawerSection";
import AddStructureToLibrary from "./AddStructureToLibrary";

/**
 * Generate accessibility props for a Material UI Tab.
 */
function a11yProps(index: number) {
	return {
		id: `simple-tab-${index}`,
		"aria-controls": `simple-tabpanel-${index}`,
	};
}

/**
 * Structure viewer and energy-profile graph tabs.
 */
enum viewerTab {
	structure,
	graph,
}

/** One entry from the scan's result.json "points" array. */
interface ScanPoint {
	index: number;
	target_value: number;
	actual_value?: number;
	energy?: number;
	success: boolean;
	error?: string;
}

type ScanViewerProps = {
	job: Job;
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const HARTREE_TO_KCAL = 627.5094740631;

const COORDINATE_LABELS: Record<string, string> = {
	bond: "Bond length (Å)",
	angle: "Angle (°)",
	dihedral: "Dihedral (°)",
};

/**
 * Displays a bond/angle/dihedral scan result viewer.
 *
 * Loads the multi-frame scan trajectory into a JSmol viewer and renders the
 * energy profile as a graph, in the same structure/graph tab layout used by
 * the vibration viewer. Scan points and settings are listed in the persistent
 * right-side drawer; selecting a point switches the displayed structure.
 */
const ScanViewer: React.FC<ScanViewerProps> = ({ jobResultFiles, viewerObjId, setError }) => {
	const xyzFileUrl = jobResultFiles.urls["scan"];
	const resultURL = jobResultFiles.urls["result"];

	const { result, loading } = useJobResult(resultURL, "bond angle scan", setError);

	// structure viewer & graph viewer tab
	const [value, setValue] = useState<viewerTab>(viewerTab.structure);
	const [selectedFrame, setSelectedFrame] = useState<number>(1);

	const [showAtomNumbers, setShowAtomNumbers] = useState<boolean>(false);

	const handleChange = (_event: React.SyntheticEvent, newValue: viewerTab) => {
		setValue(newValue);
	};

	const { viewerRef, viewerObj } = useJsmolViewer({
		viewerObjId,
		src: xyzFileUrl,
		loadScript: `load "XYZ::${xyzFileUrl}";`,
		onReadyScript: `zoom 50; connect auto; set measurementUnits angstroms; set measurementLabels on; set measureAllModels TRUE;`,
		skip: loading || value !== viewerTab.structure,
		cleanupOnChange: true,
	});

	const { open, accordionOpen, toggle, handleAccordionChange } = useResultDrawer({
		points: false,
		settings: false,
	});

	const coordinate: string = result?.coordinate ?? "bond";
	const atoms: number[] = useMemo(() => result?.atoms ?? [], [result]);
	const relax: boolean = result?.relax ?? false;
	const allPoints: ScanPoint[] = useMemo(() => result?.points ?? [], [result]);

	// scan.xyz contains a frame only for points that succeeded, sowo the Nth
	// successful point is JSmol model N+1.
	const successfulPoints = useMemo(() => allPoints.filter((p) => p.success), [allPoints]);
	const failedPoints = useMemo(() => allPoints.filter((p) => !p.success), [allPoints]);

	// Absolute energies differ in the sixth decimal; relative-to-minimum is readable.
	const relativeEnergies = useMemo(() => {
		const energies = successfulPoints.map((p) => p.energy ?? 0);
		if (!energies.length) return [];
		const minimum = Math.min(...energies);
		return energies.map((energy) => (energy - minimum) * HARTREE_TO_KCAL);
	}, [successfulPoints]);

	// Annotate the scanned coordinate once; measureAllModels keeps it visible
	// across every frame.
	useEffect(() => {
		if (!viewerObj || !atoms.length || value !== viewerTab.structure) return;

		const measureTargets = atoms.map((a) => `(atomno=${a})`).join(" ");
		const atomSelection = atoms.map((a) => `atomno=${a}`).join(" or ");

		window.Jmol.script(
			viewerObj,
			`
				measures delete;
				measure ${measureTargets};
				select ${atomSelection};
				halos on;
				select none;
			`,
		);
	}, [viewerObj, atoms, value]);

	// Frame switching only.
	useEffect(() => {
		if (!viewerObj || !successfulPoints.length || value !== viewerTab.structure) return;
		window.Jmol.script(viewerObj, `model ${selectedFrame};`);
	}, [selectedFrame, viewerObj, successfulPoints.length, value]);

	useEffect(() => {
		if (!viewerObj || value !== viewerTab.structure) return;
		window.Jmol.script(
			viewerObj,
			`select all; ${showAtomNumbers ? "label %[atomno]; color labels black; font label 14;" : "label off;"} select none;`,
		);
	}, [viewerObj, showAtomNumbers, value]);

	if (loading) {
		return <MolmakerLoading />;
	}

	if (!successfulPoints.length) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				No scan point completed successfully.
			</Alert>
		);
	}

	const axisLabel = COORDINATE_LABELS[coordinate] ?? "Scan coordinate";

	return (
		<Grid container spacing={2} sx={{ width: "100%" }}>
			<Grid
				sx={{ display: "flex", flexDirection: "column", flex: "1 0 auto", position: "relative" }}
			>
				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs value={value} onChange={handleChange} aria-label="scan viewer tabs">
						<Tab label="Structure Viewer" {...a11yProps(0)} />
						<Tab label="Graph Viewer" {...a11yProps(1)} />
					</Tabs>
				</Box>

				{failedPoints.length > 0 && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						{failedPoints.length} point{failedPoints.length === 1 ? "" : "s"} failed and{" "}
						{failedPoints.length === 1 ? "is" : "are"} not shown:{" "}
						{failedPoints.map((p) => p.target_value).join(", ")}
					</Alert>
				)}

				{value === viewerTab.structure && (
					<>
						<Box sx={{ mt: 2, mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
							<AddStructureToLibrary
								viewerObj={viewerObj}
								viewerRef={viewerRef}
								infoText="The structure for the currently selected scan point is saved to your
								library, not the whole scan."
							/>
							<FormControlLabel
								control={
									<Checkbox
										size="small"
										checked={showAtomNumbers}
										onChange={(e) => setShowAtomNumbers(e.target.checked)}
									/>
								}
								label="Show atom numbers"
							/>
						</Box>
						<Paper
							ref={viewerRef}
							sx={{
								width: "100%",
								aspectRatio: "1 / 1",
								height: "auto",
								boxSizing: "border-box",
								borderRadius: 2,
							}}
							elevation={3}
						/>
					</>
				)}

				{value === viewerTab.graph && (
					<Paper
						sx={{
							width: "100%",
							aspectRatio: "1 / 1",
							height: "auto",
							boxSizing: "border-box",
							borderRadius: 2,
							p: 4,
							mt: 2,
						}}
						elevation={3}
					>
						<LineChart
							height={400}
							xAxis={[
								{
									data: successfulPoints.map((p) => p.actual_value ?? p.target_value),
									label: axisLabel,
								},
							]}
							series={[
								{ data: relativeEnergies, label: "Relative energy (kcal/mol)", showMark: true },
							]}
							onMarkClick={(_event, item) => {
								if (item?.dataIndex != null) {
									setSelectedFrame(item.dataIndex + 1);
									setValue(viewerTab.structure);
								}
							}}
						/>
					</Paper>
				)}
			</Grid>

			<ResultDrawer open={open} onToggle={toggle}>
				<ResultDrawerSection
					open={open}
					expanded={accordionOpen.points}
					onChange={handleAccordionChange("points")}
					icon={<TableChartOutlined />}
					label="Scan Points"
					ariaId="panel1"
					detailsSx={{ bgcolor: "grey.50" }}
				>
					<TableContainer sx={{ flex: 1 }}>
						<Table size="small">
							<TableHead>
								<TableRow sx={{ bgcolor: grey[200] }}>
									<TableCell>Point</TableCell>
									<TableCell>Target</TableCell>
									<TableCell>Actual</TableCell>
									<TableCell>Energy (Eh)</TableCell>
									<TableCell>Rel. (kcal/mol)</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{successfulPoints.map((point, position) => (
									<TableRow
										key={point.index}
										hover
										selected={selectedFrame === position + 1}
										onClick={() => setSelectedFrame(position + 1)}
										sx={{ cursor: "pointer" }}
									>
										<TableCell>{position + 1}</TableCell>
										<TableCell>{point.target_value.toFixed(4)}</TableCell>
										<TableCell>{(point.actual_value ?? point.target_value).toFixed(4)}</TableCell>
										<TableCell>{point.energy?.toFixed(8) ?? "—"}</TableCell>
										<TableCell>{relativeEnergies[position].toFixed(2)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</ResultDrawerSection>

				<ResultDrawerSection
					open={open}
					expanded={accordionOpen.settings}
					onChange={handleAccordionChange("settings")}
					icon={<CalculateOutlined />}
					label="Scan Settings"
					ariaId="panel2"
				>
					<Box display="flex" flexDirection="column" gap={1} sx={{ p: 1 }}>
						<Typography variant="body2">
							<strong>Coordinate:</strong> {coordinate}
						</Typography>
						<Typography variant="body2">
							<strong>Atoms:</strong> {atoms.join(" – ") || "—"}
						</Typography>
						<Box display="flex" alignItems="center" gap={1}>
							<Typography variant="body2">
								<strong>Mode:</strong>
							</Typography>
							<Chip
								size="small"
								label={relax ? "Relaxed" : "Rigid"}
								color={relax ? "primary" : "default"}
							/>
						</Box>
						<Typography variant="body2">
							<strong>Points:</strong> {successfulPoints.length} of {allPoints.length}
						</Typography>
					</Box>
				</ResultDrawerSection>
			</ResultDrawer>
		</Grid>
	);
};

export default ScanViewer;

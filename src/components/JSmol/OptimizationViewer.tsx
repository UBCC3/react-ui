import {
	Grid,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { blueGrey, grey } from "@mui/material/colors";
import { AdjustOutlined, CalculateOutlined } from "@mui/icons-material";
import { Job, JobResult } from "../../types";
import MolmakerLoading from "../custom/MolmakerLoading";
import CalculatedQuantities from "./CalculatedQuantities";
import { useResultDrawer } from "../../hooks/UseResultDrawer";
import { useJsmolViewer } from "../../hooks/UseJsmolViewer";
import { useJobResult } from "../../hooks/UseJobResult";
import { useJobArtifact } from "../../hooks/UseJobArtifact";
import { jmolInlineLoadScript } from "./util";
import { ResultDrawer } from "../results/ResultDrawer";
import { ResultDrawerSection } from "../results/ResultDrawerSection";
import AddStructureToLibrary from "./AddStructureToLibrary";

/**
 * Props for the OptimizationViewer component.
 */
interface VibrationViewerProps {
	job: Job;
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Represents one geometry optimization iteration parsed from the trajectory file.
 */
type OptimizationIteration = {
	index: number;
	energy: number;
};

/**
 * Displays the geometric optimization result viewer.
 *
 * Loads the optimization trajectory into a JSmol viewer, extracts
 * optimization iterations and energies from the loaded models, and displays
 * the trajectory frames in a selectable table alongside calculated quantities.
 */
const OptimizationViewer: React.FC<VibrationViewerProps> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError,
}) => {
	const { result, loading } = useJobResult(
		jobResultFiles.jobId,
		"geometric optimization",
		setError,
	);

	// The trajectory is fetched here and loaded into JSmol inline, because the
	// artifact endpoint requires a bearer token the applet cannot send.
	const { content: trajectoryXyz, loading: trajectoryLoading } = useJobArtifact(
		jobResultFiles.jobId,
		"trajectory",
		setError,
	);

	// optimization iteration table
	const rowsPerPage: number = 25;
	const [page, setPage] = useState(0);
	const [iterations, setIterations] = useState<OptimizationIteration[]>([]);
	const [selectedIteration, setSelectedIteration] = useState<OptimizationIteration | null>(null);

	const { viewerRef, viewerObj } = useJsmolViewer({
		viewerObjId,
		src: "",
		loadScript: trajectoryXyz ? jmolInlineLoadScript("trajectory", trajectoryXyz) : "",
		onReadyScript: `zoom 50; connect auto;`,
		skip: loading || trajectoryLoading || !trajectoryXyz,
		expectedLoadCount: 1,
		onLoadError: setError,
	});

	const { open, accordionOpen, toggle, handleAccordionChange } = useResultDrawer({
		modes: false,
		options: false,
		quantities: false,
	});

	// update the JSmol viewer whenevr the selected optimization iteration changes
	useEffect(() => {
		if (iterations.length === 0 || selectedIteration === null) return;

		window.Jmol.script(
			viewerObj,
			`
            model ${selectedIteration.index};
            reset;
            zoom 50;
        `,
		);
	}, [iterations, selectedIteration]);

	// extract optimization iteration numbers and energies from loaded JSmol models
	useEffect(() => {
		if (!viewerObj) return;

		const models = window.Jmol.getPropertyAsArray(viewerObj, "auxiliaryInfo.models");

		if (!Array.isArray(models)) {
			setIterations([]);
			setSelectedIteration(null);
			setError("The optimization trajectory could not be read by JSmol.");
			return;
		}

		const indexRegExp = /Iteration\s+(\d+)/;
		const energyRegExp = /Energy\s+([+-]?\d+(?:\.\d+)?)/;

		// A model whose name carries neither field is not an optimization step,
		// so skip it instead of asserting the match is non-null.
		const parsedIterations: OptimizationIteration[] = models.flatMap((m: any) => {
			const modelName = String(m?.modelName ?? "");
			const index: RegExpMatchArray | null = modelName.match(indexRegExp);
			const energy: RegExpMatchArray | null = modelName.match(energyRegExp);
			if (!index || !energy) return [];

			return [
				{
					index: parseInt(index[1]) + 1,
					energy: parseFloat(energy[1]),
				},
			];
		});

		if (parsedIterations.length === 0) {
			setIterations([]);
			setSelectedIteration(null);
			setError("The optimization trajectory did not contain readable iteration metadata.");
			return;
		}

		setIterations(parsedIterations);
	}, [viewerObj, setError]);

	if (loading) {
		return <MolmakerLoading />;
	}

	return (
		<Grid container spacing={2} sx={{ width: "100%" }}>
			<Grid sx={{ width: "100%" }}>
				{job.calculation_type === "irc" ? (
					<AddStructureToLibrary
						viewerObj={viewerObj}
						viewerRef={viewerRef}
						infoText="An IRC traces a reaction path. The structure currently shown will be 
                        saved, navigate to a path endpoint (a reactant or product minimum) for a meaningful 
                        structure. Intermediate path points aren't stable geometries and usually need re-optimizing."
					/>
				) : (
					<AddStructureToLibrary
						viewerObj={viewerObj}
						viewerRef={viewerRef}
						onDialogOpen={() => setSelectedIteration(iterations[iterations.length - 1] ?? null)}
						infoText="The final, most optimized geometry is saved to your library, not the 
                        intermediate optimization step you may currently be viewing."
					/>
				)}
			</Grid>
			<Grid
				sx={{ display: "flex", flexDirection: "column", flex: "1 0 auto", position: "relative" }}
			>
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
			</Grid>
			<ResultDrawer open={open} onToggle={toggle}>
				<ResultDrawerSection
					open={open}
					expanded={accordionOpen.modes}
					onChange={handleAccordionChange("modes")}
					icon={<AdjustOutlined />}
					label="Iteration Structures"
					ariaId="panel1"
				>
					<TableContainer sx={{ flex: 1 }}>
						<Table>
							<TableHead>
								<TableRow sx={{ bgcolor: blueGrey[50] }}>
									<TableCell>Iteration</TableCell>
									<TableCell>Energy</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{iterations
									.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
									.map((it: OptimizationIteration) => (
										<TableRow
											key={it.index}
											onClick={() => setSelectedIteration(it)}
											sx={{
												cursor: "pointer",
												backgroundColor:
													selectedIteration && it === selectedIteration ? blueGrey[100] : grey[50],
												"&:hover": { backgroundColor: blueGrey[50] },
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
				</ResultDrawerSection>
				<ResultDrawerSection
					open={open}
					expanded={accordionOpen.quantities}
					onChange={handleAccordionChange("quantities")}
					icon={<CalculateOutlined />}
					label="Calculated Quantities"
					ariaId="panel3"
				>
					{result && <CalculatedQuantities job={job} result={result} />}
				</ResultDrawerSection>
			</ResultDrawer>
		</Grid>
	);
};

export default OptimizationViewer;

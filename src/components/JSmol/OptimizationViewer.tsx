import {
	Divider,
	Grid,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
    Typography
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
import { ResultDrawer } from "../results/ResultDrawer";
import { ResultDrawerSection } from "../results/ResultDrawerSection";

/**
 * Props for the OptimizationViewer component.
 */
interface VibrationViewerProps {
	job: Job,
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
}

/**
 * Displays the geometric optimization result viewer.
 * 
 * Loads the optimization trajectory into a JSmol viewer, extracts
 * optimization iterations and energies from the loaded models, and displays
 * the trajectory frames in a selectable table alongside calculated quantities.
 */
const OptimizationViewer:React.FC<VibrationViewerProps> = ({
    job,
	jobResultFiles,
    viewerObjId,
	setError,
}) => {
	const xyzFileUrl = jobResultFiles.urls["trajectory"];
	const resultURL = jobResultFiles.urls["result"];

    const { result, loading } = useJobResult(resultURL, "geometric optimization", setError);

	// optimization iteration table
    const rowsPerPage: number = 25;
    const [page, setPage] = useState(0);
    const [iterations, setIterations] = useState<OptimizationIteration[]>([]);
    const [selectedIteration, setSelectedIteration] = useState<OptimizationIteration | null>(null);

    const { viewerRef, viewerObj } = useJsmolViewer({
        viewerObjId,
        src: xyzFileUrl,
        loadScript: `load "XYZ::${xyzFileUrl}";`,
        onReadyScript: `zoom 50; connect auto;`,
        skip: loading,
    });

    const { open, accordionOpen, toggle, handleAccordionChange } = useResultDrawer({
        modes: false,
        options: false,
        quantities: false,
    });

    // update the JSmol viewer whenevr the selected optimization iteration changes
	useEffect(() => {
		if (iterations.length === 0 || selectedIteration === null) return;

		window.Jmol.script(viewerObj, `
            model ${selectedIteration.index};
            reset;
            zoom 50;
        `)
	}, [iterations, selectedIteration]);

    // extract optimization iteration numbers and energies from loaded JSmol models
	useEffect(() => {
		if (!viewerObj) return;

		const models = window.Jmol.getPropertyAsArray(viewerObj, "auxiliaryInfo.models");
        const indexRegExp = /Iteration\s+(\d+)/;
        const energyRegExp = /Energy\s+([+-]?\d+(?:\.\d+)?)/;

        const parsedIterations: OptimizationIteration[] = models.map((m: any) => {
            const index: RegExpMatchArray | null = (m.modelName as string).match(indexRegExp);
            const energy: RegExpMatchArray | null = (m.modelName as string).match(energyRegExp);

            return {
                index: parseInt(index![1]) + 1,
                energy: parseFloat(energy![1]),
            };
        });

        setIterations(parsedIterations);
	}, [viewerObj]);

    if (loading) { return (<MolmakerLoading />); }

	return (
		<Grid container spacing={2} sx={{width: '100%'}}>
			{(job.calculation_type !== "standard") && (
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
                        aspectRatio: '1 / 1',
						height: 'auto',
						boxSizing: 'border-box',
						borderRadius: 2
					}}
					elevation={3}
				/>
			</Grid>
			<ResultDrawer open={open} onToggle={toggle}>
                <ResultDrawerSection
                    open={open}
                    expanded={accordionOpen.modes}
                    onChange={handleAccordionChange('modes')}
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
                                                cursor: 'pointer',
                                                backgroundColor: (selectedIteration && it === selectedIteration) ? blueGrey[100] : grey[50],
                                                '&:hover': { backgroundColor: blueGrey[50] },
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

export default OptimizationViewer;
import {Job, JobResult} from "../../types";
import React from "react";
import MolmakerLoading from "../custom/MolmakerLoading";
import { Grid, Paper } from "@mui/material";
import { CalculateOutlined, ContrastOutlined } from "@mui/icons-material";
import CalculatedQuantities from "./CalculatedQuantities";
import PartialCharge from "./PartialCharge";
import { useResultDrawer } from "../../hooks/UseResultDrawer";
import { useJsmolViewer } from "../../hooks/UseJsmolViewer";
import { useJobResult } from "../../hooks/UseJobResult";
import { ResultDrawer } from "../results/ResultDrawer";
import { ResultDrawerSection } from "../results/ResultDrawerSection";

/**
 * Props for the EnergyViewer component.
 */
type EnergyViewerProps = {
	job: Job,
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Displays the molecular energy result viewer.
 * 
 * Loads the molecular structure into a JSmol viewer, fetches the calculation
 * result JSON, and displays result details in a persistent right-side
 * drawer with accordions for calculated quantities and partial charges.
 */
const EnergyViewer: React.FC<EnergyViewerProps> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError,
}) => {
	const xyzFileUrl = jobResultFiles.urls["mol"];
	const resultURL = jobResultFiles.urls["result"];

	const { result, loading } = useJobResult(resultURL, undefined, setError);

    const { viewerRef, viewerObj } = useJsmolViewer({
        viewerObjId,
        src: xyzFileUrl,
        loadScript: `load "XYZ::${xyzFileUrl}";`,
        onReadyScript: `zoom 50; connect auto`,
        skip: loading,
    });

    const { open, accordionOpen, toggle, handleAccordionChange } = useResultDrawer({
        quantities: false,
        charges: false,
    });

    if (loading) { return (<MolmakerLoading />); }

	return (
		<Grid container spacing={2} sx={{width: '100%'}}>
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
                    expanded={accordionOpen.quantities}
                    onChange={handleAccordionChange('quantities')}
                    icon={<CalculateOutlined />}
                    label="Calculated Quantities"
                    ariaId="panel3"
                >
                    {result && <CalculatedQuantities job={job} result={result} />}
                </ResultDrawerSection>
                <ResultDrawerSection
                    open={open}
                    expanded={accordionOpen.charges}
                    onChange={handleAccordionChange('charges')}
                    icon={<ContrastOutlined />}
                    label="Partial Charges"
                    ariaId="panel4"
                    detailsSx={{ bgcolor: 'grey.50' }}
                >
                    <PartialCharge frameNo={2} viewerObj={viewerObj} />
                </ResultDrawerSection>
            </ResultDrawer>
		</Grid>
	);
}

export default EnergyViewer;
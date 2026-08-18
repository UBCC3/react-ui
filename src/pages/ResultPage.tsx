import React from "react";
import { Box } from "@mui/material";
import VibrationViewer from "../components/JSmol/VibrationViewer";
import { useParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import type { Job, JobResult } from "../types";
import { getJobByJobID } from "../services/api";
import MolmakerLoading from "../components/custom/MolmakerLoading";
import NotFound from "./NotFound";
import { MolmakerAlert } from "../components/custom";
import {
	OrbitalViewer,
	OptimizationViewer,
	StandardAnalysisViewer,
	EnergyViewer,
} from "../components/JSmol";
import { DrawerWidthProvider, useDrawerWidth } from "../contexts/DrawerWidthContext";
import JobResultHeader from "../components/JSmol/JobResultHeader";

const ResultPage = () => {
	// reads the job ID from the current route parameters
	const { jobId } = useParams<{ jobId: string }>();
	const { getAccessTokenSilently } = useAuth0();

	// state for user experience
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// stores the selected job details returned from the backend.
	const [job, setJob] = useState<Job | null>(null);
	// stores presigned S3 URLs for the selected job's result files.
	const [jobResultFiles, setJobResultFiles] = useState<JobResult | null>(null);

	// Fetches the selected job and its result files when the page loads.
	useEffect(() => {
		// Stop early if the route does not include a job ID.
		if (!jobId) {
			setError("Job ID is required");
			setLoading(false);
			return;
		}

		const fetchJobAndFiles = async () => {
			setLoading(true);
			try {
				const token = await getAccessTokenSilently();

				// Fetch the job details using the job ID from the URL.
				const response = await getJobByJobID(jobId as string, token);

				if (response.error) {
					setError(response.error);
					setLoading(false);
					return;
				}

				// Store the job data so the correct viewer can be selected.
				const jobData = response.data;
				setJob(jobData);

				// Viewers fetch results and artifacts themselves by job ID, so this
				// only has to describe which job they are looking at. No extra
				// request is needed now that there are no presigned URLs to collect.
				if (jobData.status === "completed") {
					setJobResultFiles({
						jobId: jobData.job_id,
						calculation: jobData.calculation_type,
						status: jobData.status,
					});
				}
			} catch (err) {
				setError("Failed to fetch job files");
				console.error("Failed to fetch job files", err);
			} finally {
				setLoading(false);
			}
		};

		fetchJobAndFiles();
	}, [jobId]);

	// Show a loading screen while the job details and result file URLs are being fetched
	if (loading) {
		return <MolmakerLoading />;
	}

	// Show a not-found page if the job could not bea loaded.
	if (!job) {
		return <NotFound subject="Job" />;
	}

	return (
		<DrawerWidthProvider>
			<ResultPageContent
				job={job}
				error={error}
				jobResultFiles={jobResultFiles}
				setError={setError}
			/>
		</DrawerWidthProvider>
	);
};

const ResultPageContent = ({
	job,
	error,
	jobResultFiles,
	setError,
}: {
	job: Job;
	error: string | null;
	jobResultFiles: JobResult | null;
	setError: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
	const { drawerWidth } = useDrawerWidth();
	return (
		<Box bgcolor="rgb(247, 249, 252)" sx={{ p: 4 }}>
			{/* Display a page-level error alert if fetching or rendering fails. */}
			{error && (
				<MolmakerAlert
					text={error}
					severity="error"
					outline="error"
					sx={{ mb: 4, mr: `${drawerWidth}px` }}
				/>
			)}

			{/* Render the energy analysis viewer for energy calculation jobs. */}
			{job && job.calculation_type === "energy" && (
				<>
					<JobResultHeader job={job} />
					<EnergyViewer
						job={job}
						jobResultFiles={jobResultFiles!}
						viewerObjId={"JSmolApplet1"}
						setError={setError}
					/>
				</>
			)}

			{/* Render the vibration viewer for frequency calculation jobs. */}
			{job && job.calculation_type === "frequency" && (
				<>
					<JobResultHeader job={job} />
					<VibrationViewer
						job={job}
						jobResultFiles={jobResultFiles!}
						viewerObjId={"JSmolApplet1"}
						setError={setError}
					/>
				</>
			)}

			{/* Render the orbital viewer for molecular orbital calculation jobs. */}
			{job && job.calculation_type === "orbitals" && (
				<>
					<JobResultHeader job={job} />
					<OrbitalViewer
						job={job}
						jobResultFiles={jobResultFiles!}
						viewerObjId={"JSmolOrbitalViewer"}
						setError={setError}
					/>
				</>
			)}

			{/* Render the optimization-style viewer for optimization, transition state, and IRC jobs. */}
			{job &&
				(job.calculation_type === "optimization" ||
					job.calculation_type === "transition" ||
					job.calculation_type === "irc") && (
					<>
						<JobResultHeader job={job} />
						<OptimizationViewer
							job={job}
							jobResultFiles={jobResultFiles!}
							viewerObjId={"JSmolOptimizationViewer"}
							setError={setError}
						/>
					</>
				)}

			{/* Render the standard analysis viewer for standard calculation jobs. */}
			{job && job.calculation_type === "standard" && (
				<StandardAnalysisViewer
					job={job}
					jobResultFiles={jobResultFiles!}
					viewerObjId={"JSmolStandardAnalysisViewer"}
					setError={setError}
				/>
			)}
		</Box>
	);
};

export default ResultPage;

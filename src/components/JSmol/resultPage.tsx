import {Box} from "@mui/material";
import VibrationViewer from "./VibrationViewer";
import {useParams} from "react-router-dom";
import {useAuth0} from "@auth0/auth0-react";
import {useEffect, useState} from "react";
import type {Job, JobResult} from "../../types";
import {fetchJobResultFiles, getJobByJobID} from "../../services/api";
import MolmakerLoading from "../custom/MolmakerLoading";
import NotFound from "../../pages/NotFound";
import {MolmakerAlert} from "../custom";
import {OrbitalViewer} from "./index";

const ResultPage = () => {
	const { jobId } = useParams<{ jobId: string }>();
	const { getAccessTokenSilently } = useAuth0();

	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const [job, setJob] = useState<Job | null>(null);
	const [jobResultFiles, setJobResultFiles] = useState<JobResult | null>(null);

	useEffect(() => {
		if (!jobId) {
			setError("Job ID is required");
			setLoading(false);
			return;
		}

		const fetchJobAndFiles = async () => {
			setLoading(true);
			try {
				const token = await getAccessTokenSilently();
				const response = await getJobByJobID(jobId as string, token);
				if (response.error) {
					setError(response.error);
					setLoading(false);
					return;
				}
				const jobData = response.data;
				setJob(jobData);

				// request S3 presign url to result files
				let jobResultFiles: JobResult | null = null;
				if (jobData.status === 'completed') {
					const jobFilesUrlsResp = await fetchJobResultFiles(
						token,
						jobId as string,
						jobData.calculation_type,
						jobData.status
					);
					jobResultFiles = {
						jobId: jobFilesUrlsResp.data.job_id,
						calculation: jobFilesUrlsResp.data.calculation,
						status: jobFilesUrlsResp.data.status,
						urls: jobFilesUrlsResp.data.urls
					}
					console.log(jobResultFiles);
					setJobResultFiles(jobResultFiles);
				}
			} catch (err) {
				setError("Failed to fetch job files");
				console.error("Failed to fetch job files", err);
			} finally {
				setLoading(false);
			}
		}

		fetchJobAndFiles();
	}, [jobId]);

	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

	if (!job) {
		return (
			<NotFound subject="Job" />
		);
	}

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			{error && (
				<MolmakerAlert
					text={error}
					severity="error"
					outline="error"
					sx={{ mb: 4 }}
				/>
			)}
			{(job && job.calculation_type === "frequency") && (
				<VibrationViewer
					job={job}
					jobResultFiles={jobResultFiles!}
					viewerObjId={"JSmolApplet1"}
					setError={setError}
				/>
			)}
			{(job && job.calculation_type === "orbitals") && (
				<OrbitalViewer
					job={job}
					jobResultFiles={jobResultFiles!}
					viewerObjId={"JSmolOrbitalViewer"}
				/>
			)}
		</Box>
	)
}

export default ResultPage;
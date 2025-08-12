import Job from "../types/Job";
import {fetchJobResultFiles, getJobByJobID} from "../services/api";
import {useState, useEffect} from "react";
import type {JobResult} from "../types";
import {useParams} from "react-router-dom";
import {MolmakerAlert, MolmakerLoading, MolmakerPageTitle, MolmakerTextField} from "../components/custom";
import NotFound from "./NotFound";
import {JobError} from "../types/JSmol";
import {fetchRawFileFromS3Url} from "../components/JSmol/util";
import {Box, Grid, Paper} from "@mui/material";
import {useAuth0} from "@auth0/auth0-react";


function JobFail() {
	const { jobId } = useParams<{ jobId: string }>();
	const { getAccessTokenSilently } = useAuth0();

	// state for user experience
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// state for job details
	const [job, setJob] = useState<Job| null>(null);
	const [jobResultFiles, setJobResultFiles] = useState<JobResult | null>(null);
	const [resultErrExist, setResultErrExists] = useState<boolean>(false);
	const [jobError, setJobError] = useState<JobError | null>(null);

	useEffect(() => {
		if (!jobId) {
			setError("Job ID is required");
			setLoading(false);
			return;
		}

		const fetchJobAndError = async () => {
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

				const jobFilesUrlsResp = await fetchJobResultFiles(
					token,
					jobId as string,
					jobData.calculation_type,
					jobData.status
				);

				let jobResultFiles: JobResult | null = null;
				if (jobFilesUrlsResp) {
					if (jobFilesUrlsResp.error) {
						setError(jobFilesUrlsResp.error);
					} else if (jobFilesUrlsResp.data) {
						jobResultFiles = {
							jobId: jobFilesUrlsResp.data.job_id,
							calculation: jobFilesUrlsResp.data.calculation,
							status: jobFilesUrlsResp.data.status,
							urls: jobFilesUrlsResp.data.urls
						}
						// console.log(jobResultFiles);
						setJobResultFiles(jobResultFiles);
					}
				}
			} catch (err) {
				setError("Failed to fetch job files");
				console.error("Failed to fetch job files", err);
			} finally {
				setLoading(false);
			}
		}

		fetchJobAndError();
	}, [jobId])

	useEffect(() => {
		if (!jobResultFiles) return;

		const fetchErrorFile = async () => {
			setLoading(true);
			try {
				const error: any = await fetchRawFileFromS3Url(
					jobResultFiles.urls["error"],
					'json'
				);
				// console.log(error);

				if (error.error) {
					setJobError((error as JobError));
					console.log("Error:", error as JobError);
					setResultErrExists(true);
				}
			} catch (err) {
				setError("Failed to fetch result.err");
				console.error("Failed to fetch result.err", err);
			} finally {
				setLoading(false);
			}
		}

		fetchErrorFile();
	}, [jobResultFiles])

	if (loading) return <MolmakerLoading />;
	if (!job) return <NotFound subject="Job" />;

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
			<MolmakerPageTitle
				title="Job Failed"
				subtitle={job.job_id}
			/>
			<Grid container spacing={3}>
				<Grid size={12}>
					<Paper elevation={3} sx={{ padding: 4 }}>
						<Box component="form">
							<Grid container direction={{ xs: 'column', sm: 'row' }} spacing={2}>
								<Grid size={{ xs: 12, md: 6 }}>
									<MolmakerTextField
										fullWidth
										label="Job name"
										value={job.job_name}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>
								</Grid>
								<Grid size={{ xs: 12, md: 6 }}>
									<MolmakerTextField
										fullWidth
										label="Status"
										value={job.status}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>
								</Grid>
							</Grid>
							<Grid size={12}>
								<MolmakerTextField
									fullWidth
									label="Structures"
									value={job.structures.map((structure) => structure.name).join(', ')}
									onChange={() => {}}
									sx={{ mb: 2 }}
									slotProps={{
										input: {
											readOnly: true,
										},
									}}
								/>
							</Grid>
							<Grid container direction={{ xs: 'column', md: 'row' }} spacing={2}>
								<Grid size={{ xs: 12, md: 4 }}>
									<MolmakerTextField
										fullWidth
										label="Calculation"
										value={job.calculation_type}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>
								</Grid>
								<Grid size={{ xs: 12, md: 4 }}>
									<MolmakerTextField
										fullWidth
										label="Method"
										value={job.method}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>
								</Grid>
								<Grid size={{ xs: 12, md: 4 }}>
									<MolmakerTextField
										fullWidth
										label="Basis Set"
										value={job.basis_set}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>
								</Grid>
							</Grid>
							{(resultErrExist) ? (
								<Grid size={12}>
									<MolmakerTextField
										fullWidth
										label="Error Type"
										value={jobError?.error?.error_type || 'No result available'}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>
									<MolmakerTextField
										fullWidth
										label="Error Message"
										value={jobError?.error?.error_message || 'No result available'}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
										multiline
										rows={10}
									/>
								</Grid>
							): (
								<Grid size={12}>
									<MolmakerTextField
										fullWidth
										label="Error Type"
										value={'Result.err file not found!'}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>
									<MolmakerTextField
										fullWidth
										label="Error Message"
										value={'Please check output.log file in downloaded job archive.'}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
										multiline
										rows={10}
									/>
								</Grid>
							)}
						</Box>
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
}

export default JobFail;
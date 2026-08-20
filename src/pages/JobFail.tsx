import Job from "../types/Job";
import { fetchJobResult, getJobByJobID } from "../services/api";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
	MolmakerAlert,
	MolmakerLoading,
	MolmakerPageTitle,
	MolmakerTextField,
} from "../components/custom";
import NotFound from "./NotFound";
import { JobError } from "../types/JSmol";
import { Box, Grid, Paper } from "@mui/material";
import { useAuth0 } from "@auth0/auth0-react";
import { hasNoStoredArtifacts, reverseMapping } from "../utils";
import { calculationTypes, failureReasonLabels } from "../constants";

function JobFail() {
	// Reads the job ID from the URL rout parameters.
	const { jobId } = useParams<{ jobId: string }>();
	const { getAccessTokenSilently } = useAuth0();

	// state for user experience
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// state for job details
	const [job, setJob] = useState<Job | null>(null);
	const [resultErrExist, setResultErrExists] = useState<boolean>(false);
	const [jobError, setJobError] = useState<JobError | null>(null);

	// Fetches the selected job details and its result file URLs when the page loads.
	useEffect(() => {
		// Stop early if the route does not include a job ID>
		if (!jobId) {
			setError("Job ID is required");
			setLoading(false);
			return;
		}

		const fetchJobAndError = async () => {
			setLoading(true);
			try {
				const token = await getAccessTokenSilently();

				// Fetch the main job details using the job ID from the URL.
				const response = await getJobByJobID(jobId as string, token);
				if (response.error) {
					setError(response.error);
					setLoading(false);
					return;
				}

				// Store the job data so it can be displayed in the form.
				setJob(response.data ?? null);

				// The stored result carries the error object itself, so there is no
				// separate result.err file to fetch afterwards. Plenty of failures
				// legitimately have nothing stored, though: a job that never reached
				// the cluster, or never finished uploading, has no JobResult row and
				// the endpoint answers 409. That is not an error to show the user,
				// because the page's own failure_reason and failure_message already
				// explain what happened.
				if (hasNoStoredArtifacts(response.data)) return;

				const resultResponse = await fetchJobResult(jobId as string, token);
				if (resultResponse.status === 409) return;
				if (resultResponse.error) {
					setError(resultResponse.error);
					return;
				}

				const storedError = resultResponse.data?.error;
				if (storedError?.error) {
					setJobError(storedError as JobError);
					setResultErrExists(true);
				}
			} catch (err) {
				setError("Failed to fetch job details");
				console.error("Failed to fetch job details", err);
			} finally {
				setLoading(false);
			}
		};

		fetchJobAndError();
	}, [jobId]);

	// Show a loading screen while job details or error files are being fetched.
	if (loading) return <MolmakerLoading />;

	// Show a not-found page if the job could not be loaded.
	if (!job) return <NotFound subject="Job" />;

	// Reverse the calculation types mapping
	const reversedCalculationTypes = reverseMapping(calculationTypes);

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			{/* Display a page-level error alert if any fetch or parsing step fails. */}
			{error && <MolmakerAlert text={error} severity="error" outline="error" sx={{ mb: 4 }} />}

			{/* Page title showing that this job failed and displaying its job ID. */}
			<MolmakerPageTitle title="Job Failed" subtitle={job.job_id} />

			<Grid container spacing={3}>
				<Grid size={12}>
					<Paper elevation={3} sx={{ padding: 4 }}>
						{/* Read-only form displaying job metadata and failure details. */}
						<Box component="form">
							<Grid container direction={{ xs: "column", sm: "row" }} spacing={2}>
								{/* Job name field. */}
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

								{/* Job status field. */}
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

							{/* Displays all structures associated with this job as a comma-separated list. */}
							<Grid size={12}>
								<MolmakerTextField
									fullWidth
									label="Library Structure"
									value={job.structures.map((structure) => structure.name).join(", ")}
									onChange={() => {}}
									sx={{ mb: 2 }}
									slotProps={{
										input: {
											readOnly: true,
										},
									}}
								/>
							</Grid>

							<Grid container direction={{ xs: "column", md: "row" }} spacing={2}>
								{/* Calculation type field. */}
								<Grid size={{ xs: 12, md: 4 }}>
									<MolmakerTextField
										fullWidth
										label="Calculation"
										value={reversedCalculationTypes[job.calculation_type]}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>
								</Grid>

								{/* Computational method field. */}
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

								{/* Basis set field. */}
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

							{/* Backend-recorded failure, available even when result.err does not exist. */}
							{job.failure_reason && (
								<Grid size={12}>
									<MolmakerAlert
										text={`${failureReasonLabels[job.failure_reason] ?? job.failure_reason}${
											job.failure_message ? `: ${job.failure_message}` : ""
										}`}
										severity="error"
										outline="error"
										sx={{ mb: 3 }}
									/>
								</Grid>
							)}

							{/* Show parsed result.err details when the error file exists. */}
							{resultErrExist ? (
								<Grid size={12}>
									{/* Displays the parsed error type from result.err. */}
									<MolmakerTextField
										fullWidth
										label="Error Type"
										value={jobError?.error?.error_type || "No result available"}
										onChange={() => {}}
										sx={{ mb: 2 }}
										slotProps={{
											input: {
												readOnly: true,
											},
										}}
									/>

									{/* Displays the parsed error message from result.err. */}
									<MolmakerTextField
										fullWidth
										label="Error Message"
										value={jobError?.error?.error_message || "No result available"}
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
							) : (
								// Fallback message shown when result.err is unavailable.
								<Grid size={12}>
									<MolmakerTextField
										fullWidth
										label="Error Type"
										value={
											job.failure_reason
												? "The job failed before producing a result file."
												: "Result.err file not found!"
										}
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
										value={"Please check output.log file in downloaded job archive."}
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

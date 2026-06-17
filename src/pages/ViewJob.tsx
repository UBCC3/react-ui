import { useEffect, useState } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import {
	Box,
	Paper,
	Grid,
} from '@mui/material';
import { fetchJobError, fetchJobResults, getJobByJobID } from '../services/api';
import { MolmakerPageTitle, MolmakerTextField, MolmakerAlert } from '../components/custom';
import MolmakerLoading from '../components/custom/MolmakerLoading';
import NotFound from './NotFound';
import type { Job } from '../types';
import { reverseMapping } from '../utils';
import { calculationTypes } from '../constants';

function ViewJob() {
    // React Router hook used to redirect the user to result or failure pages.
	const navigate = useNavigate();
    const { getAccessTokenSilently } = useAuth0();

    // Reads the job ID from the current route parameters.
	const { jobId } = useParams<{ jobId: string }>();

	// state for user experience
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// state for job details
	const [job, setJob] = useState<Job | null>(null);

    // Fetches the selected job and redirects based on its status.
  	useEffect(() => {
        // Stop early if the route does not include a job ID.
		if (!jobId) {
			setError("Job ID is required");
			setLoading(false);
			return;
		}

		const fetchJobAndResult = async () => {
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

                // Store the job daata so the details can be displayed if no redirect happens.
				const jobData = response.data;
				setJob(jobData);

				// Fetch result or error only based on job status
				let resultResponse: { data?: any; error?: string } | null = null;

                // Completed jobs are redirected to the result viewer page.
				if (jobData.status === 'completed') {
					navigate(`/result/${jobData.job_id}`);
				}
                // Failed jobs are redirected to the failure details page.
				else if (jobData.status === "failed") {
					navigate(`/fail/${jobData.job_id}`);
				}
                // Error jobs can fetch error details directly.
				else if (jobData.status === 'error' || jobData.status === 'failed') {
					resultResponse = await fetchJobError(jobId as string, token);
				}

                // If extra result or error data was fetched, attach it to the current job state.
				if (resultResponse) {
					if (resultResponse.error) {
						setError(resultResponse.error);
					} else if (resultResponse.data) {
						setJob((prevJob) => prevJob ? { ...prevJob, result: resultResponse!.data } : prevJob);
					}
				}
			} catch (err) {
				setError("Failed to fetch job details or results");
				console.error("Failed to fetch job details or results", err);
			} finally {
				setLoading(false);
			}
		};

		fetchJobAndResult();
	}, [jobId]);

    // Show a loading screen while the job details are being fetched.
	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

    // Show a not-found page if the job could not be loaded.
	if (!job) {
		return (
			<NotFound subject="Job" />
		);
	}

    // Reverse the calculation types mapping
    const reversedCalculationTypes = reverseMapping(calculationTypes)

  	return (
		<Box bgcolor={'rgb(247, 249, 252)'} p={4}>
			{/* Error message */}
			{error && (
				<MolmakerAlert
					text={error}
					severity="error"
					outline="error"
					sx={{ mb: 4 }}
				/>
			)}

            {/* Page title showing the selected job ID. */}
			<MolmakerPageTitle
				title="Job Details"
				subtitle={job.job_id}
			/>

	  		<Grid container spacing={3}>
                <Grid size={12}>
                    <Paper elevation={3} sx={{ padding: 4 }}>
                        {/* Read-only form displaying the selected job's metadata */}
                        <Box component="form">
							<Grid container direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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

                            {/* Display all structures associated with this job. */}
							<Grid size={12}>
								<MolmakerTextField
									fullWidth
									label="Library Structure"
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

                            {/* Displays any fetched result or error data as formatted JSON. */}
							<Grid size={12}>
								<MolmakerTextField
									fullWidth
									label="Result"
									value={JSON.stringify(job.result, null, 2) || 'No result available'}
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
						</Box>
					</Paper>
				</Grid>
			</Grid>
		</Box>
  	);
}

export default ViewJob;

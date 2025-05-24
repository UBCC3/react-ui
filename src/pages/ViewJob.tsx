import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import {
	Box,
	Paper,
	Grid,
} from '@mui/material';
import { getJobByJobID } from '../services/api';
import { MolmakerPageTitle, MolmakerTextField, MolmakerAlert } from '../components/custom';
import MolmakerLoading from '../components/custom/MolmakerLoading';
import NotFound from './NotFound';
import type { Job } from '../types';

function ViewJob() {
	const { jobId } = useParams<{ jobId: string }>();
  	const { getAccessTokenSilently } = useAuth0();

	// state for user experience
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// state for job details
	const [job, setJob] = useState<Job | null>(null);

  	useEffect(() => {
		const loadJob = async () => {
			try {
				const token = await getAccessTokenSilently();
				const res = await getJobByJobID(jobId as string, token);
				setJob(res);
			} catch (err) {
				setError("Failed to fetch job details");
				console.error("Failed to fetch job details", err);
			} finally {
				setLoading(false);
			}
		};

		if (!jobId) {
			setLoading(false);
			return;
		}
		setLoading(true);
		loadJob();
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
			<MolmakerPageTitle
				title="Job Details"
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
							<Grid size={12}>
								<MolmakerTextField
									fullWidth
									label="Result"
									value={job.status === 'completed' ?
										JSON.stringify(job.result, null, 2) :
										job.status === 'pending' ? 'Pending' : 'Error'
									}
									onChange={() => {}}
									sx={{ mb: 2 }}
									slotProps={{
										input: {
											readOnly: true,
										},
									}}
									multiline
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

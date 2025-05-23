import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import {
	Box,
	Paper,
	Grid,
} from '@mui/material';
import { fetchJob } from '../services/api';
import MolmakerPageTitle from '../MolmakerFormComponents/MolmakerPageTitle';
import { MolmakerTextField } from '../MolmakerFormComponents';
import MolmakerAlert from '../MolmakerFormComponents/MolmakerAlert';
import MolmakerLoading from '../MolmakerFormComponents/MolmakerLoading';

function ViewJob() {
  	const { getAccessTokenSilently } = useAuth0();

	const { jobId } = useParams();

	type Structure = {
		name: string;
		// TODO: add other properties
	};

	type Job = {
		job_id: string;
		job_name: string;
		status: string;
		structures: Structure[];
		calculation_type: string;
		method: string;
		basis_set: string;
		result: any;
		// TODO: add other properties
	};

	const [job, setJob] = useState<Job | null>(null);
	const [loading, setLoading] = useState(true);

  	useEffect(() => {
		const loadJob = async () => {
			try {
				const token = await getAccessTokenSilently();
				const res = await fetchJob(jobId, token);
				setJob(res);
			} catch (err) {
				console.error("Failed to fetch job details", err);
			} finally {
				setLoading(false);
			}
		};
		loadJob();
	}, [jobId]);

	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

	if (!job) {
		return (
			<MolmakerAlert
				text="Job not found. Please check the job ID and try again."
				severity="error"
				outline="error"
			/>
		);
	}

  	return (
		<Box bgcolor={'rgb(247, 249, 252)'} p={4}>
			<MolmakerPageTitle
				title="Job Details"
				subtitle={job.job_id}
			/>
	  		<Grid container spacing={3}>
                <Grid size={12}>
                    <Paper elevation={3} sx={{ padding: 4 }}>
                        <Box component="form">
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
						</Box>
					</Paper>
				</Grid>
			</Grid>
		</Box>
  	);
}

export default ViewJob;

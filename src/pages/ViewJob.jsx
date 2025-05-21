// ViewJob.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import {
	Box,
	Typography,
	Paper,
	CircularProgress,
	Divider,
	TextField,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { fetchJob } from '../services/api';

function ViewJob() {
  	const { getAccessTokenSilently } = useAuth0();

  	const { jobId } = useParams();
  	const [job, setJob] = useState(null);
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
			<Box display="flex" justifyContent="center" bgcolor={'rgb(247, 249, 252)'} p={4}>
				<CircularProgress />
			</Box>
		);
	}

	if (!job) {
		return <Typography mt={4}>Job not found</Typography>;
	}

  	return (
		<Box bgcolor={'rgb(247, 249, 252)'} p={4}>
	  		<Paper elevation={3}>
				<Typography variant="h6" gutterBottom color='text.secondary' sx={{ paddingX: 4, paddingTop: 4 }}>
					<VisibilityIcon fontSize="large" sx={{ verticalAlign: 'bottom', marginRight: 2 }} />
					Result {job.job_id}
				</Typography>
				<Divider sx={{ mb: 2 }} />
				<Box sx={{ paddingX: 4, paddingBottom: 4 }}>
					<TextField
						fullWidth
						label="Job name"
						value={job.job_name}
						variant="filled"
						sx={{ mb: 2 }}
						slotProps={{
						input: {
							readOnly: true,
						},
						}}
					/>
					<TextField
						fullWidth
						label="Status"
						value={job.status}
						variant="filled"
						sx={{ mb: 2 }}
						slotProps={{
						input: {
							readOnly: true,
						},
						}}
					/>
					<TextField
						fullWidth
						label="structures"
						value={job.structures.map((structure) => structure.name).join(', ')}
						variant="filled"
						sx={{ mb: 2 }}
						slotProps={{
						input: {
							readOnly: true,
						},
						}}
					/>
					<TextField
						fullWidth
						label="Calculation"
						value={job.calculation_type}
						variant="filled"
						sx={{ mb: 2 }}
						slotProps={{
						input: {
							readOnly: true,
						},
						}}
					/>
					<TextField
						fullWidth
						label="Method"
						value={job.method}
						variant="filled"
						sx={{ mb: 2 }}
						slotProps={{
						input: {
							readOnly: true,
						},
						}}
					/>
					<TextField
						fullWidth
						label="Basis Set"
						value={job.basis_set}
						variant="filled"
						sx={{ mb: 2 }}
						slotProps={{
						input: {
							readOnly: true,
						},
						}}
					/>
					<TextField
						fullWidth
						label="Result"
						value={job.status === 'completed' ? JSON.stringify(job.result, null, 2) :
						job.status === 'pending' ? 'Pending' : 'Error'
						}
						variant="filled"
						slotProps={{
						input: {
							readOnly: true,
						},
						}}
						multiline
						maxRows={5}
					/>
				</Box>
	  		</Paper>
		</Box>
  	);
}

export default ViewJob;

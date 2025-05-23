import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
	Box,
	Paper,
	Divider,
	Grid,
	CircularProgress,
	Button,
	Tooltip,
	IconButton
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
import { addjob, fetchStructures, submitStructure } from '../../services/api';
import {
    MolmakerTextField,
    MolmakerDropdown,
    MolmakerMoleculeSelector,
	MolmakerSectionHeader,
	MolmakerMoleculePreview
} from '../../MolmakerFormComponents'
import { multiplicityOptions } from '../../constants';
import MolmakerPageTitle from '../../MolmakerFormComponents/MolmakerPageTitle';

export default function StandardAnalysis() {
	const navigate = useNavigate();
	const { getAccessTokenSilently } = useAuth0();

	// form state
	const [jobName, setJobName] = useState('');
	const [source, setSource] = useState('upload');
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [uploadStructure, setUploadStructure] = useState(false);
	const [moleculeName, setMoleculeName] = useState('');

	const [file, setFile] = useState(null);
	const [selectedStructure, setSelectedStructure] = useState('');
	const [molData, setMolData] = useState('');
	const [molFormat, setMolFormat] = useState('xyz');

	const [charge, setCharge] = useState(0);
	const [multiplicity, setMultiplicity] = useState(1);

	// library state
	const [structures, setStructures] = useState([]);
	const [loadingStructures, setLoadingStructures] = useState(true);

	// fetch library
	useEffect(() => {
		(async () => {
			try {
				const token = await getAccessTokenSilently();
				let res = await fetchStructures(token);
				res = [{ structure_id: '', name: 'Select a molecule' }, ...res];
				setStructures(res);
			} catch (err) {
				console.error('Failed to fetch library', err);
			} finally {
				setLoadingStructures(false);
			}
		})();
	}, [getAccessTokenSilently]);

	const handleSourceChange = (newVal) => {
		setSource(newVal);
		setSubmitAttempted(false);
		setMolData('');

		if (newVal === 'upload') {
			setSelectedStructure('');
		} else {
			setFile(null);
			setUploadStructure(false);
		}
	};

	const handleFileChange = async (text, f) => {
		setFile(f);
		setSelectedStructure('');
		setMolData(text);
		const ext = f.name.split('.').pop().toLowerCase();
		setMolFormat(ext === 'pdb' ? 'pdb' : 'xyz');
	};

	const handleLibrarySelect = async (id) => {
		setSelectedStructure(id);
		setFile(null);
		setUploadStructure(false);
		setMolData('');

		if (!id) return;

		try {
			const token = await getAccessTokenSilently();
			const pres = await fetch(
				`${import.meta.env.VITE_STORAGE_API_URL}/presigned/${id}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			const { url } = await pres.json();
			const fileRes = await fetch(url);
			const xyz = await fileRes.text();
			setMolData(xyz);
			setMolFormat('xyz');
		} catch (err) {
			console.error('Failed to load structure', err);
		}
	};

  	const handleSubmitJob = async (e) => {
		e.preventDefault();
		setSubmitAttempted(true);
		
		let structureIdToUse = selectedStructure;
		let uploadFile = file;

		if (source === 'upload' && !uploadFile) return;
		if (source === 'library' && !structureIdToUse) return;

		if (source === 'library') {
			const blob = new Blob([molData], { type: 'text/plain' });
			uploadFile = new File([blob], `${structureIdToUse}.${molFormat}`, {
				type: 'text/plain'
			});
		}

    	if (!uploadFile) return;

		const formData = new FormData();
		formData.append('file', uploadFile);
		formData.append('job_name', jobName);
		formData.append('charge', charge);
		formData.append('multiplicity', multiplicity);

		try {
			const token = await getAccessTokenSilently();
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/upload_submit`,
				{
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: formData
				}
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const { job_id, slurm_id } = data;
			if (!job_id || !slurm_id) throw new Error('Invalid response');

			if (uploadStructure && source === 'upload') {
				const resStruct = await submitStructure(
					uploadFile,
					moleculeName,
					token
				);
				if (resStruct.status === 200) {
					structureIdToUse = resStruct.data.structure_id;
				}
			}

			const res2 = await addjob(
				jobName,
				uploadFile,
				structureIdToUse,
				slurm_id,
				token
			);
			if (!res2) throw new Error('Failed to add job');
			navigate('/');
		} catch (err) {
			console.error('Submit failed:', err);
		}
	};

	if (loadingStructures) {
		return (
			<Box
				display="flex"
				justifyContent="center"
				bgcolor="rgb(247, 249, 252)"
				p={4}
			>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			<MolmakerPageTitle
				title="Standard Analysis"
				subtitle="Submit a job for standard analysis"
			/>
      		<Grid container spacing={3}>
				<Grid item size={{ xs: 12, md: 6 }}>
          			<Paper elevation={3} sx={{ p: 4 }}>
            			<Box component="form" onSubmit={handleSubmitJob}>
							<Grid container direction="column" spacing={2}>
								<Grid item>
									<MolmakerSectionHeader text="Required fields are marked with *" />
								</Grid>
								<Grid item>
									<MolmakerTextField
										label="Job Name"
										value={jobName}
										onChange={e => setJobName(e.target.value)}
										required
										error={submitAttempted && !jobName}
										helperText={submitAttempted && !jobName ? 'Please enter a job name' : ''}
									/>
								</Grid>
								<Divider />
								<Grid item>
									<MolmakerMoleculeSelector
										source={source}
										onSourceChange={handleSourceChange}
										structures={structures}
										selectedStructure={selectedStructure}
										onLibrarySelect={handleLibrarySelect}
										file={file}
										onFileChange={handleFileChange}
										uploadStructure={uploadStructure}
										onUploadStructureChange={setUploadStructure}
										moleculeName={moleculeName}
										onMoleculeNameChange={e => setMoleculeName(e.target.value)}
										submitAttempted={submitAttempted}
									/>
								</Grid>
								<Divider />
								<Grid container spacing={2}>
									<Grid item size={{ xs: 12, md: 6 }}>
										<MolmakerTextField
											label="Charge"
											type="number"
											value={charge}
											onChange={e => {
												const val = e.target.value;
												if (/^-?\d*$/.test(val)) setCharge(val);
											}}
											required
											helperText={submitAttempted && (charge < -1 || charge > 1) ? 'Charge must be -1, 0, or 1' : ''}
										/>
									</Grid>
									<Grid item size={{ xs: 12, md: 6 }}>
										<MolmakerDropdown
											label="Multiplicity"
											value={multiplicity}
											onChange={e => setMultiplicity(e.target.value)}
											options={Object.entries(multiplicityOptions)
												.map(([key, value]) => ({
													label: key,
													value: value
												})
											)}
											required
										/>
									</Grid>
								</Grid>
								<Grid item xs={12}>
									<Box display="flex" alignItems="center" gap={1}>
										<Button
											type="submit"
											variant="contained"
											size="large"
											startIcon={<PlayCircleOutlineIcon />}
											fullWidth
											sx={{ textTransform: 'none' }}
										>
											Run Standard Analysis
										</Button>
										<Tooltip title="This will run a three step calculation: Geometry Optimization, Vibrational Frequency Analysis, and Molecular Orbital Analysis.">
											<IconButton>
												<InfoOutlineIcon />
											</IconButton>
										</Tooltip>
									</Box>
                				</Grid>
              				</Grid>
            			</Box>
          			</Paper>
        		</Grid>
				<Grid item size={{ xs: 12, md: 6 }}>
          			<MolmakerMoleculePreview
						data={molData}
						format={molFormat}
						source={source}
					/>
        		</Grid>
      		</Grid>
    	</Box>
  	);
}

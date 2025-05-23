import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
	Box,
	Paper,
	Divider,
	Grid,
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
import MolmakerLoading from '../../MolmakerFormComponents/MolmakerLoading';

export default function StandardAnalysis() {
	const navigate = useNavigate();
	const { getAccessTokenSilently } = useAuth0();

	// form state
	const [jobName, setJobName] = useState('');
    const [source, setSource] = useState<'upload' | 'library'>('upload');  
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [uploadStructure, setUploadStructure] = useState(false);
	const [moleculeName, setMoleculeName] = useState('');

	const [file, setFile] = useState<File | null>(null);
	const [selectedStructure, setSelectedStructure] = useState('');
	const [molData, setMolData] = useState('');
	const [molFormat, setMolFormat] = useState('xyz');

	const [charge, setCharge] = useState<number>(0);
	const [multiplicity, setMultiplicity] = useState<number>(1);

	// library state
	const [structures, setStructures] = useState([]);
	const [loading, setLoading] = useState(false);

	// fetch library
	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const token = await getAccessTokenSilently();
				let res = await fetchStructures(token);
				res = [{ structure_id: '', name: 'Select a molecule' }, ...res];
				setStructures(res);
			} catch (err) {
				console.error('Failed to fetch library', err);
			} finally {
				setLoading(false);
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
			setLoading(true);
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
		} finally {
			setLoading(false);
		}
	};

  	const handleSubmitJob = async (e) => {
		e.preventDefault();
		setSubmitAttempted(true);
		setLoading(true);
		let structureIdToUse = selectedStructure;
		let uploadFile = file;

		if (source === 'upload' && !uploadFile) {
			setLoading(false);
			return;
		}
		if (source === 'library' && !structureIdToUse) {
			setLoading(false);
			return;
		}

		if (source === 'library') {
			const blob = new Blob([molData], { type: 'text/plain' });
			uploadFile = new File([blob], `${structureIdToUse}.${molFormat}`, {
				type: 'text/plain'
			});
		}

		if (!uploadFile) {
			setLoading(false);
			return;
		}

		const formData = new FormData();
		formData.append('file', uploadFile);
		formData.append('job_name', jobName);
		formData.append('charge', charge.toString());
		formData.append('multiplicity', multiplicity.toString());

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
				if (resStruct && resStruct.status === 200) {
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
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			<MolmakerPageTitle
				title="Standard Analysis"
				subtitle="Submit a job for standard analysis"
			/>
      		<Grid container spacing={3}>
				<Grid size={{ xs: 12, md: 6 }}>
          			<Paper elevation={3} sx={{ p: 4 }}>
            			<Box component="form" onSubmit={handleSubmitJob}>
							<Grid container direction="column" spacing={2}>
								<Grid>
									<MolmakerSectionHeader text="Required fields are marked with *" />
								</Grid>
								<Grid>
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
								<Grid>
									<MolmakerMoleculeSelector
										source={source as 'upload' | 'library'}
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
									<Grid size={{ xs: 12, md: 6 }}>
										<MolmakerTextField
											label="Charge"
											type="number"
											value={charge}
											onChange={e => {
												const val = e.target.value;
												if (/^-?\d*$/.test(val)) setCharge(val);
											}}
											required
											helperText={submitAttempted && !charge ? 'Please enter a charge' : ''}
										/>
									</Grid>
									<Grid size={{ xs: 12, md: 6 }}>
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
								<Grid size={12}>
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
				<Grid size={{ xs: 12, md: 6 }}>
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

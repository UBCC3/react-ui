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
import {
	PlayCircleOutlineOutlined,
	InfoOutline,
} from '@mui/icons-material';
import {
    MolmakerTextField,
    MolmakerDropdown,
    MolmakerMoleculeSelector,
	MolmakerSectionHeader,
	MolmakerMoleculePreview,
	MolmakerLoading,
	MolmakerAlert,
	MolmakerPageTitle
} from '../../components/custom'
import { 
	addjob, 
	getLibraryStructures, 
	getStructureDataFromS3, 
	submitStructure,
} from '../../services/api';
import { multiplicityOptions } from '../../constants';
import { Structure } from '../../types';

export default function StandardAnalysis() {
	const navigate = useNavigate();
	const { getAccessTokenSilently } = useAuth0();

	// state for user experience
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);

	// state for molecule preview
    const [structureData, setStructureData] = useState<string>('');

	// state for form
    const [jobName, setJobName] = useState<string>('');
    const [source, setSource] = useState<'upload' | 'library'>('upload');  
    const [file, setFile] = useState<File | null>(null);
    const [uploadStructure, setUploadStructure] = useState<boolean>(false);
    const [structures, setStructures] = useState<Structure[]>([]);
    const [selectedStructure, setSelectedStructure] = useState<string>('');
    const [structureName, setStructureName] = useState<string>('');
    const [charge, setCharge] = useState<number>(0);
    const [multiplicity, setMultiplicity] = useState<number>(1);

	// fetch library
	useEffect(() => {
		const loadLibraryStructures = async () => {
			try {
				setLoading(true);
				const token = await getAccessTokenSilently();
				let res = await getLibraryStructures(token);
				res = [{ 
					structure_id: '',
					name: 'Select a molecule',
					user_sub: '',
					location: '',
				}, ...res];
				setStructures(res);
			} catch (err) {
				setError('Failed to fetch library. Please try again later.');
				console.error('Failed to fetch library', err);
			} finally {
				setLoading(false);
			}
		}

		setLoading(true);
		loadLibraryStructures();
	}, [getAccessTokenSilently]);

	// Handle switching between upload / library
    const handleSourceChange = (source: 'upload' | 'library') => {
        setSource(source);
        setSubmitAttempted(false);

        if (source === 'upload') {
            setSelectedStructure('');
        } else {
            setFile(null);
            setUploadStructure(false);
        }

        setStructureData('');
        setError(null);
    };

	const handleFileChange = async (text, f) => {
		setFile(f);
		setSelectedStructure('');
		setStructureData(text);
		setError(null);
	};

	const handleLibrarySelect = async (structure_id: string) => {
		setSelectedStructure(structure_id);
		setFile(null);
		setUploadStructure(false);
		setStructureData('');
		setError(null);

		if (!structure_id) return;

		try {
			setLoading(true);
			const token = await getAccessTokenSilently();
			const structureData = await getStructureDataFromS3(structure_id, token);
			if (!structureData) {
				setError('Failed to load structure. Please try again or select a different molecule.');
				return;
			}
			setStructureData(structureData);
		} catch (err) {
			setError('Failed to load structure. Please try again or select a different molecule.');
			console.error('Failed to load structure', err);
		} finally {
			setLoading(false);
		}
	};

  	const handleSubmitJob = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitAttempted(true);
		setError(null);

		let structureIdToUse = selectedStructure;
		let uploadFile = file;

		if (source === 'upload' && !uploadFile) {
			setError('Please upload a structure file.');
			setLoading(false);
			return;
		}
		if (source === 'library' && !structureIdToUse) {
			setError('Please select a molecule from the library.');
			setLoading(false);
			return;
		}

		if (source === 'library') {
			const blob = new Blob([structureData], { type: 'text/plain' });
			uploadFile = new File([blob], `${structureIdToUse}.xyz`, {
				type: 'text/plain'
			});
		}

		if (!uploadFile) {
			setError('No file to upload.');
			setLoading(false);
			return;
		}

		const formData = new FormData();
		formData.append('file', uploadFile);
		formData.append('job_name', jobName);
		formData.append('charge', charge.toString());
		formData.append('multiplicity', multiplicity.toString());

		setLoading(true);
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
					structureName,
					token
				);
				if (resStruct && resStruct.status === 200) {
					structureIdToUse = resStruct.data.structure_id;
				}
			}

			const res2 = await addjob(
				jobName,
				"mp2",
				"6-311+G(2d,p)",
				"energy",
				charge,
				multiplicity,
				uploadFile,
				structureIdToUse,
				slurm_id,
				token
			);
			if (!res2) throw new Error('Failed to add job');
			navigate('/');
		} catch (err) {
			setError('Submit failed. Please check your input and try again.');
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
								{/* Error message */}
								{error && (
									<MolmakerAlert
										text={error}
										severity="error"
										outline="error"
									/>
								)}
								{/* Info message */}
								<Grid>
									<MolmakerSectionHeader text="Required fields are marked with *" />
								</Grid>
								{/* Job name */}
								<Grid>
									<MolmakerTextField
										label="Job Name"
										value={jobName}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobName(e.target.value)}
										required
										error={submitAttempted && !jobName}
										helperText={submitAttempted && !jobName ? 'Please enter a job name' : ''}
									/>
								</Grid>
								<Divider />
								{/* Molecule selector */}
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
									moleculeName={structureName}
									onMoleculeNameChange={(e: React.ChangeEvent<HTMLInputElement>) => setStructureName(e.target.value)}
									submitAttempted={submitAttempted}
								/>
								<Divider />
								{/* Calculation parameters */}
								<Box>
									<Grid>
										<MolmakerSectionHeader text="Calculation Parameters" />
									</Grid>
									<Grid container spacing={2} sx={{ mt: 2 }}>
										<Grid size={{ xs: 12, md: 6 }}>
											<MolmakerTextField
												label="Charge"
												type="number"
												value={charge}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
													const val = e.target.value;
													if (/^-?\d*$/.test(val)) {
														setCharge(parseInt(val));
													}
												}}
												required
												helperText={submitAttempted && !charge ? 'Please enter a charge' : ''}
											/>
										</Grid>
										<Grid size={{ xs: 12, md: 6 }}>
											<MolmakerDropdown
												label="Multiplicity"
												value={multiplicity}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMultiplicity(parseInt(e.target.value))}
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
								</Box>
								{/* Submit button */}
								<Grid size={12}>
									<Box display="flex" alignItems="center" gap={1}>
										<Button
											type="submit"
											variant="contained"
											size="large"
											startIcon={<PlayCircleOutlineOutlined />}
											fullWidth
											sx={{ textTransform: 'none' }}
										>
											Run Standard Analysis
										</Button>
										<Tooltip title="This will run a three step calculation: Geometry Optimization, Vibrational Frequency Analysis, and Molecular Orbital Analysis.">
											<IconButton>
												<InfoOutline />
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
						data={structureData}
						format='xyz'
						source={source}
					/>
        		</Grid>
      		</Grid>
    	</Box>
  	);
}

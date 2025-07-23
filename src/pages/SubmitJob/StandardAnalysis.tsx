import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
	Box,
	Paper,
	Divider,
	Grid,
	Button,
	Tooltip,
	IconButton,
	Autocomplete,
	TextField,
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
	MolmakerPageTitle, MolmakerConfirm,
} from '../../components/custom'
import { 
	createJob, 
	getLibraryStructures, 
	getStructureDataFromS3, 
	submitStandardAnalysis, 
	AddAndUploadStructureToS3,
	getMultiplicities,
	getChemicalFormula,
	getStructuresTags
} from '../../services/api';
import { Structure } from '../../types';

export default function StandardAnalysis() {
	const navigate = useNavigate();
	const { getAccessTokenSilently } = useAuth0();

	// state for user experience
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);

	// state for structure preview
    const [structureData, setStructureData] = useState<string>('');

	// state for form
    const [jobName, setJobName] = useState<string>('');
	const [jobNotes, setJobNotes] = useState<string>('');
	const [jobTags, setJobTags] = useState<string[]>([]);
    const [source, setSource] = useState<'upload' | 'library'>('upload');  
    const [file, setFile] = useState<File | null>(null);
    const [uploadStructure, setUploadStructure] = useState<boolean>(false);
    const [structures, setStructures] = useState<Structure[]>([]);
    const [selectedStructure, setSelectedStructure] = useState<string>('');
    const [structureName, setStructureName] = useState<string>('');
	const [chemicalFormula, setChemicalFormula] = useState<string>('');
	const [structureNotes, setStructureNotes] = useState<string>('');
    const [charge, setCharge] = useState<number>(0);
    const [multiplicity, setMultiplicity] = useState<number>(1);
	const [structureTags, setStructureTags] = useState<string[]>([]);
	const [options, setOptions] = useState<string[]>([]);

	// dropdown options for multiplicity
	const [multiplicityOptions, setMultiplicityOptions] = useState<{ [key: string]: number }>({});

	const [openConfirmImage, setOpenConfirmImage] = useState<boolean>(false);
	const [submitConfirmed, setSubmitConfirmed] = useState(false);
	const [structureImageData, setStructureImageData] = useState<string>('');

	useEffect(() => {
		const getStructureImageSubmit = async () => {
			if (!submitConfirmed || structureImageData === '') return

			await performSubmitJob();
			setSubmitConfirmed(false);
		}

		getStructureImageSubmit();
	}, [structureImageData]);

	// fetch library
	useEffect(() => {
		const loadMultiplicityOptions = async () => {
			try {
				const token = await getAccessTokenSilently();
				const response = await getMultiplicities(token);
                if (response.error) {
                    setError('Failed to load multiplicities. Please try again later.');
                    return;
                }
                setMultiplicityOptions(response.data);
			} catch (err) {
				setError('Failed to fetch multiplicity options. Please try again later.');
				console.error('Failed to fetch multiplicity options', err);
			} finally {
				setLoading(false);
			}
		}

		const loadLibraryStructures = async () => {
			try {
				setLoading(true);
				const token = await getAccessTokenSilently();
				const response = await getLibraryStructures(token);
				if (response.error) {
					setError('Failed to fetch library. Please try again later.');
					return;
				}
				let res = response.data;
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

		const fetchTags = async () => {
			try {
				const token = await getAccessTokenSilently()
				const response = await getStructuresTags(token)
				if (response.data) {
					setOptions(response.data)
				}
			}
			catch (err) {
				console.error("Failed to fetch tags", err)
			}
		}
		
		setLoading(true);
		loadMultiplicityOptions();
		loadLibraryStructures();
		fetchTags();
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

	// const handleFileChange = async (text, f) => {
	// 	setFile(f);
	// 	setSelectedStructure('');
	// 	setStructureData(text);
	// 	setError(null);
	// };

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
			const response = await getStructureDataFromS3(structure_id, token);
			if (response.error) {
				setError('Failed to load structure. Please try again or select a different molecule.');
				return;
			}
			setStructureData(response.data);
		} catch (err) {
			setError('Failed to load structure. Please try again or select a different molecule.');
			console.error('Failed to load structure', err);
		} finally {
			setLoading(false);
		}
	};

	const handleFileChange = async (data, file) => {
		setStructureData(data);
		setFile(file);

		if (file && file.name.endsWith('.xyz')) {
			try {
				const token = await getAccessTokenSilently();
				const formula = await getChemicalFormula(file, token);
				setChemicalFormula(formula.data['formula'] || '');
			} catch (err) {
				console.error("Failed to get chemical formula", err);
				setError('Failed to get chemical formula. Please try again.');
			}
		} else {
			setError('Please upload a valid .xyz file.');
			setStructureData('');
		}
	};

  	async function performSubmitJob() {
		setSubmitAttempted(true);
		setError(null);

		let structureIdToUse = selectedStructure;
		let uploadFile = file;

		if (source === 'upload' && !uploadFile) {
			setError('Please upload a structure file.');
			return;
		}
		if (source === 'library' && !structureIdToUse) {
			setError('Please select a molecule from the library.');
			return;
		}

		if (source === 'library') {
			const blob = new Blob([structureData], {type: 'text/plain'});
			uploadFile = new File([blob], `${structureIdToUse}.xyz`, {
				type: 'text/plain'
			});
		}

		if (!uploadFile) {
			setError('No file to upload.');
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
			let response = await submitStandardAnalysis(
				jobName,
				uploadFile,
				charge,
				multiplicity,
				structureIdToUse,
				token
			);
			if (response.error) {
				throw new Error(response.error);
			}
			const {job_id, slurm_id} = response.data;

			if (uploadStructure && source === 'upload') {
				response = await AddAndUploadStructureToS3(
					uploadFile,
					structureName,
					chemicalFormula,
					structureNotes,
					structureImageData,
					token,
					structureTags
				);
				if (response.error) {
					throw new Error(response.error);
				}
				structureIdToUse = response.data.structure_id;
			}

			response = await createJob(
				uploadFile,
				job_id,
				jobName,
				jobNotes,
				"mp2",
				"6-311+G(2d,p)",
				"standard",
				charge,
				multiplicity,
				structureIdToUse,
				slurm_id,
				token,
				jobTags
			);
			if (response.error) {
				throw new Error(response.error);
			}
			navigate('/');
		} catch (err) {
			setError('Submit failed. Please check your input and try again.');
			console.error('Submit failed:', err);
		} finally {
			setLoading(false);
		}
	}

	const handleSubmitJob = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (uploadStructure && source === 'upload') {
            setOpenConfirmImage(true);
            return;
        }
        
        performSubmitJob();
	};

	if (loading) {
		return (
			<MolmakerLoading />
		);
	}

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			<MolmakerConfirm
				open={openConfirmImage}
				onClose={() => setOpenConfirmImage(false)}
				textToShow={
					<>
						Confirm the current zoom and orientation to capture the structure image.<br />
						This view will be captured and saved as the snapshot for this structure.<br />
						You can scroll to zoom and drag to rotate the molecule before confirming.
					</>
				}
				onConfirm={async () => {
					setSubmitConfirmed(true);
					setOpenConfirmImage(false);
				}}
			/>
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
									<MolmakerTextField
										label="Job Notes"
										value={jobNotes}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobNotes(e.target.value)}
										multiline
										rows={3}
										sx={{ mt: 2 }}
									/>
									<Autocomplete
										multiple
										freeSolo
										id="tags-input"
										options={options}
										value={jobTags}
										onChange={(e, newValue) => {
											setJobTags(newValue.filter(tag => tag.trim() !== ''));
										}}
										renderInput={(params) => (
											<TextField
												{...params}
												variant="outlined"
												label="Tags"
												placeholder="Press enter to add tags"
											/>
										)}
										sx={{ mt: 2 }}
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
									chemicalFormula={chemicalFormula}
									onChemicalFormulaChange={(e: React.ChangeEvent<HTMLInputElement>) => setChemicalFormula(e.target.value)}
									moleculeNotes={structureNotes}
									onMoleculeNotesChange={(e: React.ChangeEvent<HTMLInputElement>) => setStructureNotes(e.target.value)}
									submitAttempted={submitAttempted}
									structureTags={structureTags}
                                    onStructureTagsChange={(e, newValue) => {
                                        setStructureTags(newValue.filter(tag => tag.trim() !== ''));
                                    }}
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
            sx={{ maxHeight: 450 }}
						submitConfirmed={submitConfirmed}
						setStructureImageData={setStructureImageData}
					/>
        		</Grid>
      		</Grid>
    	</Box>
  	);
}

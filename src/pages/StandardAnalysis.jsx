import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

import {
	Box,
	Paper,
	Typography,
	Divider,
	Grid,
	FormControl,
	RadioGroup,
	FormControlLabel,
	Radio,
	FormHelperText,
	InputLabel,
	Select,
	MenuItem,
	Button,
	TextField,
	CircularProgress,
	Skeleton,
	Checkbox,
	Tooltip,
	IconButton,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';

import MoleculeViewer from '../components/MoleculeViewer';
import { addjob, fetchStructures, submitStructure } from '../services/api';
import { blueGrey } from '@mui/material/colors';

export default function SubmitJob() {
	const navigate = useNavigate();
	const { getAccessTokenSilently } = useAuth0();

	// --- form state ---
	const [jobName, setJobName] = useState('');            // name of job
	const [source, setSource] = useState('upload');                // 'upload' or 'library'
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [uploadStructure, setUploadStructure] = useState(false);      // structure_id from library
	const [moleculeName, setMoleculeName] = useState('');          // name of molecule if uploading

	const [file, setFile] = useState(null);                        // File object from user upload
	const [selectedStructure, setSelectedStructure] = useState('');// structure_id from library
	const [molData, setMolData] = useState('');                    // raw xyz/pdb text
	const [molFormat, setMolFormat] = useState('xyz');             // 'xyz' or 'pdb'

	const [charge, setCharge] = useState(0);                      // charge of molecule
	const [multiplicity, setMultiplicity] = useState(1);          // multiplicity of molecule

	// --- library list state ---
	const [structures, setStructures] = useState([]);
	const [loadingStructures, setLoadingStructures] = useState(true);

	// Load library on mount
	useEffect(() => {
		(async () => {
			try {
				const token = await getAccessTokenSilently();
				let res = await fetchStructures(token);
				// insert a placeholder at top
				res = [ { structure_id: '', name: 'Select a molecule' }, ...res ];
				setStructures(res);
			} catch (err) {
				console.error('Failed to fetch library', err);
			} finally {
				setLoadingStructures(false);
			}
		})();
	}, [getAccessTokenSilently]);

	// Handle switching between upload / library
	const handleSourceChange = (e) => {
		const val = e.target.value;
		console.log('Source changed to', val);
		setSource(val);
		setSubmitAttempted(false);
		// clear the other input
		if (val === 'upload') {
			setSelectedStructure('');
		} else {
			setFile(null);
			setUploadStructure(false);
		}
		setMolData('');
	};

	// File input change
	const handleFileChange = (e) => {
		const f = e.target.files[0];
		setFile(f);
		setSelectedStructure('');
		setMolData('');
		if (f) {
			const ext = f.name.split('.').pop().toLowerCase();
			setMolFormat(ext === 'pdb' ? 'pdb' : 'xyz');
			const reader = new FileReader();
			reader.onload = (ev) => setMolData(ev.target.result);
			reader.readAsText(f);
		}
	};

	// Library select change
	const handleLibrarySelect = async (e) => {
		const id = e.target.value;
		setSelectedStructure(id);
		setFile(null);
		setUploadStructure(false);
		setMolData('');
		if (id) {
			try {
				const token = await getAccessTokenSilently();
				// get a presigned URL for this structure
				const pres = await fetch(`${import.meta.env.VITE_STORAGE_API_URL}/presigned/${id}`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				const { url } = await pres.json();
				const fileRes = await fetch(url);
				const xyz = await fileRes.text();
				setMolData(xyz);
				setMolFormat('xyz');
			} catch (err) {
				console.error('Failed to load structure', err);
			}
		}
	};

	const handleSubmitJob = async (e) => {
		e.preventDefault();
		setSubmitAttempted(true);

		let structureIdToUse = selectedStructure;
		let uploadFile = file;

		// --- Validation ---
		if (source === 'upload' && !uploadFile) {
			console.error('No file selected');
			return;
		}

		if (source === 'library') {
			if (!structureIdToUse) {
				console.error('No structure selected');
				return;
			}
			if (!molData) {
				console.error("Missing molecule data");
				return;
			}

			const blob = new Blob([molData], { type: 'text/plain' });
			uploadFile = new File([blob], `${structureIdToUse}.${molFormat}`, {
				type: 'text/plain',
			});
		}

		if (!uploadFile) {
			console.error("No file to upload");
			return;
		}

		// --- Submit Job ---
		const formData = new FormData();
		formData.append('file', uploadFile);
		formData.append('job_name', jobName);
		formData.append('charge', charge);
		formData.append('multiplicity', multiplicity);

		try {
			const token = await getAccessTokenSilently();

			const res = await fetch(`${import.meta.env.VITE_API_URL}/upload_submit`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`, // ✅ important!
				},
				body: formData,
			});

			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const { job_id, slurm_id } = data;
			console.log('Job submitted:', job_id, slurm_id);

			// --- Optional: upload structure if new ---
			if (uploadStructure && source === 'upload') {
				try {
					const resStruct = await submitStructure(uploadFile, moleculeName, token);
					if (resStruct.status !== 200) {
						console.error('Failed to upload structure', resStruct);
						return;
					}
					structureIdToUse = resStruct.data["structure_id"];
				} catch (err) {
					console.error('Failed to upload structure', err);
					return;
				}
			}

			// --- Add job to database ---
			const res2 = await addjob(jobName, uploadFile, structureIdToUse, slurm_id, token);
			if (!res2) {
				console.error('Failed to add job');
				return;
			}

			console.log('Job added to library:', res2);
			navigate('/');

		} catch (err) {
			console.error('Submit failed:', err);
		}
	};

	// --- render ---
	if (loadingStructures) {
		return (
			<Box display="flex" justifyContent="center" bgcolor={'rgb(247, 249, 252)'} p={4}>
				<CircularProgress />
			</Box>
		)
	}

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			<Grid container sx={{ display: 'flex', alignItems: 'start', flexDirection: 'column', justifyContent: 'center' }}>
				<Typography variant="h5" color="text.primary" sx={{ flexGrow: 1, mb: 2 }}>
					Standard Analysis
				</Typography>
				<Typography variant="body2" color="text.secondary">
					A three step workflow: Geometry Optimization, Vibrational Frequency Analysis, and Molecular Orbital Analysis.
				</Typography>
			</Grid>
			<Divider sx={{ my: 3 }} />
			<Grid container spacing={3}>
				{/* Left column */}
				<Grid item size={{ xs: 12, md: 6 }}>
					<Paper elevation={3} sx={{ padding: 4 }}>
						<Box component="form">
								<Grid container direction="column" spacing={2}>
									{/* required info */}
									<Grid item>
										<Typography variant="body2" color="text.secondary">
											Required fields are marked with *
										</Typography>
									</Grid>
									{/* Job name */}
									<Grid item>
										<TextField
											required
											fullWidth
											label="Job Name"
											value={jobName}
											onChange={e => setJobName(e.target.value)}
											error={submitAttempted && !jobName}
										/>
										{submitAttempted && !jobName && (
											<FormHelperText error>Please enter a job name</FormHelperText>
										)}
									</Grid>
									{/* Source toggle */}
									<Grid item>
										<FormControl>
											<RadioGroup row value={source} onChange={handleSourceChange} sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
												<FormControlLabel
													value="upload"
													control={<Radio />}
													label="Upload File"
												/>
												<FormControlLabel
													value="library"
													control={<Radio />}
													label="Choose from Library"
												/>
											</RadioGroup>
										</FormControl>
									</Grid>

									{/* Library picker */}
									{source === 'library' ? (
										<Grid item>
											<FormControl 
												fullWidth 
												slotProps={{ input: { readOnly: source !== "library" } }}
												required={source === 'library'}
												error={submitAttempted && source==='library' && !selectedStructure}
											>
												<InputLabel>Select Molecule</InputLabel>
												<Select
													value={selectedStructure}
													label="Select Molecule"
													onChange={handleLibrarySelect}
													error={submitAttempted && source==='library' && !selectedStructure}
												>
													{structures.map(s => (
														<MenuItem key={s.structure_id} value={s.structure_id}>
															{s.name}
														</MenuItem>
													))}
												</Select>
												{submitAttempted && source==='library' && !selectedStructure && (
													<FormHelperText>Please choose a molecule</FormHelperText>
												)}
											</FormControl>
										</Grid>) : (
										<Grid item sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
											<Button
												variant="contained"
												component="label"
												disabled={source !== 'upload'}
												startIcon={<CloudUploadIcon />}
												sx={{ textTransform: 'none' }}
												size='large'
											>
												{file ? file.name : 'Select File'}
												<input
													hidden
													type="file"
													accept=".xyz,.pdb"
													onChange={handleFileChange}
												/>
											</Button>
											{submitAttempted && source==='upload' && !file && (
												<FormHelperText error>Please upload a file</FormHelperText>
											)}
											<FormControlLabel
												disabled={source !== 'upload'}
												control={
													<Checkbox checked={uploadStructure} onChange={() => {
														setUploadStructure(!uploadStructure);
													}} name="uploadStructure" />
												}
												label="Upload Structure to Library"
												sx={{ marginLeft: 2 }}
											/>
										</Grid>)}

									{/* Molecule name if user chooses to upload to library */}
									{uploadStructure && (
										<Grid item>
											<TextField
												fullWidth
												required={uploadStructure}
												label="Molecule Name"
												value={moleculeName}
												onChange={e => setMoleculeName(e.target.value)}
												error={submitAttempted && !moleculeName}
											/>
											{submitAttempted && uploadStructure && !moleculeName && (
												<FormHelperText error>Please enter a name</FormHelperText>
											)}
										</Grid>
									)}

									{/* Charge and Multiplicity of structure */}
									<Grid container spacing={2}>
										<Grid item size={{ xs: 12, md: 6 }}>
											<FormControl fullWidth>
												<TextField
													required
													type="number"
													value={charge}
													onChange={(e) => {
														const val = e.target.value;
														if (/^-?\d*$/.test(val)) {
															setCharge(val);
														}
													}}
													label="Charge"
												/>
											</FormControl>
										</Grid>
										<Grid item size={{ xs: 12, md: 6 }}>
											<FormControl required fullWidth>
												<InputLabel>Multiplicity</InputLabel>
												<Select
													value={multiplicity}
													label="Multiplicity"
													onChange={(e) => {
														setMultiplicity(e.target.value);
													}}
												>
													<MenuItem value={1}>Singlet</MenuItem>
													<MenuItem value={2}>Doublet</MenuItem>
													<MenuItem value={3}>Triplet</MenuItem>
													<MenuItem value={4}>Quartet</MenuItem>
													<MenuItem value={5}>Quintet</MenuItem>
													<MenuItem value={6}>Sextet</MenuItem>
												</Select>
											</FormControl>
										</Grid>
									</Grid>

									<Grid item xs={12}>
										<Box display="flex" alignItems="center" gap={1}>
											<Button
												type="submit"
												variant="contained"
												color="primary"
												size="large"
												startIcon={<PlayCircleOutlineIcon />}
												fullWidth
												sx={{ flexGrow: 1, textTransform: 'none' }}
												onClick={handleSubmitJob}
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

				{/* Right column: 3D viewer */}
				<Grid item size={{ xs: 12, md: 6 }}>
					<Paper
						sx={{
							width: '100%',
							height: '100%',
							display: 'flex',
							flexDirection: 'column'
						}}
						elevation={2}
					>
						<Typography
							variant="h6"
							color="text.secondary"
							sx={{ p: 2, bgcolor: blueGrey[200] }}
						>
							Molecule Preview
						</Typography>
						<Divider />
						<Box
							sx={{
								flex: 1,
								position: 'relative',
								border: '1px solid',
								borderColor: 'grey.300'
							}}
						>
							{molData ? (
								<MoleculeViewer data={molData} format={molFormat} />
							) : (
								<Box
									display="flex"
									justifyContent="center"
									alignItems="center"
									height="100%"
								>
									<Skeleton
										variant="rectangular"
										width="100%"
										height="100%"
									/>
									<Typography
										variant="body2"
										color="text.secondary"
										sx={{ position: 'absolute' }}
									>
										{source === 'upload'
											? 'Upload a file to preview'
											: 'Select a molecule to preview'}
									</Typography>
								</Box>
							)}
						</Box>
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
}

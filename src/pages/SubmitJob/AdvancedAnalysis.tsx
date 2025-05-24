import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
    Box, 
    Grid, 
    Divider,
    Button,
    Paper,
} from '@mui/material'
import { 
    wavefunctionTheory, 
    densityTheory, 
    calculationTypes, 
    basisSets, 
    multiplicityOptions,
} from '../../constants'
import { useAuth0 } from '@auth0/auth0-react'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import {
    MolmakerPageTitle,
    MolmakerTextField,
    MolmakerDropdown,
    MolmakerMoleculeSelector,
    MolmakerSectionHeader,
    MolmakerRadioGroup,
    MolmakerMoleculePreview,
    MolmakerAlert,
    MolmakerLoading
} from '../../components/custom'
import { getLibraryStructures, getStructureDataFromS3 } from '../../services/api'
import { Structure } from '../../types'

const AdvancedAnalysis = () => {
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
    const [calculationType, setCalculationType] = useState<string>('Molecular Energy');
    const [multiplicity, setMultiplicity] = useState<number>(1);
    const [theoryType, setTheoryType] = useState('wavefunction');
    const [theory, setTheory] = useState<string>('scf');
    const [basisSet, setBasisSet] = useState<string>('sto-3g');

    // Load library on mount
    useEffect(() => {
        const loadLibrary = async () => {
            try {
                const token = await getAccessTokenSilently();
                let res = await getLibraryStructures(token);
                res = [{
                    structure_id: '',
                    name: 'Select a molecule',
                    user_sub: '',
                    location: ''
                }, ...res ];
                setStructures(res);
            } catch (err) {
                setError('Failed to fetch library. Please try again later.');
                console.error('Failed to fetch library', err);
            } finally {
                setLoading(false);
            }
        }

        setLoading(true);
        loadLibrary();
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

    // Library select change
    const handleLibrarySelect = async (selected_structure_id: string) => {
        setSelectedStructure(selected_structure_id);
        setFile(null);
        setUploadStructure(false);
        setStructureData('');
        setError(null);

        if (selected_structure_id) {
            try {
                const token = await getAccessTokenSilently();
                const structureData = await getStructureDataFromS3(selected_structure_id, token);
                if (!structureData) {
                    setError('Failed to load structure. Please try again or select a different molecule.');
                    return;
                }
                setStructureData(structureData);
            } catch (err) {
                setError('Failed to load structure. Please try again or select a different molecule.');
                console.error('Failed to load structure', err);
            }
        }
    };

    const handleSubmitJob = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitAttempted(true);
        setError(null);

        let structureIdToUse = selectedStructure;
        let uploadFile = file;

        if (!jobName || !structureData || !theory || !calculationType || !basisSet || !charge || !multiplicity) {
            setError('Please fill in all required fields');
            return;
        }
        if (source === 'upload' && !file) {
            setError('Please upload a file');
            return;
        }
        if (source === 'library' && !structureIdToUse) {
            setError('Please select a molecule from the library');
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
        formData.append('charge', charge.toString());
        formData.append('multiplicity', multiplicity.toString());
        formData.append('theory', theory);
        formData.append('calculation_type', calculationType);
        formData.append('basis_set', basisSet);

        setLoading(true);
        try {
            navigate('/');
        } catch (err) {
            setError('Failed to submit job. Please try again later.');
            console.error('Failed to submit job', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
		return (
			<MolmakerLoading />
		);
	}

    return (
        <Box bgcolor="rgb(247, 249, 252)" p={4}>
            <MolmakerPageTitle
                title="Advanced Analysis"
                subtitle="Submit a molecule for advanced analysis"
            />
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ padding: 4 }}>
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
                                {/* required info */}
                                <Grid>
                                    <MolmakerSectionHeader text="Required fields are marked with *"/>
                                </Grid>
                                {/* Job name */}
                                <Grid>
                                    <MolmakerTextField
                                        label="Job Name"
                                        value={jobName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobName(e.target.value)}
                                        required
                                        error={submitAttempted && !jobName}
                                        helperText={submitAttempted && !jobName ? 'Please enter a job name': undefined}
                                    />
                                </Grid>
                                <Divider />
                                {/* Molecule source */}
                                <MolmakerMoleculeSelector
                                    source={source}
                                    onSourceChange={handleSourceChange}
                                    structures={structures}
                                    selectedStructure={selectedStructure}
                                    onLibrarySelect={handleLibrarySelect}
                                    file={file}
                                    onFileChange={(data: string, file: File) => {
                                        setStructureData(data);
                                        setFile(file);
                                    }}
                                    uploadStructure={uploadStructure}
                                    onUploadStructureChange={setUploadStructure}
                                    moleculeName={structureName}
                                    onMoleculeNameChange={(e: React.ChangeEvent<HTMLInputElement>) => setStructureName(e.target.value)}
                                    submitAttempted={submitAttempted}
                                />
                                <Divider />
                                {/* Theory */}
                                <Box>
                                    <Grid>
                                        <MolmakerSectionHeader text="Theory" />
                                    </Grid>
                                    <Grid sx={{ mb: 1 }}>
                                        <MolmakerRadioGroup
                                            name="theoryType"
                                            value={theoryType}
                                            onChange={(event: unknown, theory: string) => {
                                                setTheoryType(theory);
                                                if (theory === 'density') {
                                                    setTheory(densityTheory[0].toLowerCase());
                                                } else {
                                                    setTheory(Object.values(wavefunctionTheory)[0]);
                                                }
                                            }}
                                            options={[
                                                { value: 'wavefunction', label: 'Wavefunction Theory' },
                                                { value: 'density',     label: 'Density Functional Theory' }
                                            ]}
                                            row
                                        />
                                    </Grid>
                                    <Grid>
                                        <MolmakerDropdown
                                            label="Theory Method"
                                            value={theory}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTheory(e.target.value)}
                                            options={theoryType === 'density' ? 
                                                densityTheory
                                                    .map(theory => ({
                                                        label: theory,
                                                        value: theory.toLowerCase()
                                                    })
                                                ) : 
                                                Object.entries(wavefunctionTheory)
                                                    .map(([key, value]) => ({
                                                        label: key,
                                                        value: value
                                                    })
                                                )
                                            }
                                            helperText={submitAttempted && !theory ? 'Please select a theory method' : undefined}
                                            error={submitAttempted && !theory}
                                            required
                                        />
                                    </Grid>
                                </Box>
                                <Divider />
                                {/* Calculation parameters */}
                                <Box>
                                    <Grid>
                                        <MolmakerSectionHeader text="Calculation Parameters" />
                                    </Grid>
                                    <Grid container spacing={2} sx={{ my: 2 }}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <MolmakerDropdown
                                                label="Calculation Type"
                                                value={calculationType}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>)  => setCalculationType(e.target.value)}
                                                options={calculationTypes
                                                    .map(type => ({
                                                        label: type,
                                                        value: type
                                                    })
                                                )}
                                                helperText={submitAttempted && !calculationType ? 'Please select a calculation type' : undefined}
                                                error={submitAttempted && !calculationType}
                                                required
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <MolmakerDropdown
                                                label="Basis Set"
                                                value={basisSet}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBasisSet(e.target.value)}
                                                options={basisSets
                                                    .map(basis => ({
                                                        label: basis,
                                                        value: basis.toLowerCase()
                                                    })
                                                )}
                                                helperText={submitAttempted && !basisSet ? 'Please select a basis set' : undefined}
                                                error={submitAttempted && !basisSet}
                                                required
                                            />
                                        </Grid>
                                    </Grid>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <MolmakerTextField
                                                fullWidth
                                                label="Charge"
                                                type="number"
                                                value={charge}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const val = e.target.value;
                                                    if (/^-?\d*$/.test(val)) {
                                                        setCharge(parseInt(val));
                                                    }
                                                }}
                                                helperText={submitAttempted && !charge ? 'Please enter a charge' : undefined}
                                                required
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <MolmakerDropdown
                                                fullWidth
                                                label="Multiplicity"
                                                value={multiplicity}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMultiplicity(parseInt(e.target.value))}
                                                options={Object.entries(multiplicityOptions)
                                                    .map(([key, value]) => ({
                                                        label: key,
                                                        value: value
                                                    })
                                                )}
                                                helperText={submitAttempted && !multiplicity ? 'Please select a multiplicity' : undefined}
                                                error={submitAttempted && !multiplicity}
                                                required
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                                <Grid size={12}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<PlayCircleOutlineIcon />}
                                        fullWidth
                                        sx={{ flexGrow: 1, textTransform: 'none' }}
                                    >
                                        Run Advanced Analysis
                                    </Button>
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
                        sx={{ maxHeight: 437 }}
					/>
        		</Grid>
            </Grid>
        </Box>
    )
}

export default AdvancedAnalysis

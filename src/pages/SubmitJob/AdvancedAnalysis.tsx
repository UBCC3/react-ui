import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Grid,
    Divider,
    Button,
    Paper, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
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
import { 
    getCalculationTypes, 
    getLibraryStructures, 
    getStructureDataFromS3,
    getWavefunctionMethods,
    getDensityFunctionalMethods,
    getBasisSets,
    getMultiplicities,
    createJob,
    AddAndUploadStructureToS3,
} from '../../services/api'
import { Structure } from '../../types'
import { submitAdvancedAnalysis } from '../../services/api'
import * as React from 'react'
import {
    Keyword,
    KeywordEditor
} from './KeywordEditor'
import { grey } from '@mui/material/colors'

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
    const [jobNotes, setJobNotes] = useState<string>('');
    const [source, setSource] = useState<'upload' | 'library'>('upload');  
    const [file, setFile] = useState<File | null>(null);
    const [uploadStructure, setUploadStructure] = useState<boolean>(false);
    const [structures, setStructures] = useState<Structure[]>([]);
    const [selectedStructure, setSelectedStructure] = useState<string>('');
    const [structureName, setStructureName] = useState<string>('');
    const [structureNotes, setStructureNotes] = useState<string>('');
    const [charge, setCharge] = useState<number>(0);
    const [calculationType, setCalculationType] = useState<string>('energy');
    const [multiplicity, setMultiplicity] = useState<number>(1);
    const [theoryType, setTheoryType] = useState('wavefunction');
    const [theory, setTheory] = useState<string>('scf');
    const [basisSet, setBasisSet] = useState<string>('sto-3g');

    // dropdown options state
    const [wavefunctionTheory, setWavefunctionTheory] = useState<{ [key: string]: string }>({});
    const [densityTheory, setDensityTheory] = useState<string[]>([]);
    const [calculationTypes, setCalculationTypes] = useState<{ [key: string]: number }>({});
    const [basisSets, setBasisSets] = useState<{ [key: string]: string }>({});
    const [multiplicityOptions, setMultiplicityOptions] = useState<{ [key: string]: number }>({});

    // keywords (optional)
    const [keywords, setKeywords] = useState<Keyword[]>([]);

    const handleKeywordsChange = (updatedKeywords: Keyword[]) => {
        setKeywords(updatedKeywords);
    }

    // Load library on mount
    useEffect(() => {
        // Load dropdown options
        const loadDropdownOptions = async () => {
            try {
                const token = await getAccessTokenSilently();
                let response = await getCalculationTypes(token);
                if (response.error) {
                    setError('Failed to load calculation types. Please try again later.');
                    return;
                }
                setCalculationTypes(response.data);
                response = await getWavefunctionMethods(token);
                if (response.error) {
                    setError('Failed to load wavefunction methods. Please try again later.');
                    return;
                }
                setWavefunctionTheory(response.data);
                response = await getDensityFunctionalMethods(token);
                if (response.error) {
                    setError('Failed to load density functional methods. Please try again later.');
                    return;
                }
                setDensityTheory(response.data);
                response = await getBasisSets(token);
                if (response.error) {
                    setError('Failed to load basis sets. Please try again later.');
                    return;
                }
                setBasisSets(response.data);
                response = await getMultiplicities(token);
                if (response.error) {
                    setError('Failed to load multiplicities. Please try again later.');
                    return;
                }
                setMultiplicityOptions(response.data);
            } catch (err) {
                setError('Failed to load calculation types. Please try again later.');
                console.error('Failed to load calculation types', err);
            } finally {
                setLoading(false);
            }
        }
        const loadLibrary = async () => {
            try {
                const token = await getAccessTokenSilently();
                const response = await getLibraryStructures(token);
                if (response.error) {
                    setError('Failed to fetch library. Please try again later.');
                    return;
                }
                let structures = response.data;
                structures = [{
                    structure_id: '',
                    name: 'Select a molecule',
                    user_sub: '',
                    location: ''
                }, ...structures ];
                setStructures(structures);
            } catch (err) {
                setError('Failed to fetch library. Please try again later.');
                console.error('Failed to fetch library', err);
            } finally {
                setLoading(false);
            }
        }

        setLoading(true);
        loadDropdownOptions();
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
                const response = await getStructureDataFromS3(selected_structure_id, token);
                if (response.error) {
                    setError('Failed to load structure. Please try again or select a different molecule.');
                    return;
                }
                setStructureData(response.data);
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

        if (!jobName || !structureData || !theory || !calculationType || !basisSet || !multiplicity) {
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

        let keywordsJsonFile: File | undefined = undefined;
        if (keywords.length > 0) {
            const payload: Record<string, any> = keywords.reduce((obj, { key, value }) => {
                obj[key] = value;
                return obj;
            }, {});
            const keywordsJsonStr = JSON.stringify(payload);
            const keywordsBlob = new Blob([keywordsJsonStr], { type: "application/json" });
            keywordsJsonFile = new File([keywordsBlob], `keywords.json`, {
                type: 'text/plain'
            });
            formData.append('keywords', keywordsJsonFile);
        }

        setLoading(true);
        try {
            const token = await getAccessTokenSilently();
            let response = await submitAdvancedAnalysis(
                uploadFile,
                calculationType,
                theory,
                basisSet,
                charge,
                multiplicity,
                token,
                keywordsJsonFile
            );
            if (response.error) {
                throw new Error(response.error);
            }
            const { job_id, slurm_id } = response.data;

            if (uploadStructure && source === 'upload') {
                response = await AddAndUploadStructureToS3(
                    uploadFile,
                    structureName,
                    structureNotes,
                    token
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
                theory,
                basisSet,
                calculationType,
                charge,
                multiplicity,
                structureIdToUse,
                slurm_id,
                token
            );
            if (response.error) {
                throw new Error(response.error);
            }
            // Job submitted successfully, redirect to job list
            setSubmitAttempted(false);
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
                                    <MolmakerTextField
                                        label="Job Notes"
                                        value={jobNotes}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobNotes(e.target.value)}
                                        multiline
                                        rows={3}
                                        helperText="Optional notes about this job"
                                        sx={{ mt: 2 }}
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
                                    moleculeNotes={structureNotes}
                                    onMoleculeNotesChange={(e: React.ChangeEvent<HTMLInputElement>) => setStructureNotes(e.target.value)}
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
                                                options={Object.entries(calculationTypes)
                                                    .map(([key, value]) => ({
                                                        label: key,
                                                        value: value
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
                                                options={Object.entries(basisSets)
                                                    .map(([key, value]) => ({
                                                        label: key,
                                                        value: value
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
                                {/* Calculation Keywords */}
                                <Accordion disableGutters elevation={0} sx={{ mt: 3 }} >
                                    <AccordionSummary
                                        expandIcon={ <ExpandMoreIcon /> }
                                        aria-controls="keywords-content"
                                        id="keywords-header"
                                        sx={{
                                            px: 0,
                                            mx: 0,
                                            width: "100%",
                                        }}
                                    >
                                        <MolmakerSectionHeader text="Calculation Keywords" />
                                    </AccordionSummary>
                                    <AccordionDetails
                                        sx={{
                                            p: 2,
                                            // border: '1px solid rgba(0, 0, 0, 0.12)',
                                            borderRadius: 2,
                                            width: "100%",
                                            bgcolor: grey[100],
                                        }}
                                    >
                                        <KeywordEditor maxEntries={20} onChange={handleKeywordsChange} />
                                    </AccordionDetails>
                                </Accordion>
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

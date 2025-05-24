import { useState, useEffect } from 'react'
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
import { fetchStructures } from '../../services/api'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import MolmakerPageTitle from '../../components/custom/MolmakerPageTitle'
import {
    MolmakerTextField,
    MolmakerDropdown,
    MolmakerMoleculeSelector,
    MolmakerSectionHeader,
    MolmakerRadioGroup,
    MolmakerMoleculePreview
} from '../../components/custom'
import MolmakerAlert from '../../components/custom/MolmakerAlert'

const AdvancedAnalysis = () => {
    const { getAccessTokenSilently } = useAuth0();

    const [error, setError] = useState<string | null>(null); // error state
    const [source, setSource] = useState<'upload' | 'library'>('upload');  
    const [molData, setMolData] = useState('');                    // raw xyz/pdb text
    const [molFormat, setMolFormat] = useState('xyz');
    const [jobName, setJobName] = useState('');                  // job name
    const [submitAttempted, setSubmitAttempted] = useState(false); // flag to check if submit was attempted
    const [file, setFile] = useState(null);                    // file to be uploaded

    const [selectedStructure, setSelectedStructure] = useState(''); // selected structure from library
    const [uploadStructure, setUploadStructure] = useState(false); // flag to check if user wants to upload structure to library
    const [moleculeName, setMoleculeName] = useState('');        // name of the molecule to be uploaded
    const [charge, setCharge] = useState(0);                   // charge of the molecule
    const [calculationType, setCalculationType] = useState('Molecular Energy'); // calculation type
    const [multiplicity, setMultiplicity] = useState(1);       // multiplicity of the molecule
    const [theoryType, setTheoryType] = useState('wavefunction');   // theory type
    const [theory, setTheory] = useState('scf');      // theory method
    const [basisSet, setBasisSet] = useState('sto-3g');        // basis set
    const [structures, setStructures] = useState([]);

    // Load library on mount
    useEffect(() => {
        (async () => {
            try {
                const token = await getAccessTokenSilently();
                let res = await fetchStructures(token);
                res = [ { structure_id: '', name: 'Select a molecule' }, ...res ];
                setStructures(res);
            } catch (err) {
                setError('Failed to fetch library. Please try again later.');
                console.error('Failed to fetch library', err);
            }
        })();
    }, [getAccessTokenSilently]);


    // Handle switching between upload / library
    const handleSourceChange = (source) => {
        setSource(source);
        setSubmitAttempted(false);
        if (source === 'upload') {
            setSelectedStructure('');
        } else {
            setFile(null);
            setUploadStructure(false);
        }
        setMolData('');
        setError(null);
    };

    // Library select change
    const handleLibrarySelect = async (selected_id) => {
        setSelectedStructure(selected_id);
        setFile(null);
        setUploadStructure(false);
        setMolData('');
        setError(null);
        if (selected_id) {
            try {
                const token = await getAccessTokenSilently();
                const pres = await fetch(`${import.meta.env.VITE_STORAGE_API_URL}/presigned/${selected_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!pres.ok) throw new Error('Failed to get presigned URL');
                const { url } = await pres.json();
                const fileRes = await fetch(url);
                if (!fileRes.ok) throw new Error('Failed to fetch structure file');
                const xyz = await fileRes.text();
                setMolData(xyz);
                setMolFormat('xyz');
            } catch (err) {
                setError('Failed to load structure. Please try again or select a different molecule.');
                console.error('Failed to load structure', err);
            }
        }
    };


    return (
        <Box bgcolor="rgb(247, 249, 252)" p={4}>
            <MolmakerPageTitle
                title="Advanced Analysis"
                subtitle="Submit a molecule for advanced analysis"
            />
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={3} sx={{ padding: 4 }}>
                        <Box component="form">
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
                                        onChange={e => setJobName(e.target.value)}
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
                                    onFileChange={(text, f) => {
                                        setMolData(text);
                                        setFile(f);
                                    }}
                                    uploadStructure={uploadStructure}
                                    onUploadStructureChange={setUploadStructure}
                                    moleculeName={moleculeName}
                                    onMoleculeNameChange={e => setMoleculeName(e.target.value)}
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
                                            onChange={(e, newVal) => {
                                                setTheoryType(newVal);
                                                if (newVal === 'density') {
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
                                            onChange={(e) => setTheory(e.target.value)}
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
                                                onChange={(e) => setCalculationType(e.target.value)}
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
                                                onChange={(e) => setBasisSet(e.target.value)}
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
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (/^-?\d*$/.test(val)) {
                                                        setCharge(val);
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
                                                onChange={(e) => setMultiplicity(e.target.value)}
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
						data={molData}
						format={molFormat}
						source={source}
                        sx={{ maxHeight: 437 }}
					/>
        		</Grid>
            </Grid>
        </Box>
    )
}

export default AdvancedAnalysis

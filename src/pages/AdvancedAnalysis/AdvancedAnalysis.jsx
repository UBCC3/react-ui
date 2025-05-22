import { useState, useEffect } from 'react'
import { 
    Box, 
    Grid, 
    Typography,
    Divider,
    Button,
    Paper,
    TextField,
    Skeleton,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Select,
    MenuItem,
    InputLabel,
    FormHelperText,
    Checkbox} from '@mui/material'
import MoleculeViewer from '../../components/MoleculeViewer'
// import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { fetchStructures } from '../../services/api'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import { blueGrey } from '@mui/material/colors'
import SourceSelector from './components/SourceSelector'
import LibrarySelector from './components/LibrarySelector'
import FileUploader from './components/FileUploader'
import PageTitle from '../../components/PageTitle'

const AdvancedAnalysis = () => {
    const { getAccessTokenSilently } = useAuth0();

    // const navigate = useNavigate();
    const [source, setSource] = useState('upload');  
    const [molData, setMolData] = useState('');                    // raw xyz/pdb text
    const [molFormat, setMolFormat] = useState('xyz');
    const [jobName, setJobName] = useState('');                  // job name
    const [submitAttempted, setSubmitAttempted] = useState(false); // flag to check if submit was attempted
    const [file, setFile] = useState(null);                    // file to be uploaded

    const [selectedStructure, setSelectedStructure] = useState(''); // selected structure from library
    const [uploadStructure, setUploadStructure] = useState(false); // flag to check if user wants to upload structure to library
    const [moleculeName, setMoleculeName] = useState('');        // name of the molecule to be uploaded
    const [charge, setCharge] = useState(0);                   // charge of the molecule
    const [calculationType, setCalculationType] = useState('energy'); // calculation type
    const [multiplicity, setMultiplicity] = useState(1);       // multiplicity of the molecule
    const [theoryType, setTheoryType] = useState('wavefunction');   // theory type
    const [theory, setTheory] = useState('Hartree-Fock');      // theory method
    const [basisSet, setBasisSet] = useState('STO-3G');        // basis set

    // --- library list state ---
    const [structures, setStructures] = useState([]);

    const wavefunctionTheory = ['Hartree-Fock', 'MP2', 'MP4', 'CCSD', 'CCSD(T)'];
    const densityTheory = ['BLYP', 'B3LYP', 'B3LYP-D', 'B97-D', 'BP86', 'M05', 'M05-2X', 'PBE', 'PBE-D'];
    const calculationTypes = {
        'Molecular Energy': 'energy',
        'Geometric Optimization': 'gradient',
        'Vibrational Frequency': 'hessian',
        'Molecular Orbitals': 'orbitals',
    };
    const basisSets = ['STO-3G', '6-31G', '6-31G(d)', '6-311G(2d,p)', 'cc-pVDZ', 'cc-pVTZ', 'cc-pVDZ', 'cc-pCVQZ', 'cc-pCVTZ', 'cc-pVQZ', 'jun-cc-pVDZ', 'aug-cc-pVDZ', 'aug-cc-pVTZ', 'aug-cc-pVQZ', 'other'];

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
            }
        })();
    }, [getAccessTokenSilently]);


    // Handle switching between upload / library
    const handleSourceChange = (source) => {
        setSource(source);
        setSubmitAttempted(false);
        // clear the other input
        if (source === 'upload') {
            setSelectedStructure('');
        } else {
            setFile(null);
            setUploadStructure(false);
        }
        setMolData('');
    };

    // Library select change
    const handleLibrarySelect = async (selected_id) => {
        setSelectedStructure(selected_id);
        setFile(null);
        setUploadStructure(false);
        setMolData('');
        if (selected_id) {
            try {
                const token = await getAccessTokenSilently();
                // get a presigned URL for this structure
                const pres = await fetch(`${import.meta.env.VITE_STORAGE_API_URL}/presigned/${selected_id}`, {
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


    return (
        <Box bgcolor="rgb(247, 249, 252)" p={4}>
            <PageTitle
                title="Advanced Analysis"
                subtitle="Submit a molecule for advanced analysis"
            />
            <Grid container spacing={3}>
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
                                <Divider />
                                {/* Molecule source */}
                                <Grid item>
                                    <Typography variant="body2" color="text.secondary">
                                    Molecule Source
                                    </Typography>
                                </Grid>
                                {/* Source toggle */}
                                <Grid item>
                                    <SourceSelector
                                        value={source}
                                        onChange={handleSourceChange}
                                    />
                                </Grid>
                                {/* Library picker */}
                                {source === 'library' ? (
                                    <Grid item>
                                        <LibrarySelector
                                            structures={structures}
                                            value={selectedStructure}
                                            onChange={handleLibrarySelect}
                                            disabled={source !== 'library'}
                                            error={submitAttempted && !selectedStructure}
                                            helperText={submitAttempted && !selectedStructure ? 'Please choose a molecule' : undefined}
                                        />
                                    </Grid>) : (
                                    <Grid item sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                                        {/* File uploader */}
                                        <FileUploader
                                            disabled={source !== 'upload'}
                                            fileName={file ? file.name : 'Select File'}
                                            onFileChange={(text, file) => {
                                                setMolData(text);
                                                setFile(file);
                                            }}
                                            error={submitAttempted && !file}
                                            helperText={submitAttempted && !file ? 'Please upload a file' : undefined}
                                        />
                                        <FormControlLabel
                                            disabled={source !== 'upload'}
                                            control={
                                                <Checkbox 
                                                    checked={uploadStructure} 
                                                    onChange={() => {
                                                        setUploadStructure(!uploadStructure);
                                                    }}
                                                    name="uploadStructure" 
                                                />
                                            }
                                            label="Upload Structure to Library"
                                            sx={{ marginLeft: 2 }}
                                        />
                                    </Grid>
                                )}

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
                                <Divider />
                                {/* Theory */}
                                <Grid item>
                                    <Typography variant="body2" color="text.secondary">
                                    Theory
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <FormControl>
                                        <RadioGroup 
                                            row 
                                            value={theoryType} 
                                            onChange={(e) => {
                                                setTheoryType(e.target.value);
                                                if (e.target.value === 'density') {
                                                    setTheory(densityTheory[0]);
                                                } else {
                                                    setTheory(wavefunctionTheory[0]);
                                                }
                                            }}
                                            sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}
                                        >
                                            <FormControlLabel
                                                value="wavefunction"
                                                control={<Radio />}
                                                label="Wavefunction Theory"
                                            />
                                            <FormControlLabel
                                                value="density"
                                                control={<Radio />}
                                                label="Density Functional Theory"
                                            />
                                        </RadioGroup>
                                    </FormControl>
                                </Grid>
                                <Grid item>
                                    <FormControl fullWidth>
                                        <InputLabel>Method</InputLabel>
                                        <Select
                                            value={theory}
                                            label="Theory"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setTheory(val);
                                            }}
                                        >
                                            {theoryType === 'wavefunction' ? (
                                                wavefunctionTheory.map((theory) => (
                                                    <MenuItem key={theory} value={theory}>
                                                    {theory}
                                                    </MenuItem>
                                                ))
                                            ) : (
                                                densityTheory.map((theory) => (
                                                    <MenuItem key={theory} value={theory}>
                                                    {theory}
                                                    </MenuItem>
                                                ))
                                            )}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Divider />
                                    <Grid item>
                                        <Typography variant="body2" color="text.secondary">
                                            Calculation Parameters
                                        </Typography>
                                    </Grid>
                                    {/* Calculation */}
                                    <Grid container spacing={2}>
                                        <Grid item size={{ xs: 12, md: 6 }}>
                                            <FormControl required fullWidth>
                                                <InputLabel>Calculation Type</InputLabel>
                                                <Select
                                                    value={calculationType}
                                                    label="Calculation Type"
                                                    onChange={(e) => {
                                                        setCalculationType(e.target.value);
                                                    }}
                                                >
                                                    {Object.keys(calculationTypes).map((type) => (
                                                        <MenuItem key={type} value={calculationTypes[type]}>
                                                        {type}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item size={{ xs: 12, md: 6 }}>
                                            <FormControl required fullWidth>
                                                <InputLabel>Basis Set</InputLabel>
                                                <Select
                                                    value={basisSet}
                                                    label="Basis Set"
                                                    onChange={(e) => {
                                                        setBasisSet(e.target.value);
                                                    }}
                                                >
                                                    {basisSets.map((set) => (
                                                        <MenuItem key={set} value={set}>
                                                        {set}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>


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
                <Grid item size={{ xs: 12, md: 6 }}>
                    <Paper
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '400px'
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
                                borderColor: 'grey.300',
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
    )
}

export default AdvancedAnalysis

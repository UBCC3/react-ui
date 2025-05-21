import React, { useState, useEffect } from 'react'
import { 
    Box, 
    Grid, 
    Typography,
    Divider,
    Button,
    Paper,
    TextField,
    Skeleton,
    IconButton,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Select,
    MenuItem,
    InputLabel,
    FormHelperText,
    Tooltip,
    Checkbox,
    CircularProgress
} from '@mui/material'
import MoleculeViewer from '../components/MoleculeViewer'
// import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { fetchStructures } from '../services/api'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import InfoOutlineIcon from '@mui/icons-material/InfoOutline'
import { blueGrey } from '@mui/material/colors'

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


    return (
        <Box bgcolor="rgb(247, 249, 252)" p={4}>
            <Grid container sx={{ display: 'flex', alignItems: 'start', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h5" color="text.primary" sx={{ flexGrow: 1, mb: 2 }}>
                    Advanced Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Submit your molecule for custom analysis.
                </Typography>
            </Grid>
            <Divider sx={{ my: 3 }} />
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

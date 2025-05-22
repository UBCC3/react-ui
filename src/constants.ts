import { green, blue, orange, red } from '@mui/material/colors';

export const JobStatus = {
	PENDING: 'pending',
	RUNNING: 'running',
	COMPLETED: 'completed',
	FAILED: 'failed',
	UNKNOWN: 'unknown',
};

export const statusColors = {
	'completed': green[500],
	'running': blue[500],
	'pending': orange[500],
	'failed': red[500],
};

export const basisSets = [
	'STO-3G', 
	'6-31G', 
	'6-31G(d)', 
	'6-311G(2d,p)', 
	'cc-pVDZ', 
	'cc-pVTZ', 
	'cc-pVDZ', 
	'cc-pCVQZ', 
	'cc-pCVTZ', 
	'cc-pVQZ', 
	'jun-cc-pVDZ', 
	'aug-cc-pVDZ', 
	'aug-cc-pVTZ', 
	'aug-cc-pVQZ', 
];

export const calculationTypes = [
	'Molecular Energy',
	'Geometric Optimization',
	'Vibrational Frequency',
	'Molecular Orbitals',
];

export const wavefunctionTheory = {
	'Hartree-Fock': 'scf',
	'MP2': 'mp2',
	'MP4': 'mp4',
	'CCSD': 'ccsd',
	'CCSD(T)': 'ccsd(t)',
};

export const densityTheory = [
	'BLYP', 
	'B3LYP', 
	'B3LYP-D', 
	'B97-D', 
	'BP86', 
	'M05', 
	'M05-2X', 
	'PBE', 
	'PBE-D'
];

export const multiplicityOptions = {
	'Singlet': 1,
	'Doublet': 2,
	'Triplet': 3,
	'Quartet': 4,
	'Quintet': 5,
	'Sextet': 6,
}
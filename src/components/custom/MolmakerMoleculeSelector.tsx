import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Button,
  FormHelperText,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MolmakerRadioGroup from './MolmakerRadioGroup';
import MolmakerDropdown from './MolmakerDropdown';
import MolmakerTextField from './MolmakerTextField';
import MolmakerSectionHeader from './MolmakerSectionHeader';

/**
 * Unified molecule source selector, combining upload & library options.
 *
 * Props:
 * - source: 'upload' | 'library'
 * - onSourceChange: fn(newSource)
 * - structures: [{ structure_id, name }]
 * - selectedStructure: string
 * - onLibrarySelect: fn(id)
 * - file: File|null
 * - onFileChange: fn(text, file)
 * - uploadStructure: bool
 * - onUploadStructureChange: fn(bool)
 * - moleculeName: string
 * - onMoleculeNameChange: fn(event)
 * - submitAttempted: bool
 */
const MolmakerMoleculeSelector = ({
	source,
	onSourceChange,
	structures,
	selectedStructure,
	onLibrarySelect,
	file,
	onFileChange,
	uploadStructure,
	onUploadStructureChange,
	moleculeName,
	onMoleculeNameChange,
	submitAttempted
}) => (
  	<Grid container sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
		<Grid>
			<MolmakerSectionHeader text="Molecule Source" />
		</Grid>
		{/* Source radios */}
		<Grid>
			<MolmakerRadioGroup
				name="source"
				value={source}
				onChange={(_, newVal) => onSourceChange(newVal)}
				options={[
					{ value: 'upload', label: 'Upload File' },
					{ value: 'library', label: 'Select from Library' }
				]}
				row
			/>
		</Grid>

		{/* Library selector or File uploader */}
		{source === 'library' ? (
			<Grid>
				<MolmakerDropdown
					fullWidth
					label="Select Molecule"
					value={selectedStructure}
					onChange={e => onLibrarySelect(e.target.value)}
					options={structures.map(s => ({ value: s.structure_id, label: s.name }))}
					required
					error={submitAttempted && !selectedStructure}
					helperText={submitAttempted && !selectedStructure ? 'Please choose a molecule' : ''}
				/>
			</Grid>
		) : (
			<Grid sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
					<Button
						variant="contained"
						component="label"
						disabled={source !== 'upload'}
						startIcon={<CloudUploadIcon />}
						sx={{ textTransform: 'none', minWidth: 180 }}
					>
						{file ? file.name : 'Select File'}
						<input
							hidden
							type="file"
							accept=".xyz"
							onChange={async e => {
								const f = e.target.files?.[0];
								if (!f) return;
								const reader = new FileReader();
								reader.onload = ev => onFileChange(ev.target?.result, f);
								reader.readAsText(f);
							}}
						/>
					</Button>
					{submitAttempted && !file && (
						<FormHelperText error sx={{ mt: 1, ml: 0 }}>
							Please upload a file
						</FormHelperText>
					)}
				</Box>
				<FormControlLabel
					disabled={source !== 'upload'}
					control={
						<Checkbox
							checked={uploadStructure}
							onChange={() => onUploadStructureChange(!uploadStructure)}
							name="uploadStructure"
						/>
					}
					label="Upload Structure to Library"
					sx={{ ml: 2 }}
				/>
			</Grid>
		)}

		{/* Molecule name when uploading to library */}
		{source === 'upload' && uploadStructure && (
			<Grid>
				<MolmakerTextField
					fullWidth
					label="Molecule Name"
					value={moleculeName}
					onChange={onMoleculeNameChange}
					required
					error={submitAttempted && !moleculeName}
					helperText={submitAttempted && !moleculeName ? 'Please enter a name' : ''}
					sx={{ mt: 1 }}
				/>
			</Grid>
		)}
	</Grid>
);

MolmakerMoleculeSelector.propTypes = {
	source: PropTypes.oneOf(['upload', 'library']).isRequired,
	onSourceChange: PropTypes.func.isRequired,
	structures: PropTypes.arrayOf(
		PropTypes.shape({ 
			structure_id: PropTypes.string, 
			name: PropTypes.string 
		})
	).isRequired,
	selectedStructure: PropTypes.string.isRequired,
	onLibrarySelect: PropTypes.func.isRequired,
	file: PropTypes.object,
	onFileChange: PropTypes.func.isRequired,
	uploadStructure: PropTypes.bool.isRequired,
	onUploadStructureChange: PropTypes.func.isRequired,
	moleculeName: PropTypes.string.isRequired,
	onMoleculeNameChange: PropTypes.func.isRequired,
	submitAttempted: PropTypes.bool.isRequired
};

export default MolmakerMoleculeSelector;

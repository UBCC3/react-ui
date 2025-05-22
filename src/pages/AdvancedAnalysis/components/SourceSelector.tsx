import { FormControl, RadioGroup, FormControlLabel, Radio } from '@mui/material';

export interface SourceSelectorProps {
  	value: 'upload' | 'library';
  	onChange: (value: 'upload' | 'library') => void;
}

export default function SourceSelector({ value, onChange }: SourceSelectorProps) {
  	return (
		<FormControl component="fieldset">
			<RadioGroup
				row
				value={value}
				onChange={(e) => onChange(e.target.value as 'upload' | 'library')}
				sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}
			>
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
	);
}

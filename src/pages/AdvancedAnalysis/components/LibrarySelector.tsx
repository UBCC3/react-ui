import {
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormHelperText
} from '@mui/material';

export interface LibrarySelectorProps {
	structures: Array<{ structure_id: string; name: string }>;
	value: string;
	onChange: (id: string) => void;
	disabled?: boolean;
	error?: boolean;
	helperText?: string;
}

export default function LibrarySelector({
	structures,
	value,
	onChange,
	disabled = false,
	error = false,
	helperText
}: LibrarySelectorProps) {
  	return (
		<FormControl fullWidth disabled={disabled} error={error}>
			<InputLabel id="library-select-label">Select Molecule</InputLabel>
			<Select
				labelId="library-select-label"
				id="library-select"
				value={value}
				label="Select Molecule"
				onChange={(e) => onChange(e.target.value as string)}
			>
			{structures.map(({ structure_id, name }) => (
				<MenuItem key={structure_id} value={structure_id}>
					{name}
				</MenuItem>
			))}
			</Select>
			{helperText && (
				<FormHelperText>{helperText}</FormHelperText>
			)}
		</FormControl>
  	);
}

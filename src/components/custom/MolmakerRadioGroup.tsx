import PropTypes from "prop-types";
import { 
    FormControl, 
    RadioGroup, 
    FormControlLabel, 
    Radio, 
    FormHelperText,
    type SxProps,
    type Theme,
} from "@mui/material";
import type { ChangeEvent } from "react";

interface RadioOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface MolmakerRadioGroupProps {
    name: string;
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>, value: string) => void;
    options: RadioOption[];
    row?: boolean;
    required?: boolean;
    error?: boolean;
    helperText?: string;
    disabled?: boolean;
    sx?: SxProps<Theme>;
}

/**
 * Generic radio-group selector for Molecule Maker app.
 *
 * Props:
 * - name: string (group name)
 * - value: any (current selected value)
 * - onChange: function(event, value) (handler for selection changes)
 * - options: Array<{ value: any, label: string, disabled?: bool }> (radio items)
 * - row: bool (layout horizontally)
 * - required: bool
 * - error: bool
 * - helperText: string
 * - disabled: bool (disables whole group)
 * - sx: object (optional styling overrides on FormControl)
 */
const MolmakerRadioGroup = ({
	name,
	value,
	onChange,
	options,
	row = false,
	required = false,
	error = false,
	helperText = "",
	disabled = false,
	sx = {},
}: MolmakerRadioGroupProps) => (
	<FormControl component="fieldset" required={required} error={error} disabled={disabled} sx={sx}>
		<RadioGroup row={row} name={name} value={value} onChange={onChange}>
			{options.map(({ value: optVal, label: optLabel, disabled: optDisabled }) => (
				<FormControlLabel
					key={optVal}
					value={optVal}
					control={<Radio />}
					label={optLabel}
					disabled={optDisabled}
				/>
			))}
		</RadioGroup>
		{helperText && <FormHelperText>{helperText}</FormHelperText>}
	</FormControl>
);

/**
 * Runtime prop validation for MolmakerRadioGroup.
 */
MolmakerRadioGroup.propTypes = {
	name: PropTypes.string.isRequired,
	value: PropTypes.any.isRequired,
	onChange: PropTypes.func.isRequired,
	options: PropTypes.arrayOf(
		PropTypes.shape({
			value: PropTypes.any.isRequired,
			label: PropTypes.string.isRequired,
			disabled: PropTypes.bool,
		}),
	).isRequired,
	row: PropTypes.bool,
	required: PropTypes.bool,
	error: PropTypes.bool,
	helperText: PropTypes.string,
	disabled: PropTypes.bool,
	sx: PropTypes.object,
};

export default MolmakerRadioGroup;

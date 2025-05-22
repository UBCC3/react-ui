import React from 'react';
import PropTypes from 'prop-types';
import {
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormHelperText
} from '@mui/material';

/**
 * Generic dropdown selector for MolMaker.
 *
 * Props:
 * - label: string (InputLabel text)
 * - value: any (current selected value)
 * - onChange: function(event) (handler for selection changes)
 * - options: Array<{ value: any, label: string }> (dropdown items)
 * - required: bool
 * - error: bool
 * - helperText: string
 * - disabled: bool
 * - fullWidth: bool
 * - sx: object (optional styling overrides)
 */
const MolmakerDropdown = ({
	label,
	value,
	onChange,
	options,
	required = false,
	error = false,
	helperText = '',
	disabled = false,
	fullWidth = true,
	sx = {}
}) => (
	<FormControl
		required={required}
		error={error}
		disabled={disabled}
		fullWidth={fullWidth}
		sx={sx}
	>
		<InputLabel>{label}</InputLabel>
		<Select
		value={value}
		label={label}
		onChange={onChange}
		>
			{options.map(({ value: optValue, label: optLabel }) => (
				<MenuItem key={optValue} value={optValue}>
					{optLabel}
				</MenuItem>
			))}
		</Select>
		{helperText && (
			<FormHelperText>{helperText}</FormHelperText>
		)}
  	</FormControl>
);

MolmakerDropdown.propTypes = {
	label: PropTypes.string.isRequired,
	value: PropTypes.any.isRequired,
	onChange: PropTypes.func.isRequired,
	options: PropTypes.arrayOf(
		PropTypes.shape({
			value: PropTypes.any.isRequired,
			label: PropTypes.string.isRequired
		})
	).isRequired,
	required: PropTypes.bool,
	error: PropTypes.bool,
	helperText: PropTypes.string,
	disabled: PropTypes.bool,
	fullWidth: PropTypes.bool,
	sx: PropTypes.object
};

export default MolmakerDropdown;

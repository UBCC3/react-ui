import React from 'react';
import PropTypes from 'prop-types';
import { TextField } from '@mui/material';

/**
 * Generic text input component for Molecule Maker app.
 *
 * Props:
 * - label: string (TextField label)
 * - value: any (current input value)
 * - onChange: function(event) (handler for input changes)
 * - required: bool
 * - error: bool
 * - helperText: string
 * - disabled: bool
 * - type: string (e.g., "text", "number")
 * - fullWidth: bool
 * - multiline: bool
 * - rows: number (only if multiline)
 * - sx: object (optional styling overrides)
 * - slotProps: object (optional props for TextField slots)
 */
const MolmakerTextField = ({
	label,
	value,
	onChange,
	required = false,
	error = false,
	helperText = '',
	disabled = false,
	type = 'text',
	fullWidth = true,
	multiline = false,
	rows = 1,
	sx = {},
	slotProps = {},
}) => (
	<TextField
		label={label}
		value={value}
		onChange={onChange}
		required={required}
		error={error}
		helperText={helperText}
		disabled={disabled}
		type={type}
		fullWidth={fullWidth}
		multiline={multiline}
		rows={multiline ? rows : undefined}
		sx={sx}
		slotProps={slotProps}
	/>
);

MolmakerTextField.propTypes = {
	label: PropTypes.string.isRequired,
	value: PropTypes.any.isRequired,
	onChange: PropTypes.func,
	required: PropTypes.bool,
	error: PropTypes.bool,
	helperText: PropTypes.string,
	disabled: PropTypes.bool,
	type: PropTypes.string,
	fullWidth: PropTypes.bool,
	multiline: PropTypes.bool,
	rows: PropTypes.number,
	sx: PropTypes.object,
	slotProps: PropTypes.object,
};

export default MolmakerTextField;

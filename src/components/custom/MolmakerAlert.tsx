import React from 'react'
import { Alert } from '@mui/material'
import PropTypes from 'prop-types'

import type { AlertColor } from '@mui/material/Alert';

/**
 * Maps each alert severity to its corresponding display color.
 */
const colorMap: Record<AlertColor, string> = {
	error: 'rgb(211, 47, 47)',
	warning: 'rgb(245, 124, 0)',
	info: 'rgb(3, 169, 244)',
	success: 'rgb(76, 175, 80)',
}

/**
 * Props for the MolmakerAlert component.
 */
interface MolmakerAlertProps {
	text: string;
	severity?: AlertColor;
	outline?: AlertColor;
	sx?: object;
}

/**
 * Renders a reusable MUI alert with an optional colored outline.
 * 
 * The default value of alert severity and outline is "error".
 * Additional MUI styles can be passed through `sx` and will override
 * the default outline styling when conflicts occur.
 */
const MolmakerAlert: React.FC<MolmakerAlertProps> = ({
	text,
	severity = 'error',
	outline = 'error',
	sx = {}
}) => {
	return (
		<Alert 
			severity={severity}
			sx={{
				outline: `1px solid ${colorMap[outline]}`,
				...sx
			}}
		>
			{text}
		</Alert>
	)
}

/**
 * Runtime prop validation for MolmakerAlert.
 */
MolmakerAlert.propTypes = {
	text: PropTypes.string.isRequired,
	severity: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
	outline: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
	sx: PropTypes.object
};

export default MolmakerAlert
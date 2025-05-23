import React from 'react'
import { Alert, Box } from '@mui/material'
import PropTypes from 'prop-types'

import type { AlertColor } from '@mui/material/Alert';

const colorMap: Record<AlertColor, string> = {
	error: 'rgb(211, 47, 47)',
	warning: 'rgb(245, 124, 0)',
	info: 'rgb(3, 169, 244)',
	success: 'rgb(76, 175, 80)',
}

interface MolmakerAlertProps {
	text: string;
	severity?: AlertColor;
	outline?: AlertColor;
	sx?: object;
}

const MolmakerAlert: React.FC<MolmakerAlertProps> = ({
	text,
	severity = 'error',
	outline = 'error',
	sx = {}
}) => {
	return (
		<Box bgcolor={'rgb(247, 249, 252)'} p={4}>
			<Alert 
				severity={severity}
				sx={{
					outline: `1px solid ${colorMap[outline]}`,
					...sx
				}}
			>
				{text}
			</Alert>
		</Box>
	)
}

MolmakerAlert.propTypes = {
	text: PropTypes.string.isRequired,
	severity: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
	outline: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
	sx: PropTypes.object
};

export default MolmakerAlert
import React from 'react'
import { Typography } from '@mui/material'
import PropTypes from 'prop-types'

/**
 * MolmakerSectionHeader component for displaying section headers in the Molmaker form.
 *
 * Props:
 * - text: string (header text)
 * - sx: object (optional styling overrides)
 */
const MolmakerSectionHeader = ({
	text,
	sx = {}
}) => {
	return (
		<Typography 
			variant="body2" 
			color="text.secondary" 
			sx={{sx}}
		>
			{text}
		</Typography>
	)
}

MolmakerSectionHeader.propTypes = {
	text: PropTypes.string.isRequired,
	sx: PropTypes.object
};

export default MolmakerSectionHeader
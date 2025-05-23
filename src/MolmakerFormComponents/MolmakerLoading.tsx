import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

const MolmakerLoading = () => {
	return (
		<Box
			display='flex'
			justifyContent='center'
			alignItems='center'
			bgcolor={'rgb(247, 249, 252)'}
			height={'80vh'}
			flexDirection={{ xs: 'column', sm: 'column' }}
		>
			<CircularProgress
				size={80}
				thickness={4}
				disableShrink
			/>
			<Typography
				variant='h6'
				mt={4}
				color='text.secondary'
			>
				Please wait while we process your request...
			</Typography>
		</Box>
	)
}

export default MolmakerLoading
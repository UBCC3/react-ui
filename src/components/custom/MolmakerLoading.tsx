import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

const MolmakerLoading = () => {
	return (
		<Box
			display='flex'
			justifyContent='center'
			alignItems='center'
			flexDirection={{ xs: 'column', sm: 'column' }}
			sx={{
				height: `calc(100vh - 64px)`,
				backgroundColor: 'background.default',
			}}
			className="bg-stone-100 dark:bg-stone-900"
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
import React from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'
import ExitToAppOutlinedIcon from '@mui/icons-material/ExitToAppOutlined';

const NotFound = () => {
	return (
		<Box bgcolor={'rgb(247, 249, 252)'} p={4} display="flex" justifyContent="center" alignItems="center" height="80vh" flexDirection="column">
			<Typography variant="h2" color="text.secondary">
				Page not found
			</Typography>
			<Typography variant="body1" color="text.secondary" mt={4}>
				Uh oh! It seems like the page you are looking for does not exist.
			</Typography>
			<Button 
				variant="contained" 
				color="primary" 
				sx={{ mt: 4, textTransform: 'none' }}
				onClick={() => window.location.href = '/'}
				startIcon={<ExitToAppOutlinedIcon fontSize="small" />}
			>
				Go to Home
			</Button>
		</Box>
	)
}

export default NotFound
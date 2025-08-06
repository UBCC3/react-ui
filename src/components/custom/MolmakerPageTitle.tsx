import React from 'react'
import { 
	Grid, 
	Typography, 
	Divider 
} from '@mui/material'

const MolmakerPageTitle = ({ title, subtitle, removeBottomPadding=false }) => {
  	return (
		<React.Fragment>
			<Grid container sx={{ display: 'flex', alignItems: 'start', flexDirection: 'column', justifyContent: 'center' }}>
				<Typography variant="h5" color="text.primary" sx={{ flexGrow: 1, mb: 2 }}>
					{title}
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
					{subtitle}
				</Typography>
			</Grid>
			<Divider sx={{ mb: (removeBottomPadding ? 0: 3), mt: 3 }} />
		</React.Fragment>
  	)
}

export default MolmakerPageTitle
import { CardContent, Typography, Card, CardActions, CardActionArea, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

function CreateJobCard() {    
	return (
		<Card sx={{ maxWidth: 350, marginBottom: 2 }}>
			<CardContent>
				<Typography variant="h6" component="div" color="text.secondary">
					<ArrowUpwardIcon fontSize="large" sx={{ verticalAlign: 'bottom', marginRight: 2 }} />
					Submit a Standard Analysis
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ paddingTop: 2 }}>
					Run a standard workflow on your molecule.
				</Typography>
			</CardContent>
			<CardActionArea>
				<CardActions>
					<IconButton color="primary" aria-label="add job" href='/submit'>
						<AddIcon fontSize="large" />
					</IconButton>
				</CardActions>
			</CardActionArea>
		</Card>
	)
}

export default CreateJobCard
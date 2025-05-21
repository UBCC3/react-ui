import { 
	Typography,
	Card,
	CardContent,
	Box
} from '@mui/material'

const StatusCard = ({ status, count, bgColor, fgColor, icon }) => {
	return (
		<Card sx={{ backgroundColor: bgColor, color: fgColor }}>
			<CardContent>
				<Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
					Total {status}
				</Typography>
				<Box sx={{ display: 'flex', alignItems: 'center' }}>
					{icon}
					<Typography variant="h5" component="div" sx={{ flexGrow: 1, ml: 2 }}>
						{count}
					</Typography>
				</Box>
			</CardContent>
		</Card>
	)
}

export default StatusCard
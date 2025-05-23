import { Grid } from '@mui/material'
import { 
	CheckCircleOutlined, 
	SyncOutlined, 
	PauseCircleOutlineOutlined, 
	ErrorOutlineOutlined 
} from '@mui/icons-material'
import { green, blue, orange, red } from '@mui/material/colors'
import { JobStatus } from '../../../constants'
import StatusCard from './StatusCard'
import { capitalizeFirstLetter } from '../../../utils'

const JobsStatus = ({ jobs }) => {
	return (
		<Grid container spacing={3} sx={{ mb: 4 }}>
			<Grid size={{ xs: 12, md: 3 }}>
				<StatusCard 
					status={capitalizeFirstLetter(JobStatus.COMPLETED)}
					count={jobs.filter(job => job.status === JobStatus.COMPLETED).length} 
					bgColor={green[50]}
					fgColor={green[500]}
					icon={<CheckCircleOutlined fontSize='medium' color="inherit" sx={{ color: green[500] }} />}
				/>
			</Grid>
			<Grid size={{ xs: 12, md: 3 }}>
				<StatusCard
					status={capitalizeFirstLetter(JobStatus.RUNNING)}
					count={jobs.filter(job => job.status === JobStatus.RUNNING).length} 
					bgColor={blue[50]}
					fgColor={blue[500]}
					icon={<SyncOutlined fontSize='medium' color="inherit" sx={{ color: blue[500] }} />}

				/>
			</Grid>
			<Grid size={{ xs: 12, md: 3 }}>
				<StatusCard
					status={capitalizeFirstLetter(JobStatus.PENDING)}
					count={jobs.filter(job => job.status === JobStatus.PENDING).length} 
					bgColor={orange[50]}
					fgColor={orange[500]}
					icon={<PauseCircleOutlineOutlined fontSize='medium' color="inherit" sx={{ color: orange[500] }} />}
				/>
			</Grid>
			<Grid size={{ xs: 12, md: 3 }}>
				<StatusCard
					status={capitalizeFirstLetter(JobStatus.FAILED)}
					count={jobs.filter(job => job.status === JobStatus.FAILED).length} 
					bgColor={red[50]}
					fgColor={red[500]}
					icon={<ErrorOutlineOutlined fontSize='medium' color="inherit" sx={{ color: red[500] }} />}
				/>
			</Grid>
		</Grid>
	)
}

export default JobsStatus
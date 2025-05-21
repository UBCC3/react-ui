import React from 'react'
import { Box, Grid, Typography, Tabs, Tab, Divider, Paper } from '@mui/material'
import PropTypes from 'prop-types'

function CustomTabPanel(props) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`simple-tabpanel-${index}`}
			aria-labelledby={`simple-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ p: 3 }}>{children}</Box>}
		</div>
	);
}

CustomTabPanel.propTypes = {
	children: PropTypes.node,
	index: PropTypes.number.isRequired,
	value: PropTypes.number.isRequired,
};

function a11yProps(index) {
	return {
		id: `simple-tab-${index}`,
		'aria-controls': `simple-tabpanel-${index}`,
	};
}

const SubmitTabs = () => {
	const [value, setValue] = React.useState(0);
	const handleChange = (event, newValue) => {
		setValue(newValue);
	};

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
				<Grid container sx={{ display: 'flex', alignItems: 'start', flexDirection: 'column', justifyContent: 'center' }}>
						<Typography variant="h5" color="text.primary" sx={{ flexGrow: 1, mb: 2 }}>
						Standard Analysis
						</Typography>
						<Typography variant="body2" color="text.secondary">
						A three step workflow: Geometry Optimization, Vibrational Frequency Analysis, and Molecular Orbital Analysis.
						</Typography>
				</Grid>
				<Divider sx={{ my: 3 }} />
				<Paper sx={{ width: '100%' }}>
						<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
								<Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
								<Tab label="Item One" {...a11yProps(0)} />
								<Tab label="Item Two" {...a11yProps(1)} />
								<Tab label="Item Three" {...a11yProps(2)} />
								</Tabs>
						</Box>
						<CustomTabPanel value={value} index={0}>
								Item One
						</CustomTabPanel>
						<CustomTabPanel value={value} index={1}>
								Item Two
						</CustomTabPanel>
						<CustomTabPanel value={value} index={2}>
								Item Three
						</CustomTabPanel>
				</Paper>
		</Box>
	)
}

export default SubmitTabs
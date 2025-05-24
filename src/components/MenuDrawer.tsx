import React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import {
	Divider, 
	List, 
	ListItemButton, 
	ListItemIcon,
	ListItemText, 
	Typography,
} from '@mui/material';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import logo from '../assets/logo.svg';
import { useNavigate } from 'react-router-dom';
import { useDrawer } from './DrawerContext';
import { blueGrey, cyan, lightBlue } from '@mui/material/colors';

const DRAWER_WIDTH  = 250;
const CLOSED_WIDTH  = 56;

const openedMixin = (theme) => ({
	width: DRAWER_WIDTH,
	transition: theme.transitions.create('width', {
		easing  : theme.transitions.easing.sharp,
		duration: theme.transitions.duration.enteringScreen,
	}),
	overflowX: 'hidden',
});

const closedMixin = (theme) => ({
	width: CLOSED_WIDTH,
	transition: theme.transitions.create('width', {
		easing  : theme.transitions.easing.sharp,
		duration: theme.transitions.duration.leavingScreen,
	}),
	overflowX: 'hidden',
});

const PermanentDrawer = styled(Drawer, {
	shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
	'& .MuiDrawer-paper': {
		boxSizing: 'border-box',
		backgroundColor: 'rgb(35, 48, 68)',
		color: theme.palette.text.secondary,
		...(open ? openedMixin(theme) : closedMixin(theme)),
	},
}));

const DrawerHeader = styled('div')(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	padding: theme.spacing(0, 1),
	...theme.mixins.toolbar,
	justifyContent: 'flex-end',
}));

export default function MenuDrawer() {
	const { open, toggle } = useDrawer();
	const navigate         = useNavigate();
	const [selectedIndex, setSelectedIndex] = React.useState(0);

	const drawerContent = (
		<>
			<DrawerHeader sx={{ justifyContent: open ? 'space-between' : 'center', marginLeft: open ? 2: 0 }}>
				{open && (
					<Typography
						variant="h6"
						component="a"
						href="/"
						sx={{
							display: 'flex',
							alignItems: 'center',
							textDecoration: 'none',
							color: 'rgb(238,238,238)',
						}}
					>
						<img src={logo} alt="Logo" style={{ height: 35, marginRight: 12 }} />
						MolMaker
					</Typography>
				)}
				<IconButton onClick={toggle} sx={{ color: 'grey.300' }}>
					{open ? <ChevronLeftOutlinedIcon /> : <MenuIcon />}
				</IconButton>
			</DrawerHeader>
			<Divider />

			<List
				component="nav"
			>
				{[
					{
						text: 'Dashboard',
						icon: <DashboardOutlinedIcon />,
						path: '/'
					},
					{
						text: 'Standard Analysis',
						icon: <AutoModeIcon />,
						path: '/submit'
					},
					{
						text: 'Advanced Analysis', 
						icon: <TuneOutlinedIcon />,
						path: '/advanced'
					},
					{ 
						text: 'Molecule Library',
						icon: <CollectionsOutlinedIcon />,
						path: '/library'
					},
				].map(({ text, icon, path }, idx) => (
					<ListItemButton
						key={text}
						selected={selectedIndex === idx}
						onClick={() => {
							setSelectedIndex(idx);
							navigate(path);
						}}
						sx={{
							py: 2,
							justifyContent: open ? 'initial' : 'center',
							'&.Mui-selected': {
								bgcolor: 'rgb(50, 70, 100)',
								'&:hover': { bgcolor: 'rgb(69, 93, 130)'}
							},
							'&:hover': { bgcolor: 'rgb(69, 93, 130)'},
						}}
					>
						<ListItemIcon sx={{ color: 'grey', minWidth: 0, mr: open ? 3 : 'auto' }}>
							{icon}
						</ListItemIcon>
						{open && (
							<ListItemText
								primary={
									<Typography 
										sx={{ 
											color: 'rgb(238,238,238)',
											fontSize: '0.875rem', 
										}}
									>
										{text}
									</Typography>}
							/>
						)}
					</ListItemButton>
				))}
			</List>
		</>
	);

	return (
		<Box component="nav" sx={{ flexShrink: 0 }}>
			<PermanentDrawer variant="permanent" open={open}>
				{drawerContent}
			</PermanentDrawer>
		</Box>
	);
}

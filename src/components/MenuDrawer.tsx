import React, { useEffect } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import {
	Collapse,
	Divider, 
	List, 
	ListItemButton, 
	ListItemIcon,
	ListItemText, 
	Typography,
} from '@mui/material';
import { AdminPanelSettingsOutlined, TuneOutlined, DashboardOutlined, CollectionsOutlined, AutoMode, PeopleAltOutlined, ExpandLess, ExpandMore, AccountCircleOutlined } from '@mui/icons-material';
import logo from '../assets/logo.svg';
import { useNavigate } from 'react-router-dom';
import { useDrawer } from './DrawerContext';
import { useAuth0 } from '@auth0/auth0-react';
import { upsertCurrentUser } from '../services/api';
import { grey } from '@mui/material/colors';

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
	const { user, getAccessTokenSilently } = useAuth0();
	const { open, toggle } = useDrawer();
	const navigate         = useNavigate();
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [role, setRole] = React.useState('');
	const [groupId, setGroupId] = React.useState('');
	const [expanded, setExpanded] = React.useState(false);

	useEffect(() => {
		const fetchUserRoleAndGroup = async () => {
			if (user) {
				const token = await getAccessTokenSilently();
				const result = await upsertCurrentUser(token, user.email || '');
				setRole(result.data.role || '');
				setGroupId(result.data.group_id || '');
			}
		};
		fetchUserRoleAndGroup();
	}, [user]);

	const drawerContent = (
		<>
			<DrawerHeader sx={{ justifyContent: open ? 'space-between' : 'center', paddingLeft: open ? 2: 0, bgcolor: 'rgba(25, 35, 51, 0.3)' }}>
				{open && (
					<Typography
						variant="h6"
						component="a"
						href="/"
						sx={{
							display: 'flex',
							alignItems: 'center',
							textDecoration: 'none',
							color: grey[300],
							fontSize: '1.2rem',
						}}
					>
						<img src={logo} alt="Logo" style={{ height: 35, marginRight: '1.2rem' }} />
						MolMaker
					</Typography>
				)}
				<IconButton onClick={toggle} sx={{ color: grey[300] }}>
					{open ? <ChevronLeftOutlinedIcon /> : <MenuIcon />}
				</IconButton>
			</DrawerHeader>
			<Divider sx={{ bgcolor: grey[700] }} />
			<List
				component="nav"
			>
				{[
					{
						text: 'My Dashboard',
						icon: <DashboardOutlined />,
						path: '/'
					},
					{
						text: 'Standard Analysis',
						icon: <AutoMode />,
						path: '/submit'
					},
					{
						text: 'Advanced Analysis', 
						icon: <TuneOutlined />,
						path: '/advanced'
					},
					{ 
						text: 'My Structure Library',
						icon: <CollectionsOutlined />,
						path: '/library'
					}
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
								bgcolor: 'rgb(45, 61, 84)',
								'&:hover': { bgcolor: 'rgb(58, 76, 103)'}
							},
							'&:hover': { bgcolor: 'rgb(58, 76, 103)'},
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
											color: grey[500],
											fontSize: '0.9rem', 
										}}
									>
										{text}
									</Typography>}
							/>
						)}
					</ListItemButton>
				))}
				{groupId && (
					<>
						<Divider sx={{ bgcolor: grey[700] }} />
						<ListItemButton
							key={'my-group'}
							selected={selectedIndex === 4}
							onClick={() => {
								setSelectedIndex(4);
								navigate('/group');
							}}
							sx={{
								py: 2,
								justifyContent: open ? 'initial' : 'center',
								'&.Mui-selected': {
									bgcolor: 'rgb(45, 61, 84)',
									'&:hover': { bgcolor: 'rgb(58, 76, 103)'}
								},
								'&:hover': { bgcolor: 'rgb(58, 76, 103)'},
							}}
						>
							<ListItemIcon sx={{ color: 'grey', minWidth: 0, mr: open ? 3 : 'auto' }}>
								<PeopleAltOutlined />
							</ListItemIcon>
							<ListItemText
								primary={
									<Typography 
										sx={{ 
											color: grey[500],
											fontSize: '0.9rem', 
										}}
									>
										My Group
									</Typography>}
							/>
						</ListItemButton>
					</>
				)}
				{role === 'admin' && (
					<>
						<Divider sx={{ bgcolor: grey[700] }} />
						<ListItemButton
							key={'admin-panel'}
							selected={selectedIndex === 5}
							onClick={() => {
								setSelectedIndex(5);
								navigate('/admin');
							}}
							sx={{
								py: 2,
								justifyContent: open ? 'initial' : 'center',
								'&.Mui-selected': {
									bgcolor: 'rgb(45, 61, 84)',
									'&:hover': { bgcolor: 'rgb(58, 76, 103)'}
								},
								'&:hover': { bgcolor: 'rgb(58, 76, 103)'},
							}}
						>
							<ListItemIcon sx={{ color: 'grey', minWidth: 0, mr: open ? 3 : 'auto' }}>
								<AdminPanelSettingsOutlined />
							</ListItemIcon>
							<ListItemText
								primary={
									<Typography 
										sx={{ 
											color: grey[500],
											fontSize: '0.9rem', 
										}}
									>
										Admin Panel
									</Typography>}
							/>
							<IconButton
								size="small"
								sx={{ color: 'grey', ml: 1 }}
								onClick={(e) => {
									e.stopPropagation();
									setExpanded(!expanded);
								}}
							>
								{expanded ? <ExpandLess sx={{ color: 'grey' }}/> : <ExpandMore sx={{ color: 'grey' }}/>}
							</IconButton>
						</ListItemButton>
						<Collapse in={expanded} timeout="auto" unmountOnExit>
							<List component="div" disablePadding>
								<ListItemButton 
									key={'admin-panel'}
									selected={selectedIndex === 6}
									onClick={() => {
										setSelectedIndex(6);
										navigate('/users');
									}}
									sx={{
										py: 2,
										pl: open ? 4 : 2,
										justifyContent: open ? 'initial' : 'center',
										'&.Mui-selected': {
											bgcolor: 'rgb(45, 61, 84)',
											'&:hover': { bgcolor: 'rgb(58, 76, 103)'}
										},
										'&:hover': { bgcolor: 'rgb(58, 76, 103)'},
									}}
								>
									<ListItemIcon sx={{ color: 'grey', minWidth: 0, mr: open ? 3 : 'auto' }}>
										<AccountCircleOutlined />
									</ListItemIcon>
									<ListItemText
										primary={
											<Typography 
												sx={{ 
													color: grey[500],
													fontSize: '0.8rem', 
												}}
											>
												Users List
											</Typography>}
									/>
								</ListItemButton>
							</List>
					</Collapse>
					</>
				)}
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

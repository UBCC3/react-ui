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
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrawer } from './DrawerContext';
import { useAuth0 } from '@auth0/auth0-react';
import { upsertCurrentUser } from '../services/api';
import { blue, grey } from '@mui/material/colors';
import { APP_BAR_HEIGHT } from '../constants';

// Opened drawer width in pixels
const DRAWER_WIDTH  = 250;
// Collapsed drawer width in pixels
const CLOSED_WIDTH  = 56;

/**
 * Returns the styling user when the drawer is fully opened.
 * 
 * This expands the drawer to the normal drawer width and applies
 * the opening transition animation from the Material UI theme.
 */
const openedMixin = (theme) => ({
	width: DRAWER_WIDTH,
	transition: theme.transitions.create('width', {
		easing  : theme.transitions.easing.sharp,
		duration: theme.transitions.duration.enteringScreen,
	}),
	overflowX: 'hidden',
});

/**
 * Returns the styling used when the drawer is collapsed.
 * 
 * This shrinks the drawer to the compact icon-only width and applies
 * the closing transition animation from the Material UI theme
 */
const closedMixin = (theme) => ({
	width: CLOSED_WIDTH,
	transition: theme.transitions.create('width', {
		easing  : theme.transitions.easing.sharp,
		duration: theme.transitions.duration.leavingScreen,
	}),
	overflowX: 'hidden',
});

/**
 * Permanent Material UI drawer with custom open and closed styling.
 * 
 * The `open` prop is used only for styling and is not forwarded to the
 * underlying DOM element. This prevents invalid HTML attributes from appearing.
 */
const PermanentDrawer = styled(Drawer, {
	shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
	'& .MuiDrawer-paper': {
		boxSizing: 'border-box',
		color: grey[300],
		border: '1px solid',
		borderColor: 'divider',
		...(open ? openedMixin(theme) : closedMixin(theme)),
	},
}));

/**
 * Header section sinside the drawer.
 * 
 * This align the logo and drawer toggle button while also applying
 * Material UI's toolbar spacing so the drawer header matches the app bar height.
 */
const DrawerHeader = styled('div')(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	padding: theme.spacing(0, 1),
	...theme.mixins.toolbar,
	justifyContent: 'flex-end',
}));

/**
 * Side navigation drawer for the application.
 * 
 * This component handles:
 * - Opening and closing the drawer
 * - Showing navigation links
 * - Highlithing the current page
 * - Fetching the current user's role and group id
 * - Showing group-only navigation when the user belongs to a group
 * - Showing admin-only navigation when the user has the admin rule
 * - Expanding and collapsing the admin submenu
 */
export default function MenuDrawer() {
	const { user, getAccessTokenSilently } = useAuth0();
	const { open, toggle } = useDrawer();
	const navigate         = useNavigate();
	const location = useLocation(); 
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [role, setRole] = React.useState('');
	const [groupId, setGroupId] = React.useState('');
	const [expanded, setExpanded] = React.useState(false);

    /**
     * Fethces the authenticated user's role and group id.
     * 
     * The role controls whether the admin navigation is displayed.
     * The group id controls whethher the group navigation is displayed.
     */
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

		setExpanded(location.pathname === '/users');
	}, [user]);

    /**
     * JSX content displayed inside the drawer.
     * 
     * The drawer changes layout depending on whether it is open:
     * - Open drawer: shows logo, text labels, and submenu controls
     * - Closed drawer: shows only icons
     */
	const drawerContent = (
		<Box className="bg-slate-200 h-full">
			<DrawerHeader sx={{ justifyContent: open ? 'space-between' : 'center', paddingLeft: open ? 2: 0, borderBottom: '1px solid', borderColor: 'divider', height: `${APP_BAR_HEIGHT}px` }}>
				{open && (
					<Typography
						variant="h6"
						component="a"
						href="/"
						sx={{
							display: 'flex',
							alignItems: 'center',
							textDecoration: 'none',
							color: grey[800],
							fontSize: '1.2rem',
						}}
					>
						<img src={logo} alt="Logo" style={{ height: 35, marginRight: '1.2rem' }} />
						<h1 className="font-semibold text-xl select-none font-sans">
							MolMaker
						</h1>
					</Typography>
				)}
				<IconButton onClick={toggle} sx={{ color: grey[700], ml: open ? 0 : 1 }}>
					{open ? <ChevronLeftOutlinedIcon /> : <MenuIcon />}
				</IconButton>
			</DrawerHeader>
			<List component="nav">
				{[
					{
						text: 'My Dashboard',
						icon: <DashboardOutlined />,
						path: '/'
					},
					{
						text: 'Submit Workflow Job',
						icon: <AutoMode />,
						path: '/workflows'
					},
					{
						text: 'Submit Custom Job', 
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
						selected={location.pathname === path}
						onClick={() => {
							setSelectedIndex(idx);
							navigate(path);
						}}
						sx={{
							py: 2,
							justifyContent: open ? 'initial' : 'center',
						}}
					>
						<ListItemIcon sx={{ color: blue[600], minWidth: 0, mr: open ? 3 : 'auto' }}>
							{icon}
						</ListItemIcon>
						{open && (
							<ListItemText
								primary={
									<span className='text-gray-700 text-sm font-semibold font-sans'>
										{text}
									</span>
								}
							/>
						)}
					</ListItemButton>
				))}
				{groupId && (
					<>
						<ListItemButton
							key={'my-group'}
							selected={location.pathname === '/group'}
							onClick={() => {
								setSelectedIndex(4);
								navigate('/group');
							}}
							sx={{
								py: 2,
								justifyContent: open ? 'initial' : 'center'
							}}
						>
							<ListItemIcon sx={{ color: blue[600], minWidth: 0, mr: open ? 3 : 'auto' }}>
								<PeopleAltOutlined />
							</ListItemIcon>
							{open && (
								<ListItemText
									primary={
										<span className='text-gray-700 text-sm font-semibold font-sans'>
											My Group
										</span>
									}
								/>
							)}
						</ListItemButton>
					</>
				)}
				{role === 'admin' && (
					<>
						<ListItemButton
							key={'admin-panel'}
							selected={location.pathname === '/admin'}
							onClick={() => {
								setSelectedIndex(5);
								navigate('/admin');
							}}
							sx={{
								py: 2,
								justifyContent: open ? 'initial' : 'center',
							}}
						>
							<ListItemIcon sx={{ color: blue[600], minWidth: 0, mr: open ? 3 : 'auto' }}>
								<AdminPanelSettingsOutlined />
							</ListItemIcon>
							{open && (
								<>
									<ListItemText
										primary={
											<span className='text-gray-700 text-sm font-semibold font-sans'>
												Admin Panel
											</span>
										}
									/>
									<IconButton
										size="small"
										sx={{ color: grey[300], ml: 1 }}
										onClick={(e) => {
											e.stopPropagation();
											setExpanded(!expanded);
										}}
									>
										{expanded ? <ExpandLess sx={{ color: grey[700] }}/> : <ExpandMore sx={{ color: grey[700] }}/>}
									</IconButton>
								</>
							)}
						</ListItemButton>
						{open && expanded && (
							<Collapse in={expanded} timeout="auto" unmountOnExit>
								<List component="div" disablePadding>
									<ListItemButton 
										key={'admin-panel'}
										selected={location.pathname === '/users'}
										onClick={() => {
											setSelectedIndex(6);
											navigate('/users');
										}}
										sx={{
											py: 2,
											pl: open ? 4 : 2,
											justifyContent: open ? 'initial' : 'center'
										}}
									>
										<ListItemIcon sx={{ color: blue[600], minWidth: 0, mr: open ? 3 : 'auto' }}>
											<AccountCircleOutlined />
										</ListItemIcon>
										<ListItemText
											primary={
												<span className='text-gray-700 text-sm font-semibold font-sans'>
													Users List
												</span>
											}
										/>
									</ListItemButton>
								</List>
							</Collapse>
						)}
					</>
				)}
			</List>
		</Box>
	);

	return (
		<Box component="nav" sx={{ flexShrink: 0 }}>
			<PermanentDrawer variant="permanent" open={open}>
				{drawerContent}
			</PermanentDrawer>
		</Box>
	);
}

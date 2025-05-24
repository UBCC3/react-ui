import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import { useAuth0 } from "@auth0/auth0-react";
import { Avatar, Button, Divider, ListItemIcon } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import Logout from '@mui/icons-material/Logout';
import { useDrawer } from './DrawerContext';
import logo from '../../public/logo.svg';


function MenuAppBar() {
	const { open, width } = useDrawer();
	const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

	const [anchorEl, setAnchorEl] = React.useState(null);

	const handleMenu = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	return (
		<AppBar
			component="nav"
			position="fixed"
			elevation={0}
			sx={{
				width: { sm: `calc(100% - ${width}px)` },
				ml: { sm: `${width}px` },
				bgcolor: 'rgb(255, 255, 255)',
			}}
		>
			<Toolbar>
				{!open ? (
					<Typography variant="h6" component="a" sx={{ flexGrow: 1, color: "text.primary", textDecoration: "none", display: 'flex', alignItems: 'center' }} href="/">
						<img src={logo} alt="Logo" style={{ height: 35, marginRight: 12 }} />
						MolMaker
					</Typography>
				): (
					<Typography sx={{display: 'flex', alignItems: 'center', flexGrow: 1}}>
					</Typography>
				)}
				{isAuthenticated ? (
					<div>
						<IconButton
							size="large"
							edge="end"
							onClick={handleMenu}
							aria-controls={anchorEl ? 'account-menu' : undefined}
							aria-haspopup="true"
							aria-expanded={anchorEl ? 'true' : undefined}
						>
							<Avatar>
								<PersonIcon fontSize='medium' />
							</Avatar>
						</IconButton>
						<Menu
							id="account-menu"
							anchorEl={anchorEl}
							open={Boolean(anchorEl)}
							onClose={handleClose}
							onClick={handleClose}
						>
							<MenuItem disabled>{user?.name}</MenuItem>
							<Divider />
							<MenuItem onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
								<ListItemIcon>
									<Logout fontSize="small" />
								</ListItemIcon>
								Logout
							</MenuItem>
						</Menu>
					</div>
				) : (
					<Button color="inherit" onClick={() => loginWithRedirect()}>
						Login
					</Button>
				)}
			</Toolbar>
		</AppBar>
	);
}

export default MenuAppBar;

import { useEffect, useState, MouseEvent } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import { useAuth0 } from '@auth0/auth0-react';
import {
	Avatar,
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	ListItemIcon,
	ListSubheader,
	Tooltip,
} from '@mui/material';
import {
	CancelOutlined,
	CheckCircleOutlineOutlined,
	InboxOutlined,
	PersonAddDisabledOutlined,
	Logout,
	Person as PersonIcon,
} from '@mui/icons-material';
import { useDrawer } from './DrawerContext';
import logo from '../assets/logo.svg';
import {
	getSentRequests,
	getRequests,
	approveRequest,
	rejectRequest,
	deleteRequest,
} from '../services/api';
import { grey } from '@mui/material/colors';

const ITEM_HEIGHT = 48;

export default function MenuAppBar() {
	const { open, width } = useDrawer();
	const {
		loginWithRedirect,
		logout,
		isAuthenticated,
		user,
		getAccessTokenSilently,
	} = useAuth0();

	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [anchorRequestsEl, setAnchorRequestsEl] = useState<null | HTMLElement>(null);

	const [sentRequests, setSentRequests] = useState<any[]>([]);
	const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
	const [requestType, setRequestType] = useState<'approve' | 'reject' | 'delete' | null>(null);
	const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

	const statusColors: Record<string, string> = {
		pending: 'orange',
		approved: 'green',
		rejected: 'red',
	};

	const handleMenu = (event: MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => setAnchorEl(null);

	const handleRequestsClick = (event: MouseEvent<HTMLElement>) => {
		setAnchorRequestsEl(event.currentTarget);
	};
	const handleRequestsClose = () => setAnchorRequestsEl(null);

	const handleApproveRequest = async (requestId: string) => {
		const token = await getAccessTokenSilently();
		if (!token) return;
		await approveRequest(requestId, token);
		setIncomingRequests(prev => prev.filter(r => r.request_id !== requestId));
	};

	const handleRejectRequest = async (requestId: string) => {
		const token = await getAccessTokenSilently();
		if (!token) return;
		await rejectRequest(requestId, token);
		setIncomingRequests(prev => prev.filter(r => r.request_id !== requestId));
	};

	const handleDeleteRequest = async (requestId: string) => {
		const token = await getAccessTokenSilently();
		if (!token) return;
		await deleteRequest(requestId, token);
		setSentRequests(prev => prev.filter(r => r.request_id !== requestId));
	};

	useEffect(() => {
		const fetchSent = async () => {
		const token = await getAccessTokenSilently();
		if (!token || !user?.sub) return;
		const resp = await getSentRequests(user.sub, token);
		setSentRequests(resp.data);
		};

		const fetchIncoming = async () => {
		const token = await getAccessTokenSilently();
		if (!token || !user?.sub) return;
		const resp = await getRequests(user.sub, token);
		setIncomingRequests(resp.data);
		};

		fetchSent();
		fetchIncoming();
	}, [user?.sub, getAccessTokenSilently]);

  	return (
		<Box className="bg-slate-200">
			<AppBar
				component="nav"
				position="fixed"
				elevation={2}
				sx={{
					width: { sm: `calc(100% - ${width}px)` },
					ml: { sm: `${width}px` },
					bgcolor:'inherit',
					borderBottom: '1px solid',
					borderColor: 'divider',
				}}
			>
				<Toolbar>
				{!open ? (
					<Typography
						variant="h6"
						component="a"
						href="/"
						sx={{
							flexGrow: 1,
							color: grey[200],
							textDecoration: 'none',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<img src={logo} alt="Logo" style={{ height: 35, marginRight: 12 }} />
						<h1 className="font-semibold text-xl select-none font-sans text-gray-700">
							MolMaker
						</h1>
					</Typography>
				) : (
					<Box sx={{ flexGrow: 1 }} />
				)}
				{isAuthenticated ? (
					<>
						<Tooltip title="View Requests" arrow>
							<IconButton
								size="large"
								edge="end"
								onClick={handleRequestsClick}
								aria-controls={anchorRequestsEl ? 'requests-menu' : undefined}
								aria-haspopup="true"
								aria-expanded={anchorRequestsEl ? 'true' : undefined}
							>
								<Avatar sx={{ bgcolor: grey[400], color: grey[700] }}>
									<InboxOutlined fontSize="medium" />
								</Avatar>
							</IconButton>
						</Tooltip>
						<IconButton
							size="large"
							edge="end"
							onClick={handleMenu}
							aria-controls={anchorEl ? 'account-menu' : undefined}
							aria-haspopup="true"
							aria-expanded={anchorEl ? 'true' : undefined}
						>
							<Avatar sx={{ bgcolor: grey[400], color: grey[700] }}>
								<PersonIcon fontSize="medium" />
							</Avatar>
						</IconButton>

					<Menu
						id="account-menu"
						anchorEl={anchorEl}
						open={Boolean(anchorEl)}
						onClose={handleClose}
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
					</>
				) : (
					<Button color="inherit" onClick={() => loginWithRedirect()}>
						Login
					</Button>
				)}
				</Toolbar>
			</AppBar>
			<Menu
				id="requests-menu"
				anchorEl={anchorRequestsEl}
				open={Boolean(anchorRequestsEl)}
				onClose={handleRequestsClose}
				slotProps={{
				paper: { style: { maxHeight: ITEM_HEIGHT * 4.5 } },
				}}
			>
				<ListSubheader sx={{ fontWeight: 'bold' }}>Incoming Requests</ListSubheader>
				{incomingRequests.length === 0 ? (
					<MenuItem disabled>No incoming requests</MenuItem>
					) : (
					incomingRequests.map(req => (
						<MenuItem
							key={req.request_id}
							sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
						>
							<Box>
								<Typography variant="body2">{req.sender_name}</Typography>
								<Typography variant="caption" color="text.secondary">
								{req.group_name}
								</Typography>
							</Box>
							{req.status === 'pending' && (
								<Box>
								<IconButton
									size="small"
									onClick={() => {
									setConfirmDialogOpen(true);
									setRequestType('approve');
									setSelectedRequest(req.request_id);
									}}
									color="success"
								>
									<CheckCircleOutlineOutlined />
								</IconButton>
								<IconButton
									size="small"
									onClick={() => {
									setConfirmDialogOpen(true);
									setRequestType('reject');
									setSelectedRequest(req.request_id);
									}}
									color="error"
								>
									<CancelOutlined />
								</IconButton>
								</Box>
							)}
						</MenuItem>
					))
				)}
				<Divider />
				<ListSubheader sx={{ fontWeight: 'bold' }}>Sent Requests</ListSubheader>
				{sentRequests.length === 0 ? (
				<MenuItem disabled>No sent requests</MenuItem>
				) : (
				sentRequests.map(req => (
					<MenuItem
					key={req.request_id}
					sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
					>
					<Box>
						{req.receiver_name}
						<Chip
						label={req.status}
						size="small"
						sx={{
							bgcolor: statusColors[req.status] ?? 'grey.300',
							color: 'white',
							textTransform: 'capitalize',
							ml: 1,
						}}
						/>
					</Box>
					{req.status === 'pending' && (
						<IconButton
							size="small"
							onClick={() => {
								setConfirmDialogOpen(true);
								setRequestType('delete');
								setSelectedRequest(req.request_id);
							}}
							color="primary"
						>
							<PersonAddDisabledOutlined />
						</IconButton>
					)}
					</MenuItem>
				))
				)}
			</Menu>

			<Dialog
				open={confirmDialogOpen}
				onClose={() => setConfirmDialogOpen(false)}
				aria-labelledby="confirm-dialog-title"
				aria-describedby="confirm-dialog-description"
			>
				<DialogTitle id="confirm-dialog-title">Confirm Action</DialogTitle>
				<DialogContent>
					<DialogContentText id="confirm-dialog-description">
						{requestType === 'approve'
						? 'Are you sure you want to approve this request?'
						: requestType === 'reject'
						? 'Are you sure you want to reject this request?'
						: 'Are you sure you want to delete this request?'}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setConfirmDialogOpen(false)}
						sx={{ textTransform: 'none', color: 'grey.600', borderColor: 'grey.400' }}
						variant="outlined"
					>
						Cancel
					</Button>
					<Button
						onClick={async () => {
						if (requestType === 'approve' && selectedRequest) {
							await handleApproveRequest(selectedRequest);
						} else if (requestType === 'reject' && selectedRequest) {
							await handleRejectRequest(selectedRequest);
						} else if (requestType === 'delete' && selectedRequest) {
							await handleDeleteRequest(selectedRequest);
						}
						setConfirmDialogOpen(false);
						}}
						color="primary"
						variant="contained"
						startIcon={<CheckCircleOutlineOutlined />}
						sx={{ textTransform: 'none' }}
					>
						Confirm
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
  	);
}

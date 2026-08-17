import { useEffect, useState, MouseEvent, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import { useAuth0 } from "@auth0/auth0-react";
import {
	Avatar,
	Badge,
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
} from "@mui/material";
import {
	CheckCircleOutlineOutlined,
	InboxOutlined,
	PersonAddDisabledOutlined,
	Logout,
	Person as PersonIcon,
} from "@mui/icons-material";
import { useDrawer } from "./DrawerContext";
import logo from "../assets/logo.svg";
import { getSentRequests, getGroupRequests, cancelRequest } from "../services/api";
import { grey } from "@mui/material/colors";
import { APP_BAR_HEIGHT, GROUP_POLL_INTERVAL_MS } from "../constants";
import { GroupRequest } from "../types";

// Height used to calculate the maximum visible height of the requests menu.
const ITEM_HEIGHT = 48;

const REQUEST_TYPE_LABELS: Record<string, string> = {
	invite: "Group Invite",
	join_request: "Join Request",
	demember_request: "Leave-Group Request",
};

const formatExpiry = (iso: string) => {
	const ms = new Date(iso).getTime() - Date.now();
	if (ms <= 0) return "expired";
	const days = Math.ceil(ms / 86_400_000);
	return `expires in ${days} day${days === 1 ? "" : "s"}`;
};

/**
 * Main navigation bar component for the app.
 *
 * This component handles:
 * - Auth0 login/logout display
 * - Account menu interactions
 * - Incoming and sent request menus
 * - Approve, reject, and delete request actions
 * - Confirmation dialog state
 */
export default function MenuAppBar() {
	const navigate = useNavigate();

	const { open, width } = useDrawer();
	const { loginWithRedirect, logout, isAuthenticated, user, getAccessTokenSilently } = useAuth0();

	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [anchorRequestsEl, setAnchorRequestsEl] = useState<null | HTMLElement>(null);

	const [sentRequests, setSentRequests] = useState<GroupRequest[]>([]);

	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
	const [requestType, setRequestType] = useState<"cancel" | null>(null);
	const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

	const [groupRequests, setGroupRequests] = useState<GroupRequest[]>([]);

	const statusColors: Record<string, string> = {
		pending: "orange",
		approved: "green",
		rejected: "red",
		expired: "grey",
		cancelled: "grey",
	};

	/**
	 * Opens the account menu by setting the clicked element as the menu anchor.
	 */
	const handleMenu = (event: MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	/**
	 * Closes the account menu by clearing its anchor element.
	 */
	const handleClose = () => setAnchorEl(null);

	/**
	 * Opens the requests menu by setting the clicked element as the menu anchor.
	 */
	const handleRequestsClick = (event: MouseEvent<HTMLElement>) => {
		setAnchorRequestsEl(event.currentTarget);
	};

	/**
	 * Closes the requests menu by clearing its anchor element.
	 */
	const handleRequestsClose = () => setAnchorRequestsEl(null);

	/**
	 * Deletes a sent request using the authenticated user's access token,
	 * then removes the deleted request from the local sent requests state.
	 */
	const handleCancelRequest = async (requestId: string) => {
		const token = await getAccessTokenSilently();
		if (!token) return;
		await cancelRequest(requestId, token);
		setSentRequests((prev) =>
			prev.map((r) => (r.request_id === requestId ? { ...r, status: "cancelled" } : r)),
		);
	};

	/**
	 * Fetches both sent and incoming requests whenever the authenticated user's
	 * Auth0 id becomes available or changes.
	 */
	useEffect(() => {
		const SENT_STATUSES = ["pending", "rejected"] as const;

		/**
		 * Fetches requests sent by the current authenticated user.
		 */
		const fetchSent = async () => {
			const token = await getAccessTokenSilently();
			if (!token) return;
			const results = await Promise.all(
				SENT_STATUSES.map((s) =>
					s === "pending" ? getSentRequests(token, s) : getSentRequests(token, s, undefined, 30),
				),
			);
			setSentRequests(results.flatMap((r) => r.data ?? []));
		};

		fetchSent();
	}, [user?.sub, getAccessTokenSilently]);

	/**
	 * Handles join/de-member requests to be visible from group admin page
	 */
	useEffect(() => {
		const fetchGroupRequests = async () => {
			const token = await getAccessTokenSilently();
			if (!token) return;
			const resp = await getGroupRequests(token, "pending");
			// 403 for plain members / users with no group — treat as "nothing to show"
			setGroupRequests(resp.error ? [] : (resp.data ?? []));
		};
		fetchGroupRequests();
	}, [user?.sub, getAccessTokenSilently]);

	// Requests arrive while the user sits on a page, so refresh the actionable
	// lists on an interval. Sent history is fetched on mount only.
	useEffect(() => {
		const REFRESH_MS = GROUP_POLL_INTERVAL_MS;

		const refresh = async () => {
			const token = await getAccessTokenSilently();
			if (!token) return;

			const group = await getGroupRequests(token, "pending");
			setGroupRequests(group.error ? [] : (group.data ?? []));
		};

		const id = setInterval(refresh, REFRESH_MS);
		return () => clearInterval(id);
	}, [getAccessTokenSilently]);

	// Invites already appear under Sent Requests, and only the invited user can
	// act on them - so this section covers join and de-member requests only.
	const groupOnlyRequests = groupRequests.filter((r) => r.request_type !== "invite");

	// The number of unresponsed requests
	const pendingCount = useMemo(
		() => groupOnlyRequests.filter((r) => r.status === "pending").length,
		[groupOnlyRequests],
	);

	return (
		<Box className="bg-slate-100">
			<AppBar
				component="nav"
				position="fixed"
				elevation={2}
				sx={{
					height: `${APP_BAR_HEIGHT}px`,
					width: { sm: `calc(100% - ${width}px)` },
					ml: { sm: `${width}px` },
					bgcolor: "inherit",
					borderBottom: "1px solid",
					borderColor: "divider",
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
								textDecoration: "none",
								display: "flex",
								alignItems: "center",
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
									aria-controls={anchorRequestsEl ? "requests-menu" : undefined}
									aria-haspopup="true"
									aria-expanded={anchorRequestsEl ? "true" : undefined}
								>
									<Badge badgeContent={pendingCount} color="error" overlap="circular">
										<Avatar sx={{ bgcolor: grey[300], color: grey[700] }}>
											<InboxOutlined fontSize="medium" />
										</Avatar>
									</Badge>
								</IconButton>
							</Tooltip>
							<IconButton
								size="large"
								edge="end"
								onClick={handleMenu}
								aria-controls={anchorEl ? "account-menu" : undefined}
								aria-haspopup="true"
								aria-expanded={anchorEl ? "true" : undefined}
							>
								<Avatar sx={{ bgcolor: grey[300], color: grey[700] }}>
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
								<MenuItem
									onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
								>
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
				<ListSubheader sx={{ fontWeight: "bold" }}>Sent Requests</ListSubheader>
				{sentRequests.length === 0 ? (
					<MenuItem disabled>No sent requests</MenuItem>
				) : (
					sentRequests.map((req) => (
						<MenuItem
							key={req.request_id}
							sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
						>
							<Box>
								<Typography variant="body2" sx={{ fontWeight: 600 }}>
									{REQUEST_TYPE_LABELS[req.request_type] ?? req.request_type}
									<Chip
										label={req.status}
										size="small"
										sx={{
											bgcolor: statusColors[req.status] ?? "grey.300",
											color: "white",
											textTransform: "capitalize",
											ml: 1,
										}}
									/>
								</Typography>
								<Typography variant="caption" color="text.secondary" display="block">
									{req.group_name ?? "Unknown group"}
									{req.receiver_name ? ` · to ${req.receiver_name}` : ""}
								</Typography>
							</Box>
							{req.status === "pending" && (
								<IconButton
									size="small"
									onClick={() => {
										setConfirmDialogOpen(true);
										setRequestType("cancel");
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
				<Divider />
				<ListSubheader sx={{ fontWeight: "bold" }}>Group Requests</ListSubheader>
				{groupOnlyRequests.length === 0 ? (
					<MenuItem disabled>No group requests</MenuItem>
				) : (
					groupOnlyRequests.map((req) => (
						<MenuItem
							key={req.request_id}
							sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
						>
							<Box>
								<Typography variant="body2" sx={{ fontWeight: 600 }}>
									{REQUEST_TYPE_LABELS[req.request_type] ?? req.request_type}
								</Typography>
								<Typography variant="caption" color="text.secondary" display="block">
									{req.sender_name ?? "Unknown user"}
								</Typography>
								<Typography variant="caption" color="text.secondary" display="block">
									{formatExpiry(req.expires_at)}
								</Typography>
							</Box>
							{req.status === "pending" && (
								<Button
									size="small"
									sx={{ textTransform: "none" }}
									onClick={() => {
										handleRequestsClose();
										navigate("/group");
									}}
								>
									Review
								</Button>
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
						Are you sure you want to cancel this request?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setConfirmDialogOpen(false)}
						sx={{ textTransform: "none", color: "grey.600", borderColor: "grey.400" }}
						variant="outlined"
					>
						Cancel
					</Button>
					<Button
						onClick={async () => {
							if (requestType === "cancel" && selectedRequest) {
								await handleCancelRequest(selectedRequest);
							}
							setConfirmDialogOpen(false);
						}}
						color="primary"
						variant="contained"
						startIcon={<CheckCircleOutlineOutlined />}
						sx={{ textTransform: "none" }}
					>
						Confirm
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

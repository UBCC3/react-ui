import React, { useEffect, useState } from "react";
import {
	createGroup,
	deleteGroup,
	deleteUser,
	getAllGroups,
	getAllJobs,
	getAllUsers,
	updateUser,
} from "../services/api";
import { useAuth0 } from "@auth0/auth0-react";
import {
	Accordion,
	AccordionActions,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	Grid,
	IconButton,
	InputBase,
	List,
	ListItem,
	MenuItem,
	Paper,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	CancelOutlined,
	DeleteOutlined,
	EditOutlined,
	ExpandMore,
	RemoveCircleOutline,
	SaveOutlined,
	Search,
	GroupAddOutlined,
	ManageAccountsOutlined,
} from "@mui/icons-material";
import { MolmakerPageTitle } from "../components/custom";
import { Group, Job, User } from "../types";
import { green, red, blue, blueGrey, grey } from "@mui/material/colors";
import { UserRound, UserRoundPen, UserRoundX, UsersRound } from "lucide-react";

/**
 * Props for the TabPanel
 */
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function CustomTabPanel(props: TabPanelProps) {
	// Extract tab panel props and pass any remaining props to the root div.
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`simple-tabpanel-${index}`}
			aria-labelledby={`simple-tab-${index}`}
			{...other}
		>
			{/* Only render the panel content when this tab is selected. */}
			{value === index && <Box sx={{ p: 3 }}>{children}</Box>}
		</div>
	);
}

/**
 * Generates accessibility props that connect a tab with its matching tab panel.
 */
function a11yProps(index: number) {
	return {
		id: `simple-tab-${index}`,
		"aria-controls": `simple-tabpanel-${index}`,
	};
}

/**
 * Returns a light background color based on the user's role
 */
const getRoleColor = (roleName: string) => {
	switch (roleName) {
		case "admin":
			return red[100];
		case "member":
			return blue[100];
		case "group_admin":
			return green[100];
		default:
			return "grey";
	}
};

/**
 * Returns a dark text color for the role chip based on the user's role.
 */
const getChipColor = (role: string) => {
	switch (role) {
		case "admin":
			return red[900];
		case "member":
			return blue[900];
		case "group_admin":
			return green[900];
		default:
			return "grey";
	}
};

/**
 * Converts backend role values into user-friendly labels.
 */
const getRoleName = (role: string) => {
	switch (role) {
		case "admin":
			return "Administrator";
		case "member":
			return "Member";
		case "group_admin":
			return "Group Admin";
		default:
			return "User";
	}
};

const Users = () => {
	// Auth0 helper used to retrieve an access token before calling protected APIs.
	const { getAccessTokenSilently } = useAuth0();

	// Stores all users returned from the backend.
	const [users, setUsers] = useState<User[]>([]);
	// Stores all groups returned from the backend.
	const [groups, setGroups] = useState<Group[]>([]);
	// Stores all jobs, used to calculate each user's job count.
	const [jobs, setJobs] = useState<Job[]>([]);

	// Stores the current search keyword for filtering users.
	const [keyword, setKeyword] = useState("");
	// Stores users after applying the search filter.
	const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

	// Controls whether user and group data is still loading.
	const [loading, setLoading] = useState(true);
	// Controls whether the edit user dialog is open.
	const [openEditDialog, setOpenEditDialog] = useState(false);
	// Controls whether the delete user confirmation dialog is open.
	const [deleteUserConfirmation, setDeleteUserConfirmation] = useState(false);
	// Stores the currently selected user for editing, de-membering, or deleting.
	const [selectedUser, setSelectedUser] = useState<User | null>(null);

	// Stores success messages shown in the floating alert.
	const [alertMessage, setAlertMessage] = useState("");

	// Stores the currently active tab index.
	const [value, setValue] = useState(0);

	// Stores the new group name typed into the group creation form.
	const [groupName, setGroupName] = useState("");
	// Stores the email of the user who should become the new group's admin.
	const [groupAdmin, setGroupAdmin] = useState("");
	// Controls whether the delete group confirmation dialog is open.
	const [openConfirmation, setOpenConfirmation] = useState(false);
	// Stores the currently selected group for deletion.
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

	// Loads users, grouups, and jobs when the page first renders.
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				setLoading(true);
				const token = await getAccessTokenSilently();

				// Fetch all groups so users can be matched with their group names.
				const groupResponse = await getAllGroups(token);
				setGroups(groupResponse.data);

				// Fetch all users and jobs for the management view.
				const userResponse = await getAllUsers(token);
				const jobResponse = await getAllJobs(token);
				setJobs(jobResponse.data);

				// Add derived fields to each user for easier rendering.
				setUsers(
					userResponse.data.map((user) => ({
						...user,
						group:
							groupResponse.data.find((group) => group.group_id === user.group_id)?.name ||
							"No Group",
						jobCount: jobResponse.data.filter((job) => job.user_sub === user.user_sub).length,
					})),
				);
				setLoading(false);
			} catch (error) {
				console.error("Error fetching users:", error);
			}
		};

		fetchUsers();
	}, []);

	// Filters users whenever the search keyword or user list changes.
	useEffect(() => {
		if (keyword) {
			setFilteredUsers(
				users.filter(
					(user) =>
						user.email.toLowerCase().includes(keyword.toLowerCase()) ||
						user.group?.toLowerCase().includes(keyword.toLowerCase()),
				),
			);
		} else {
			setFilteredUsers(users);
		}
	}, [keyword, users]);

	// Removes a user from their group and resets their role to member.
	const handleDeMember = async (userSub: string) => {
		try {
			const token = await getAccessTokenSilently();

			// Update the backend user record.
			await updateUser(token, userSub, "member", "");

			// Update local state so the UI reflects the change immeediately.
			setUsers(
				users.map((user) =>
					user.user_sub === userSub ? { ...user, role: "member", group_id: "" } : user,
				),
			);
			setAlertMessage("User de-membered successfully.");
			setTimeout(() => setAlertMessage(""), 3000);
		} catch (error) {
			console.error("Error de-membering user:", error);
		}
	};

	// Saves edits made to the selected user's role or group.
	const handleEditUser = async (user: User | null) => {
		if (!user) return;
		try {
			const token = await getAccessTokenSilently();

			// Persist the edited user role and group to the backend.
			await updateUser(token, user.user_sub, user.role, user.group_id);

			// Replace the updated user in local state.
			setUsers(users.map((u) => (u.user_sub === user.user_sub ? user : u)));

			setAlertMessage("User updated successfully.");
			setTimeout(() => setAlertMessage(""), 3000);
		} catch (error) {
			console.error("Error editing user:", error);
		}
	};

	// Deletes a user from the system.
	const handleDeleteUser = async (userSub: string) => {
		if (!userSub) return;
		try {
			const token = await getAccessTokenSilently();

			// Delete the user on the backend.
			await deleteUser(token, userSub);
			// Remove the deleted user from local state.
			setUsers(users.filter((u) => u.user_sub !== userSub));

			setAlertMessage("User deleted successfully.");
			setTimeout(() => setAlertMessage(""), 3000);
		} catch (error) {
			console.error("Error deleting user:", error);
		}
	};

	// Creates a new group and assigns the provided user as its group admin.
	const handleGroupCreate = async () => {
		const token = await getAccessTokenSilently();

		// Require both group name and admin email before creating the group.
		if (!groupName || !groupAdmin) {
			alert("Please provide both group name and admin email.");
			return;
		}

		// Find the user thst should become the group admin.
		const groupAdminUser = users.find((user) => user.email === groupAdmin);
		if (!groupAdminUser) {
			alert("Group admin email does not match any user.");
			return;
		}

		// Create the group first so the returned group ID can be assigned to the admin.
		const resp = await createGroup(groupName, token);
		if (resp.status !== 200) {
			alert("Failed to create group.");
		} else {
			// Promote the selected user to group admin for the newly created group.
			await updateUser(token, groupAdminUser.user_sub, "group_admin", resp.data.group_id);
		}

		// Reset the form after the create attempt.
		setGroupName("");
		setGroupAdmin("");
	};

	// Deletes a selected group from the system.
	const handleGroupDelete = async (groupId: string) => {
		if (!groupId) return;
		try {
			const token = await getAccessTokenSilently();

			// Delete the group from the backend.
			await deleteGroup(token, groupId);
			// Remove the deleted group from local state.
			setGroups(groups.filter((g) => g.group_id !== groupId));

			setAlertMessage("Group deleted successfully.");
			setTimeout(() => setAlertMessage(""), 3000);
		} catch (error) {
			console.error("Error deleting group:", error);
		}
	};

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
			{/* Confirmation dialog for deleting a group. */}
			<Dialog
				open={openConfirmation}
				onClose={() => setOpenConfirmation(false)}
				sx={{ borderRadius: 2 }}
			>
				<DialogTitle
					sx={{
						color: grey[800],
						fontWeight: "bold",
						fontSize: "1.1rem",
						px: 2,
						pb: 1,
						pt: 3,
						bgcolor: grey[50],
						display: "flex",
						alignItems: "center",
					}}
				>
					<UserRoundX style={{ marginRight: 10, color: blue[600], width: 24, height: 24 }} />
					Confirm Deletion
				</DialogTitle>

				<DialogContent sx={{ px: 2, bgcolor: grey[50] }}>
					<Typography variant="body1" color="textPrimary">
						Are you sure you want to delete the group <strong>{selectedGroup?.name}</strong>?
					</Typography>
					<Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
						This action cannot be undone. All associated users will be removed from this group.
					</Typography>
				</DialogContent>

				<DialogActions sx={{ px: 2, pb: 3, pt: 0, bgcolor: grey[50] }}>
					{/* Close the group deletion dialog without deleting anything. */}
					<Button
						onClick={() => setOpenConfirmation(false)}
						variant="outlined"
						sx={{ textTransform: "none", borderRadius: 2 }}
						color="inherit"
					>
						Cancel
					</Button>

					{/* Confirm group deletion for the selected group. */}
					<Button
						onClick={() => {
							if (selectedGroup) {
								handleGroupDelete(selectedGroup.group_id);
							}
							setDeleteUserConfirmation(false);
						}}
						color="error"
						sx={{ ml: 1, textTransform: "none", borderRadius: 2 }}
						startIcon={<DeleteOutlined />}
						variant="contained"
					>
						Delete Group
					</Button>
				</DialogActions>
			</Dialog>

			{/* Page title for the user management page. */}
			<MolmakerPageTitle title="User Management" subtitle={"Manage users in the system."} />

			<Box sx={{ width: "100%" }}>
				{/* Tab selector for switching between users and groups. */}
				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs
						value={value}
						onChange={(event, newValue) => setValue(newValue)}
						aria-label="basic tabs example"
					>
						<Tab
							label={
								<div style={{ display: "flex", alignItems: "center" }}>
									<UserRound
										style={{
											marginRight: 10,
											color: blue[600],
											width: 18,
											height: 18,
											fontWeight: "bold",
										}}
									/>
									<Typography variant="body2" sx={{ fontWeight: "bold", fontSize: "0.875rem" }}>
										User List
									</Typography>
								</div>
							}
							{...a11yProps(0)}
							sx={{ textTransform: "none" }}
						/>
						<Tab
							label={
								<div style={{ display: "flex", alignItems: "center" }}>
									<UsersRound
										style={{
											marginRight: 10,
											color: blue[600],
											width: 18,
											height: 18,
											fontWeight: "bold",
										}}
									/>
									<Typography variant="body2" sx={{ fontWeight: "bold", fontSize: "0.875rem" }}>
										Group Management
									</Typography>
								</div>
							}
							{...a11yProps(1)}
							sx={{ textTransform: "none" }}
						/>
					</Tabs>
				</Box>

				{/* First tab: user list and user actions. */}
				<CustomTabPanel value={value} index={0}>
					{loading ? (
						// Loading state while users are being fetched.
						<Box
							sx={{
								display: "flex",
								height: "60vh",
								alignItems: "center",
								justifyContent: "center",
								flexDirection: "column",
							}}
						>
							<CircularProgress size={50} />
							<Typography variant="h6" sx={{ ml: 2, color: "text.secondary", fontSize: "1rem" }}>
								Loading users...
							</Typography>
						</Box>
					) : (
						<>
							{/* Search bar for filtering users by email or group. */}
							<Paper
								component="form"
								sx={{
									p: "4px 4px",
									display: "flex",
									alignItems: "center",
									width: 400,
									mb: 2,
									borderRadius: 2,
									bgcolor: grey[50],
								}}
								elevation={3}
							>
								<IconButton sx={{ p: "10px" }} aria-label="search">
									<Search />
								</IconButton>
								<InputBase
									sx={{ ml: 1, flex: 1 }}
									placeholder="search users by email or group"
									inputProps={{ "aria-label": "search users by email or group" }}
									value={keyword}
									onChange={(e) => setKeyword(e.target.value)}
								/>
							</Paper>

							{/* Count of users matching the current filter. */}
							<Typography
								variant="h6"
								sx={{ my: 2, fontWeight: 600, fontSize: "0.875rem", color: grey[700] }}
							>
								{filteredUsers.length} users found
							</Typography>

							{/* Card grid showing all filtered users. */}
							<Grid container spacing={2}>
								{filteredUsers.map((user) => (
									<Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={user.user_sub}>
										<Card sx={{ borderRadius: 2, bgcolor: grey[50] }} elevation={3}>
											<CardContent>
												{/* Role chip with role-specific colors. */}
												<Chip
													label={getRoleName(user.role)}
													sx={{
														marginBottom: 1,
														bgcolor: getRoleColor(user.role),
														borderRadius: 1,
														color: getChipColor(user.role),
														fontWeight: 600,
														fontSize: "0.7rem",
													}}
													size="small"
												/>

												{/* User email and group name. */}
												<Typography
													variant="h6"
													sx={{ fontWeight: 600, fontSize: "1rem", color: "primary.main" }}
												>
													{user.email}
												</Typography>
												<Typography
													variant="caption"
													color="textSecondary"
													sx={{ marginBottom: 1 }}
												>
													{user.group || "No Group"}
												</Typography>
											</CardContent>

											<Divider />

											<CardActions sx={{ display: "flex", justifyContent: "space-between", px: 2 }}>
												{/* Number of jobs owned by this user. */}
												<Typography
													variant="body2"
													color="textSecondary"
													sx={{ display: "flex", alignItems: "center" }}
												>
													<span style={{ fontWeight: 600, marginRight: 7 }}>{user.job_count}</span>
													<span>jobs</span>
												</Typography>

												<Box>
													{/* Open edit dialog for this user. */}
													<IconButton
														aria-label="edit"
														color="primary"
														onClick={() => {
															setSelectedUser(user);
															setOpenEditDialog(true);
														}}
													>
														<EditOutlined />
													</IconButton>

													{/* Remove this user from their current group. */}
													<IconButton
														aria-label="de-member"
														onClick={() => {
															setSelectedUser(user);
															handleDeMember(user.user_sub);
														}}
														color="warning"
													>
														<RemoveCircleOutline />
													</IconButton>

													{/* Open delete confirmation dialog for this user. */}
													<IconButton
														aria-label="delete"
														color="error"
														onClick={() => {
															setSelectedUser(user);
															setDeleteUserConfirmation(true);
														}}
													>
														<DeleteOutlined />
													</IconButton>
												</Box>
											</CardActions>
										</Card>
									</Grid>
								))}
							</Grid>
						</>
					)}
				</CustomTabPanel>

				{/* Second tab: group creation and group management. */}
				<CustomTabPanel value={value} index={1}>
					{/* Form for creating a new group. */}
					<Paper sx={{ p: 3, borderRadius: 2, bgcolor: grey[50] }} elevation={3}>
						<Typography
							variant="h6"
							color={grey[800]}
							sx={{
								display: "flex",
								alignItems: "center",
								borderTopLeftRadius: 5,
								borderTopRightRadius: 5,
								fontWeight: "bold",
								fontSize: "1.1rem",
								mb: 3,
							}}
						>
							<GroupAddOutlined sx={{ mr: 1, color: blue[600] }} />
							Create New Group
						</Typography>

						<Box display="flex" gap={2}>
							{/* New group name input. */}
							<TextField
								label="Group Name"
								value={groupName}
								onChange={(e) => setGroupName(e.target.value)}
								size="small"
								required
							/>

							{/* Email of the user who will become the group admin. */}
							<TextField
								label="Group Admin Email"
								value={groupAdmin}
								onChange={(e) => setGroupAdmin(e.target.value)}
								size="small"
								required
							/>

							{/* Create group button is disabled until both inputs are filled. */}
							<Button
								variant="contained"
								onClick={handleGroupCreate}
								size="small"
								disabled={!groupName || !groupAdmin}
								sx={{ textTransform: "none", borderRadius: 2 }}
							>
								Create Group
							</Button>
						</Box>
					</Paper>

					{/* Existing groups and their members. */}
					<Paper
						sx={{
							borderRadius: 2,
							maxHeight: 500,
							overflowY: "auto",
							p: 3,
							mt: 2,
							bgcolor: grey[50],
						}}
						elevation={3}
					>
						<Typography
							variant="h6"
							color={grey[800]}
							sx={{
								display: "flex",
								alignItems: "center",
								borderTopLeftRadius: 5,
								borderTopRightRadius: 5,
								fontWeight: "bold",
								fontSize: "1.1rem",
								mb: 3,
							}}
						>
							<ManageAccountsOutlined sx={{ mr: 1, color: blue[600] }} />
							Manage User Roles and Groups
						</Typography>

						{/* One accordion is rendered for each group. */}
						{groups.map((group) => (
							<Accordion key={group.group_id}>
								<AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: grey[100] }}>
									<Typography
										variant="body1"
										color={grey[700]}
										sx={{ fontWeight: "bold", fontSize: "0.875rem" }}
									>
										{group.name}
									</Typography>
								</AccordionSummary>

								<AccordionDetails sx={{ p: 0 }}>
									<List sx={{ width: "100%", bgcolor: "background.paper", m: 0, p: 0 }}>
										{group.users.map((user) => (
											<ListItem
												key={user.user_sub}
												sx={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													p: 2,
													borderBottom: "1px solid",
													borderColor: "divider",
												}}
											>
												<Typography variant="body2">{user.email}</Typography>
											</ListItem>
										))}
									</List>
								</AccordionDetails>

								<AccordionActions sx={{ justifyContent: "flex-end", bgcolor: grey[100], p: 1 }}>
									<Tooltip title="Delete Group" arrow>
										<IconButton
											size="small"
											onClick={() => {
												setSelectedGroup(group);
												setOpenConfirmation(true);
											}}
											sx={{ textTransform: "none" }}
											color="error"
										>
											<DeleteOutlined />
										</IconButton>
									</Tooltip>
								</AccordionActions>
							</Accordion>
						))}
					</Paper>
				</CustomTabPanel>
			</Box>

			{/* Edit user dialog */}
			{openEditDialog && (
				// Placeholder for edit dialog component
				<Dialog
					open={openEditDialog}
					onClose={() => setOpenEditDialog(false)}
					sx={{ borderRadius: 2 }}
				>
					<DialogTitle
						sx={{
							color: grey[800],
							fontWeight: "bold",
							fontSize: "1.1rem",
							px: 2,
							pb: 1,
							pt: 3,
							bgcolor: grey[50],
							display: "flex",
							alignItems: "center",
						}}
					>
						<UserRoundPen style={{ marginRight: 10, color: blue[600], width: 24, height: 24 }} />
						Edit User
					</DialogTitle>

					<DialogContent sx={{ px: 2, bgcolor: grey[50] }}>
						{/* Email is displayed but not editable. */}
						<TextField
							label="Email"
							value={selectedUser?.email || ""}
							fullWidth
							margin="normal"
							variant="outlined"
							disabled
						/>

						{/* Group selector for assigning the user to a group. */}
						<FormControl fullWidth margin="normal">
							<TextField
								select
								label="Group"
								value={selectedUser?.group_id || ""}
								onChange={(e) => {
									if (selectedUser) {
										setSelectedUser({ ...selectedUser, group_id: e.target.value });
									}
								}}
							>
								{groups.map((group) => (
									<MenuItem key={group.group_id} value={group.group_id}>
										{group.name}
									</MenuItem>
								))}
							</TextField>
						</FormControl>

						{/* Role selector for changing the user's permission level. */}
						<FormControl fullWidth margin="normal">
							<TextField
								select
								label="Role"
								value={selectedUser?.role || ""}
								onChange={(e) => {
									if (selectedUser) {
										setSelectedUser({ ...selectedUser, role: e.target.value });
									}
								}}
							>
								<MenuItem value="admin">Administrator</MenuItem>
								<MenuItem value="group_admin">Group Admin</MenuItem>
								<MenuItem value="member">Member</MenuItem>
							</TextField>
						</FormControl>
					</DialogContent>

					<DialogActions sx={{ px: 2, pb: 3, pt: 0, bgcolor: grey[50] }}>
						{/* Close and edit dialog without saving */}
						<Button
							variant="outlined"
							color="inherit"
							onClick={() => setOpenEditDialog(false)}
							sx={{ textTransform: "none", borderRadius: 2 }}
						>
							Cancel
						</Button>

						{/* Save the edited user to the backend. */}
						<Button
							variant="contained"
							color="primary"
							onClick={() => {
								handleEditUser(selectedUser);
								setOpenEditDialog(false);
							}}
							sx={{ textTransform: "none", borderRadius: 2 }}
							startIcon={<SaveOutlined />}
						>
							Save Changes
						</Button>
					</DialogActions>
				</Dialog>
			)}

			{/* Delete user confirmation dialog. */}
			{deleteUserConfirmation && (
				<Dialog
					open={deleteUserConfirmation}
					onClose={() => setDeleteUserConfirmation(false)}
					sx={{ borderRadius: 2 }}
				>
					<DialogTitle
						sx={{
							color: grey[800],
							fontWeight: "bold",
							fontSize: "1.1rem",
							px: 2,
							pb: 1,
							pt: 3,
							bgcolor: grey[50],
							display: "flex",
							alignItems: "center",
						}}
					>
						<UserRoundX style={{ marginRight: 10, color: blue[600], width: 24, height: 24 }} />
						Confirm Deletion
					</DialogTitle>

					<DialogContent sx={{ px: 2, bgcolor: grey[50] }}>
						<Typography variant="body1" color="textPrimary">
							Are you sure you want to delete the user <strong>{selectedUser?.email}</strong>?
						</Typography>
						<Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
							This action cannot be undone. Any jobs and structures associated with this user will
							also be deleted.
						</Typography>
					</DialogContent>

					<DialogActions sx={{ px: 2, pb: 3, pt: 0, bgcolor: grey[50] }}>
						{/* Close the delete dialog without deleting the user. */}
						<Button
							onClick={() => setDeleteUserConfirmation(false)}
							variant="outlined"
							color="inherit"
							sx={{ textTransform: "none", borderRadius: 2 }}
						>
							Cancel
						</Button>

						{/* Permanently delete the selected user. */}
						<Button
							onClick={() => {
								if (selectedUser) {
									handleDeleteUser(selectedUser.user_sub);
								}
								setDeleteUserConfirmation(false);
							}}
							color="error"
							sx={{ ml: 1, textTransform: "none", borderRadius: 2 }}
							startIcon={<DeleteOutlined />}
							variant="contained"
						>
							Delete User
						</Button>
					</DialogActions>
				</Dialog>
			)}

			{/* Floating success alert shown after user or group actions. */}
			{alertMessage && (
				<Alert
					severity="success"
					onClose={() => setAlertMessage("")}
					sx={{
						position: "fixed",
						top: 80,
						left: "50%",
						transform: "translateX(-50%)",
						width: "500px",
					}}
				>
					{alertMessage}
				</Alert>
			)}
		</Box>
	);
};

export default Users;

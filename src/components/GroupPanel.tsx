import { useEffect, useState } from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	Button,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	TablePagination,
	IconButton,
	Alert,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Radio,
	RadioGroup,
	CircularProgress,
	Grid,
} from "@mui/material";
import { blue, grey } from "@mui/material/colors";
import {
	GroupOutlined,
	RemoveCircleOutlineOutlined,
	CheckCircleOutlineOutlined,
} from "@mui/icons-material";
import { useAuth0 } from "@auth0/auth0-react";
import {
	updateGroupName,
	getCurrentUserMembers,
	upsertCurrentUser,
	getGroupById,
	getCurrentUserGroupJobs,
    sendInviteRequest,
    removeGroupUser,
    updateJobOwnership,
} from '../services/api';
import type { User, Job } from '../types';

/**
 * Props for the GroupPanel
 */
interface GroupPanelProps {
	token: string;
}

/**
 * Displays the current group and its members.
 *
 * Group admins can add new members and remove existing members. Regular
 * members can view the group member list but cannot modify membership.
 */
export default function GroupPanel({ token }: GroupPanelProps) {
	const { user } = useAuth0();

	const [users, setUsers] = useState<User[]>([]);
	const [jobs, setJobs] = useState<Job[]>([]);

	const [groupName, setGroupName] = useState("");
	const [groupId, setGroupId] = useState("");
	const [userRole, setUserRole] = useState("");

	const [newUserEmail, setNewUserEmail] = useState("");
	const [newUserError, setNewUserError] = useState("");

	const [reload, setReload] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
	const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [removalPolicy, setRemovalPolicy] = useState<'co_owned' | 'user' | 'group'>('co_owned');

	const [loading, setLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState("Loading...");

	// Fetch and load data sequentially with loading messages
	useEffect(() => {
		async function loadData() {
			if (!user?.email) return;
			setLoading(true);

			setLoadingMessage("Loading users...");
			const membersResp = await getCurrentUserMembers(token);
			setUsers(membersResp.data || []);

			setLoadingMessage("Loading current user...");
			const upsertResp = await upsertCurrentUser(token, user.email);
			setUserRole(upsertResp.data.role || "");

			setLoadingMessage("Loading group info...");
			if (upsertResp.data.group_id) {
				setGroupId(upsertResp.data.group_id);
				const grp = await getGroupById(upsertResp.data.group_id, token);
				if (grp.data) setGroupName(grp.data.name);
			}

			setLoadingMessage("Loading jobs...");
			const jobsResp = await getCurrentUserGroupJobs(token);
			setJobs(jobsResp.data || []);

			setLoading(false);
		}

		loadData();
	}, [token, user?.email, reload]);

	// Handlers
	const handleGroupUpdate = async () => {
		await updateGroupName(groupId, groupName, token);
		setReload((r) => !r);
	};

	// Remove the selected user from the group and handle their jobs based on the selected policy.
	const handleUserUpdate = async () => {
		if (!selectedUser) return;
		const userSub = selectedUser.user_sub;
		const userJobs = jobs.filter((j) => j.user_sub === userSub);

		if (removalPolicy === 'group') {
            // User's ownership claim is removed; job stays with the group.
            await Promise.all(userJobs.map(j => updateJobOwnership(j.job_id, 'group', token, undefined, groupId)));
        } else if (removalPolicy === 'user') {
            // Group's ownership claim is removed; job stays with the user.
            await Promise.all(userJobs.map(j => updateJobOwnership(j.job_id, 'user', token, userSub, undefined)));
        }
        // 'co_owned': no change - job remains co-owned by both, matching demember's own default behavior.

		await removeGroupUser(userSub, token);
		setReload(r => !r);
		setRemoveDialogOpen(false);
	};

	// Send a group-join request to the user matching the entered email.
	const handleAddMember = async () => {
		if (!newUserEmail) return;
		const resp = await sendInviteRequest(newUserEmail, token);
		if (resp.error) {
			setNewUserError(resp.error);
			return;
		}
		setNewUserEmail('');
		setReload(r => !r);
		setAddMemberDialogOpen(false);
  	};

	// Users displayed on the current table page.
	const paginatedUsers = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

	return (
		<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50], mb: 4 }}>
			{/* Header */}
			<Typography
				variant="h6"
				color={grey[800]}
				sx={{
					p: 2,
					display: "flex",
					alignItems: "center",
					borderTopLeftRadius: 5,
					borderTopRightRadius: 5,
					fontWeight: "bold",
					fontSize: "1.1rem",
				}}
			>
				<GroupOutlined sx={{ mr: 1, color: blue[600] }} />
				Group Management
			</Typography>
			{loading ? (
				<Box
					sx={{ mb: 4, p: 4, bgcolor: grey[50], borderRadius: 2 }}
					display="flex"
					alignItems="center"
					justifyContent="center"
				>
					<CircularProgress />
					<Typography variant="body2" sx={{ ml: 2 }}>
						{loadingMessage}
					</Typography>
				</Box>
			) : (
				<>
					{/* Group Info and Add Member */}
					<Typography variant="body2" sx={{ px: 2, mb: 2, fontWeight: "bold", color: grey[600] }}>
						{userRole === "group_admin" ? "Manage Group" : "Group Information"}
					</Typography>

					<Grid container spacing={2} sx={{ px: 2 }}>
						<Grid size={{ xs: 12, md: 6 }}>
							{/* Group Name */}
							<Box sx={{ p: 2, bgcolor: grey[200], borderRadius: 2 }}>
								<Typography variant="body2" color={grey[800]} sx={{ mb: 2 }}>
									{userRole === "group_admin" ? "Update Group Name" : "Group Name"}
								</Typography>
								<Box display="flex" gap={2}>
									<TextField
										label="Group Name"
										value={groupName}
										onChange={(e) => setGroupName(e.target.value)}
										size="small"
										disabled={userRole !== "group_admin"}
									/>
									{userRole === "group_admin" && (
										<Button
											variant="contained"
											onClick={handleGroupUpdate}
											size="small"
											disabled={!groupName}
											sx={{ textTransform: "none" }}
										>
											Update
										</Button>
									)}
								</Box>
							</Box>
						</Grid>
						<Grid size={{ xs: 12, md: 6 }}>
							{/* Add Member */}
							{userRole === "group_admin" && (
								<Box sx={{ p: 2, bgcolor: grey[200], borderRadius: 2 }}>
									{newUserError && (
										<Alert severity="error" sx={{ mb: 2 }}>
											{newUserError}
										</Alert>
									)}
									<Typography variant="body2" color={grey[800]} sx={{ mb: 2 }}>
										Add User to Group
									</Typography>
									<Box display="flex" gap={2}>
										<TextField
											label="User Email"
											value={newUserEmail}
											onChange={(e) => setNewUserEmail(e.target.value)}
											size="small"
										/>
										<Button
											variant="contained"
											onClick={() => setAddMemberDialogOpen(true)}
											size="small"
											disabled={!newUserEmail}
											sx={{ textTransform: "none" }}
										>
											Add
										</Button>
									</Box>
								</Box>
							)}
						</Grid>
					</Grid>

					{/* User Table */}
					<Typography variant="body2" sx={{ px: 2, my: 2, fontWeight: "bold", color: grey[600] }}>
						{userRole === "group_admin" ? "Manage Group Members" : "Your Group Members"}
					</Typography>
					<Table>
						<TableHead sx={{ bgcolor: grey[200] }}>
							<TableRow>
								<TableCell>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											width: "100%",
											fontSize: "0.7rem",
											fontWeight: "bold",
											color: grey[700],
										}}
									>
										EMAIL
									</Box>
								</TableCell>
								<TableCell>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											width: "100%",
											fontSize: "0.7rem",
											fontWeight: "bold",
											color: grey[700],
										}}
									>
										ROLE
									</Box>
								</TableCell>
								{userRole === "group_admin" && (
									<TableCell>
										<Box
											sx={{
												display: "flex",
												alignItems: "center",
												width: "100%",
												fontSize: "0.7rem",
												fontWeight: "bold",
												color: grey[700],
											}}
										>
											REMOVE
										</Box>
									</TableCell>
								)}
							</TableRow>
						</TableHead>
						<TableBody>
							{paginatedUsers.map((u) => (
								<TableRow key={u.user_sub}>
									<TableCell>{u.email}</TableCell>
									<TableCell>
										<FormControl fullWidth size="small">
											<InputLabel id={`role-${u.user_sub}`}>Role</InputLabel>
											<Select labelId={`role-${u.user_sub}`} label="Role" value={u.role} disabled>
												<MenuItem value="group_admin">Group Admin</MenuItem>
												<MenuItem value="member">Member</MenuItem>
											</Select>
										</FormControl>
									</TableCell>
									{userRole === "group_admin" && (
										<TableCell>
											<IconButton
												size="small"
												color="warning"
												onClick={() => {
													setSelectedUser(u);
													setRemoveDialogOpen(true);
												}}
											>
												<RemoveCircleOutlineOutlined />
											</IconButton>
										</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
					<TablePagination
						component="div"
						count={users.length}
						page={page}
						rowsPerPage={rowsPerPage}
						onPageChange={(_, newPage) => setPage(newPage)}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(+e.target.value);
							setPage(0);
						}}
						rowsPerPageOptions={[5, 10, 25]}
					/>
					{/* Remove User Dialog */}
					<Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)} fullWidth>
						<DialogTitle>Remove User</DialogTitle>
						<DialogContent>
							<Typography variant="body2" color="text.secondary">
								Are you sure you want to remove this user from the group? This action cannot be
								undone.
							</Typography>
							<FormControl>
                                <RadioGroup
                                    name="removal-policy"
                                    value={removalPolicy}
                                    onChange={e => setRemovalPolicy(e.target.value as 'co_owned'|'user'|'group')}
                                >
                                    <FormControlLabel value="co_owned" control={<Radio />} label="Keep jobs co-owned by the user and the group" />
                                    <FormControlLabel value="group" control={<Radio />} label="Job deleted from user (job stays with the group)" />
                                    <FormControlLabel value="user" control={<Radio />} label="Job deleted from group (job stays with the user)" />
                                </RadioGroup>
							</FormControl>
						</Box>
						</DialogContent>
						<DialogActions>
							<Button
								onClick={() => setRemoveDialogOpen(false)}
								variant="outlined"
								sx={{ textTransform: "none", color: grey[600], borderColor: grey[400] }}
							>
								Cancel
							</Button>
							<Button
								onClick={handleUserUpdate}
								color="error"
								variant="contained"
								startIcon={<RemoveCircleOutlineOutlined />}
								sx={{ textTransform: "none" }}
							>
								Remove
							</Button>
						</DialogActions>
					</Dialog>

					{/* Add Member Dialog */}
					<Dialog
						open={addMemberDialogOpen}
						onClose={() => setAddMemberDialogOpen(false)}
						fullWidth
					>
						<DialogTitle>Confirm Add</DialogTitle>
						<DialogContent>
							<Typography variant="body2" color="text.secondary">
								Are you sure you want to add{" "}
								<strong style={{ color: "#1565c0" }}>{newUserEmail}</strong> to the group? They will
								have access to all group resources.
							</Typography>
						</DialogContent>
						<DialogActions>
							<Button
								onClick={() => setAddMemberDialogOpen(false)}
								variant="outlined"
								sx={{ textTransform: "none", color: grey[600], borderColor: grey[400] }}
							>
								Cancel
							</Button>
							<Button
								onClick={handleAddMember}
								color="primary"
								variant="contained"
								startIcon={<CheckCircleOutlineOutlined />}
								sx={{ textTransform: "none" }}
							>
								Confirm
							</Button>
						</DialogActions>
					</Dialog>
				</>
			)}
		</Paper>
	);
}

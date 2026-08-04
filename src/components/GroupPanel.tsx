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
	Tooltip,
	Badge,
} from "@mui/material";
import { blue, grey } from "@mui/material/colors";
import {
	GroupOutlined,
	RemoveCircleOutlineOutlined,
	// CheckCircleOutlineOutlined,
	ContentCopyOutlined,
} from "@mui/icons-material";
import { useAuth0 } from "@auth0/auth0-react";
import {
	updateGroupName,
	upsertCurrentUser,
	getGroupById,
	// sendInviteRequest,
	removeGroupUser,
	updateJobOwnership,
	updateStructureOwnership,
	deleteJob,
	deleteStructure,
	getCurrentUserMembersPaged,
	getCurrentUserGroupJobsPaged,
	getCurrentUserGroupStructuresPaged,
	joinGroupRequest,
	requestDemember,
	approveRequest,
	getGroupRequests,
	rejectRequest,
} from "../services/api";
import { type User, type Job, type Structure, GroupRequest } from "../types";

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
	const [structures, setStructures] = useState<Structure[]>([]);

	const [groupName, setGroupName] = useState("");
	const [groupId, setGroupId] = useState("");
	const [userRole, setUserRole] = useState("");

	const [joinGroupId, setJoinGroupId] = useState("");
	const [joinGroupName, setJoinGroupName] = useState<string | null>(null);
	const [joinError, setJoinError] = useState("");

	// const [newUserEmail, setNewUserEmail] = useState("");
	// const [newUserError, setNewUserError] = useState("");

	const [leaveError, setLeaveError] = useState("");
	const [requestError, setRequestError] = useState("");
	const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

	const [reload, setReload] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
	// const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [removalPolicy, setRemovalPolicy] = useState<"co_owned" | "user" | "group" | "delete">(
		"co_owned",
	);

	const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
	const [groupRequests, setGroupRequests] = useState<GroupRequest[]>([]);
	const joinRequests = groupRequests.filter((r) => r.request_type === "join_request");
	const leaveRequests = groupRequests.filter((r) => r.request_type === "demember_request");

	const [loading, setLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState("Loading...");

	const [copiedGroupId, setCopiedGroupId] = useState(false);

	// Fetch and load data sequentially with loading messages
	useEffect(() => {
		async function loadData() {
			if (!user?.email) return;
			setLoading(true);

			setLoadingMessage("Loading users...");
			const membersResp = await getCurrentUserMembersPaged(token);
			setUsers(membersResp.data || []);

			setLoadingMessage("Loading requests...");
			const reqResp = await getGroupRequests(token, "pending");
			setGroupRequests(
				reqResp.error
					? []
					: (reqResp.data ?? []).filter((r: GroupRequest) => r.request_type !== "invite"),
			);

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
			const jobsResp = await getCurrentUserGroupJobsPaged(token);
			setJobs(jobsResp.data || []);

			setLoadingMessage("Loading structures...");
			const structuresResp = await getCurrentUserGroupStructuresPaged(token);
			setStructures(structuresResp.data || []);

			setLoading(false);
		}

		loadData();
	}, [token, user?.email, reload]);

	// Resolve the pasted ID to a group name so the user can confirm before sending.
	const handleLookupGroup = async () => {
		setJoinError("");
		setJoinGroupName(null);
		const resp = await getGroupById(joinGroupId.trim(), token);
		if (resp.error) {
			setJoinError("No group found with that ID.");
			return;
		}
		setJoinGroupName(resp.data.name);
	};

	const handleJoinRequest = async () => {
		const resp = await joinGroupRequest(joinGroupId.trim(), token);
		if (resp.error) {
			setJoinError(resp.error);
			return;
		}
		setJoinGroupId("");
		setJoinGroupName(null);
		setReload((r) => !r);
	};

	// Handlers
	const handleGroupUpdate = async () => {
		await updateGroupName(groupId, groupName, token);
		setReload((r) => !r);
	};

	// Group IDs are what members paste into the join form, so make it copyable.
	const handleCopyGroupId = async () => {
		await navigator.clipboard.writeText(groupId);
		setCopiedGroupId(true);
		setTimeout(() => setCopiedGroupId(false), 2000);
	};

	// Applies the chosen ownership policy to one member's jobs and structures.
	const applyRemovalPolicy = async (userSub: string) => {
		const userJobs = jobs.filter((j) => j.user_sub === userSub);
		const userStructures = structures.filter((s) => s.user_sub === userSub);

		if (removalPolicy === "group") {
			// User's ownership claim is removed; assets stay with the group.
			await Promise.all([
				...userJobs.map((j) => updateJobOwnership(j.job_id, "group", token, undefined, groupId)),
				...userStructures.map((s) =>
					updateStructureOwnership(s.structure_id, "group", token, undefined, groupId),
				),
			]);
		} else if (removalPolicy === "user") {
			// Group's ownership claim is removed; assets stay with the user.
			await Promise.all([
				...userJobs.map((j) => updateJobOwnership(j.job_id, "user", token, userSub, undefined)),
				...userStructures.map((s) =>
					updateStructureOwnership(s.structure_id, "user", token, userSub, undefined),
				),
			]);
		} else if (removalPolicy === "delete") {
			// Soft-delete the user's jobs and structures (is_deleted = true; rows kept in DB).
			await Promise.all([
				...userJobs.map((j) => deleteJob(j.job_id, token)),
				...userStructures.map((s) => deleteStructure(s.structure_id, token)),
			]);
		}
		// 'co_owned': no change - assets remain co-owned by both.
	};

	// Remove the selected user from the group and handle their jobs based on the selected policy
	const handleUserUpdate = async () => {
		if (!selectedUser) return;
		const userSub = selectedUser.user_sub;

		// Ownership must move while the user is still in the group: a co_owned
		// transfer is rejected once their group_id is null.
		await applyRemovalPolicy(userSub);

		if (pendingRequestId) {
			await approveRequest(pendingRequestId, token);
		} else {
			await removeGroupUser(userSub, token);
		}

		setPendingRequestId(null);
		setReload((r) => !r);
		setRemoveDialogOpen(false);
	};

	// Join requests carry no assets, so they approve directly — no ownership dialog.
	const handleApproveJoin = async (requestId: string) => {
		const resp = await approveRequest(requestId, token);
		if (resp.error) {
			setRequestError(resp.error);
			return;
		}
		setRequestError("");
		setReload((r) => !r);
	};

	const handleRejectGroupRequest = async (requestId: string) => {
		const resp = await rejectRequest(requestId, token);
		if (resp.error) {
			setRequestError(resp.error);
			return;
		}
		setRequestError("");
		setReload((r) => !r);
	};

	// Send a group-join request to the user matching the entered email.
	// const handleAddMember = async () => {
	// 	if (!newUserEmail) return;
	// 	const resp = await sendInviteRequest(newUserEmail, token);
	// 	if (resp.error) {
	// 		setNewUserError(resp.error);
	// 		return;
	// 	}
	// 	setNewUserEmail("");
	// 	setReload((r) => !r);
	// 	setAddMemberDialogOpen(false);
	// };

	// Members request removal; a group admin approves it from Group Requests.
	const handleLeaveGroup = async () => {
		const resp = await requestDemember(token);
		setLeaveDialogOpen(false);
		if (resp.error) {
			setLeaveError(resp.error);
			return;
		}
		setLeaveError("");
		setReload((r) => !r);
	};

	useEffect(() => {
		if (userRole !== "group_admin") return;

		const refresh = async () => {
			const reqResp = await getGroupRequests(token, "pending");
			setGroupRequests(
				reqResp.error
					? []
					: (reqResp.data ?? []).filter((r: GroupRequest) => r.request_type !== "invite"),
			);
		};

		const id = setInterval(refresh, 20000);
		return () => clearInterval(id);
	}, [token, userRole]);

	// Users displayed on the current table page.
	const paginatedUsers = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

	return (
		<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50], mb: 4, pb: 1 }}>
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
				{userRole === "group_admin" ? "Group Management" : "Group Information"}
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
					{!groupId && (
						<Box sx={{ p: 2, bgcolor: grey[200], borderRadius: 2, mx: 2, mb: 4 }}>
							{joinError && (
								<Alert severity="error" sx={{ mb: 2 }}>
									{joinError}
								</Alert>
							)}
							<Typography variant="body2" color={grey[800]} sx={{ mb: 2 }}>
								Join a Group
							</Typography>
							<Box display="flex" gap={2} alignItems="center">
								<TextField
									label="Group ID"
									value={joinGroupId}
									onChange={(e) => {
										setJoinGroupId(e.target.value);
										setJoinGroupName(null);
									}}
									size="small"
									sx={{ minWidth: 340 }}
								/>
								{joinGroupName ? (
									<Button
										variant="contained"
										onClick={handleJoinRequest}
										size="small"
										sx={{ textTransform: "none" }}
									>
										Request to join {joinGroupName}
									</Button>
								) : (
									<Button
										variant="outlined"
										onClick={handleLookupGroup}
										size="small"
										disabled={!joinGroupId.trim()}
										sx={{ textTransform: "none" }}
									>
										Look up
									</Button>
								)}
							</Box>
						</Box>
					)}
					{groupId && (
						<>
							{/* Group Info and Add Member */}
							{userRole === "group_admin" && (
								<Typography
									variant="body2"
									sx={{ px: 2, mb: 2, fontWeight: "bold", color: grey[600] }}
								>
									Manage Group
								</Typography>
							)}

							<Grid container spacing={2} sx={{ px: 2, pb: 4 }}>
								<Grid size={{ xs: 12, md: 6 }}>
									{/* Group Name */}
									<Box sx={{ p: 2, bgcolor: grey[200], borderRadius: 2, heigh: "100%" }}>
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
										{userRole === "group_admin" && groupId && (
											<Box sx={{ mt: 2 }}>
												<Typography
													variant="caption"
													color={grey[700]}
													display="block"
													sx={{ mb: 0.5 }}
												>
													Group ID — share this with people who need to request to join
												</Typography>
												<Box display="flex" gap={1} alignItems="center">
													<Typography
														variant="body2"
														sx={{
															fontFamily: "monospace",
															bgcolor: grey[100],
															px: 1,
															py: 0.5,
															borderRadius: 1,
															wordBreak: "break-all",
														}}
													>
														{groupId}
													</Typography>
													<Tooltip title={copiedGroupId ? "Copied" : "Copy"}>
														<IconButton size="small" onClick={handleCopyGroupId}>
															<ContentCopyOutlined fontSize="small" />
														</IconButton>
													</Tooltip>
												</Box>
											</Box>
										)}
									</Box>
								</Grid>
								<Grid size={{ xs: 12, md: 6 }}>
									{/* Add Member */}
									{/* {userRole === "group_admin" && (
										<Box sx={{ p: 2, bgcolor: grey[200], borderRadius: 2, height: "100%" }}>
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
									)} */}

									{/* Leave Group */}
									{userRole !== "group_admin" && (
										<Box sx={{ p: 2, bgcolor: grey[200], borderRadius: 2, height: "100%" }}>
											{leaveError && (
												<Alert severity="error" sx={{ mb: 2 }}>
													{leaveError}
												</Alert>
											)}
											<Typography variant="body2" color={grey[800]} sx={{ mb: 2 }}>
												Leave Group
											</Typography>
											<Button
												variant="outlined"
												color="warning"
												onClick={() => setLeaveDialogOpen(true)}
												size="small"
												sx={{ textTransform: "none" }}
												startIcon={<RemoveCircleOutlineOutlined />}
											>
												Request to leave this group
											</Button>
										</Box>
									)}
								</Grid>
							</Grid>

							{userRole === "group_admin" && requestError && (
								<Alert severity="error" sx={{ mx: 2, mb: 2 }}>
									{requestError}
								</Alert>
							)}

							{/* Pending Join Requests — approve directly, joiners bring no assets. */}
							{userRole === "group_admin" && joinRequests.length > 0 && (
								<Box sx={{ px: 2, mb: 2 }}>
									<Badge
										badgeContent={joinRequests.length}
										color="error"
										sx={{
											mb: 1,
											"& .MuiBadge-badge": {
												position: "static",
												transform: "none",
												ml: 1.5,
											},
										}}
									>
										<Typography variant="body2" sx={{ fontWeight: "bold", color: grey[600] }}>
											Pending Join Requests
										</Typography>
									</Badge>
									{joinRequests.map((req) => (
										<Box
											key={req.request_id}
											sx={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												p: 2,
												mb: 1,
												bgcolor: grey[200],
												borderRadius: 2,
											}}
										>
											<Typography variant="body2">
												{req.sender_name ?? "Unknown user"} asked to join this group
											</Typography>
											<Box display="flex" gap={1}>
												<Button
													size="small"
													variant="contained"
													sx={{ textTransform: "none" }}
													onClick={() => handleApproveJoin(req.request_id)}
												>
													Approve
												</Button>
												<Button
													size="small"
													variant="outlined"
													color="inherit"
													sx={{ textTransform: "none" }}
													onClick={() => handleRejectGroupRequest(req.request_id)}
												>
													Reject
												</Button>
											</Box>
										</Box>
									))}
								</Box>
							)}

							{/* Pending Leave Requests — approving opens the ownership dialog first. */}
							{userRole === "group_admin" && leaveRequests.length > 0 && (
								<Box sx={{ px: 2, mb: 2 }}>
									<Badge
										badgeContent={leaveRequests.length}
										color="error"
										sx={{
											mb: 1,
											"& .MuiBadge-badge": {
												position: "static",
												transform: "none",
												ml: 1.5,
											},
										}}
									>
										<Typography variant="body2" sx={{ fontWeight: "bold", color: grey[600] }}>
											Pending Leave Requests
										</Typography>
									</Badge>
									{leaveRequests.map((req) => (
										<Box
											key={req.request_id}
											sx={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												p: 2,
												mb: 1,
												bgcolor: grey[200],
												borderRadius: 2,
											}}
										>
											<Typography variant="body2">
												{req.sender_name ?? "Unknown user"} asked to leave this group
											</Typography>
											<Box display="flex" gap={1}>
												<Button
													size="small"
													variant="contained"
													sx={{ textTransform: "none" }}
													onClick={() => {
														const requester = users.find((u) => u.user_sub === req.sender_sub);
														if (!requester) return;
														setSelectedUser(requester);
														setPendingRequestId(req.request_id);
														setRemovalPolicy("co_owned");
														setRemoveDialogOpen(true);
													}}
												>
													Approve
												</Button>
												<Button
													size="small"
													variant="outlined"
													color="inherit"
													sx={{ textTransform: "none" }}
													onClick={() => handleRejectGroupRequest(req.request_id)}
												>
													Reject
												</Button>
											</Box>
										</Box>
									))}
								</Box>
							)}

							{/* User Table */}
							{userRole === "group_admin" && (
								<>
									<Typography
										variant="body2"
										sx={{ px: 2, my: 2, fontWeight: "bold", color: grey[600] }}
									>
										Manage Group Members
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
														ROLE/GROUP UPDATED
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
															<Select
																labelId={`role-${u.user_sub}`}
																label="Role"
																value={u.role}
																disabled
															>
																<MenuItem value="group_admin">Group Admin</MenuItem>
																<MenuItem value="member">Member</MenuItem>
															</Select>
														</FormControl>
													</TableCell>
													<TableCell>
														{u.role_or_group_updated_at
															? new Date(u.role_or_group_updated_at).toLocaleString()
															: "-"}
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
								</>
							)}
						</>
					)}
					{/* Remove User Dialog */}
					<Dialog
						open={removeDialogOpen}
						onClose={() => {
							setRemoveDialogOpen(false);
							setPendingRequestId(null);
						}}
						fullWidth
					>
						<DialogTitle>Remove User</DialogTitle>
						<DialogContent>
							<Box sx={{ border: 1, borderColor: "divider", p: 3, mt: 2, borderRadius: 2 }}>
								<Typography variant="body2" color="text.secondary">
									Are you sure you want to remove this user from the group? This action cannot be
									undone.
								</Typography>
								<FormControl>
									<RadioGroup
										name="removal-policy"
										value={removalPolicy}
										onChange={(e) =>
											setRemovalPolicy(e.target.value as "co_owned" | "user" | "group")
										}
									>
										<FormControlLabel
											value="co_owned"
											control={<Radio />}
											label="Keep jobs and structures co-owned by the user and the group"
										/>
										<FormControlLabel
											value="group"
											control={<Radio />}
											label="Give jobs and structures to the group"
										/>
										<FormControlLabel
											value="user"
											control={<Radio />}
											label="Give jobs and structures to the user"
										/>
										<FormControlLabel
											value="delete"
											control={<Radio />}
											label="Delete the user's jobs and structures"
										/>
									</RadioGroup>
								</FormControl>
							</Box>
						</DialogContent>
						<DialogActions>
							<Button
								onClick={() => {
									setRemoveDialogOpen(false);
									setPendingRequestId(null);
								}}
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
					{/* <Dialog
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
					</Dialog> */}

					{/* Leave Group Dialog */}
					<Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)} fullWidth>
						<DialogTitle>Confirm Request</DialogTitle>
						<DialogContent>
							<Typography variant="body2" color="text.secondary">
								Request to leave <strong style={{ color: "#1565c0" }}>{groupName}</strong>? A group
								admin has to approve it, so you stay in the group until they do. Jobs and structures
								ownership will depend on admin decision.
							</Typography>
						</DialogContent>
						<DialogActions>
							<Button
								onClick={() => setLeaveDialogOpen(false)}
								variant="outlined"
								sx={{ textTransform: "none", color: grey[600], borderColor: grey[400] }}
							>
								Cancel
							</Button>
							<Button
								onClick={handleLeaveGroup}
								color="warning"
								variant="contained"
								startIcon={<RemoveCircleOutlineOutlined />}
								sx={{ textTransform: "none" }}
							>
								Send Request
							</Button>
						</DialogActions>
					</Dialog>
				</>
			)}
		</Paper>
	);
}

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
	Accordion,
	AccordionSummary,
	AccordionDetails,
	List,
	AccordionActions,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from "@mui/material";
import {
	createGroup,
	updateUser,
	getAllGroupsPaged,
	getAllUsersPaged,
	deleteUser,
	deleteGroup,
} from "../services/api"; // assume these exist
import type { User, Group } from "../types";
import { grey, blueGrey } from "@mui/material/colors";
import {
	WorkspacesOutlined,
	ExpandMore,
	PersonRemoveAlt1Outlined,
	DeleteOutlineOutlined,
	GroupRemoveOutlined,
} from "@mui/icons-material";

/**
 * Admin panel for creating groups and managing user roles/group assignments.
 *
 * This component fetches all groups and users, allows an admin to create a new
 * group with a selected group admin, and provides controls for changing user
 * roles or removing users from groups.
 */
export default function AdminGroupPanel({ token }: { token: string }) {
	// List of groups returned by the backend.
	const [groups, setGroups] = useState<Group[]>([]);

	// List of all users returned by the backend.
	const [users, setUsers] = useState<User[]>([]);

	// Form state for creating a new group.
	const [groupName, setGroupName] = useState("");
	const [groupAdmin, setGroupAdmin] = useState("");

	// Toggle used to re-fetch group/users after create/update actions.
	const [reload, setReload] = useState(false);

	// Delete-user confirmation state.
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [userToDelete, setUserToDelete] = useState<User | null>(null);

	// Delete-group confirmation state.
	const [deleteGroupConfirmOpen, setDeleteGroupConfirmOpen] = useState(false);
	const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

	// Fetch groups and users whenever the auth token changes or data is reloaded.
	useEffect(() => {
		const fetchData = async () => {
			const [groupResp, userResp] = await Promise.all([
				getAllGroupsPaged(token),
				getAllUsersPaged(token),
			]);
			setGroups(groupResp.data);
			setUsers(userResp.data);
		};
		fetchData();
	}, [token, reload]);

	/**
	 * Create a new group and assign the selected user as its group admin.
	 *
	 * The group admin must already exist in the user list. After the group is
	 * created, the selected user is updated with the `group_admin` role and the
	 * newly created group ID.
	 */
	const handleGroupCreate = async () => {
		if (!groupName || !groupAdmin) {
			alert("Please provide both group name and admin email.");
			return;
		}
		const groupAdminUser = users.find((user) => user.email === groupAdmin);
		if (!groupAdminUser) {
			alert("Group admin email does not match any user.");
			return;
		}
		const resp = await createGroup(groupName, token);
		if (resp.error) {
			alert("Failed to create group.");
			return;
		}

		// Promote the selected user to group admin for the newly created group.
		const promote = await updateUser(
			token,
			groupAdminUser.user_sub,
			"group_admin",
			resp.data.group_id,
		);
		if (promote.error) {
			alert(`Group created, but assigning the group admin failed: ${promote.error}`);
		}

		setGroupName("");
		setGroupAdmin("");
		setReload(!reload);
	};

	/**
	 * Update a user's role and optionally assign/remove their group.
	 *
	 * Passing an empty group ID removes the user from their current group.
	 */
	const handleUserUpdate = async (userSub: string, newRole: string, newGroupId: string) => {
		// The backend rejects group_admin without a group, so demote on removal.
		const role = !newGroupId && newRole === "group_admin" ? "member" : newRole;
		const resp = await updateUser(token, userSub, role, newGroupId || undefined);
		if (resp.error) {
			alert(resp.error);
			return;
		}
		setReload(!reload);
	};

	/**
	 * Delete user's account permanently, including their Auth0 account
	 */
	const handleUserDelete = async () => {
		if (!userToDelete) return;
		const resp = await deleteUser(token, userToDelete.user_sub);
		setDeleteConfirmOpen(false);
		setUserToDelete(null);
		if (resp.error) {
			alert(resp.error);
			return;
		}
		setReload(!reload);
	};

	/**
	 * Delete a group. Members are removed from it and group admins are demoted;
	 * assets owned only by the group are soft-deleted.
	 */
	const handleGroupDelete = async () => {
		if (!groupToDelete) return;
		const resp = await deleteGroup(token, groupToDelete.group_id);
		setDeleteGroupConfirmOpen(false);
		setGroupToDelete(null);
		if (resp.error) {
			alert(resp.error);
			return;
		}
		setReload(!reload);
	};

	return (
		<Paper sx={{ mb: 4 }}>
			<Typography
				variant="h6"
				color="text.secondary"
				bgcolor={blueGrey[200]}
				sx={{ p: 2, display: "flex", alignItems: "center" }}
			>
				<WorkspacesOutlined sx={{ mr: 1 }} />
				Group Management
			</Typography>
			<Box sx={{ m: 2, p: 2, border: "1px solid", borderRadius: 2, borderColor: "divider" }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
					Create New Group
				</Typography>
				<Box display="flex" gap={2}>
					<TextField
						label="Group Name"
						value={groupName}
						onChange={(e) => setGroupName(e.target.value)}
						size="small"
						required
					/>
					<TextField
						label="Group Admin Email"
						value={groupAdmin}
						onChange={(e) => setGroupAdmin(e.target.value)}
						size="small"
						required
					/>
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
			</Box>
			<Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, px: 2 }}>
				Manage User Roles and Groups
			</Typography>
			<Box sx={{ width: "100%", maxHeight: 500, overflowY: "auto", bgcolor: grey[50] }}>
				{groups.map((group) => (
					<Accordion key={group.group_id}>
						<AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "rgba(0, 0, 0, 0.03)" }}>
							<Typography variant="body1" color="text.primary">
								{group.name}
							</Typography>
						</AccordionSummary>
						<AccordionDetails sx={{ p: 0 }}>
							<List sx={{ width: "100%", bgcolor: "background.paper" }}>
								{group.users.map((user) => (
									<Box
										key={user.user_sub}
										sx={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											p: 1,
											borderBottom: "1px solid",
											borderColor: "divider",
										}}
									>
										<Typography variant="body2">{user.email}</Typography>
										<FormControl size="small" sx={{ minWidth: 120 }}>
											<InputLabel>Role</InputLabel>
											<Select
												value={user.role}
												label="Role"
												onChange={(e) =>
													handleUserUpdate(user.user_sub, e.target.value, group.group_id)
												}
											>
												<MenuItem value="member">Member</MenuItem>
												<MenuItem value="group_admin">Group Admin</MenuItem>
											</Select>
										</FormControl>
										<Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
											<Button
												variant="outlined"
												onClick={() => handleUserUpdate(user.user_sub, user.role, "")}
												sx={{ textTransform: "none", borderRadius: 2 }}
												startIcon={<PersonRemoveAlt1Outlined />}
											>
												Remove from Group
											</Button>
											<Button
												variant="outlined"
												color="error"
												onClick={() => {
													setUserToDelete(user);
													setDeleteConfirmOpen(true);
												}}
												sx={{ textTransform: "none", borderRadius: 2 }}
												startIcon={<DeleteOutlineOutlined />}
											>
												Delete User
											</Button>
										</Box>
									</Box>
								))}
							</List>
						</AccordionDetails>
						<AccordionActions sx={{ justifyContent: "flex-end", bgcolor: grey[100] }}>
							<Button
								variant="contained"
								size="small"
								onClick={() => {
									setGroupToDelete(group);
									setDeleteGroupConfirmOpen(true);
								}}
								sx={{ textTransform: "none" }}
								color="error"
								startIcon={<GroupRemoveOutlined />}
							>
								Delete Group
							</Button>
						</AccordionActions>
					</Accordion>
				))}
			</Box>
			<Dialog
				open={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				aria-labelledby="delete-user-dialog-title"
			>
				<DialogTitle id="delete-user-dialog-title">Confirm Deletion</DialogTitle>
				<DialogContent>
					<Typography variant="body1" color="text.primary">
						Are you sure you want to delete <strong>{userToDelete?.email}</strong>?
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
						This also removes their Auth0 account and cannot be undone. Jobs and structures shared
						with a group stay with that group; anything owned only by this user is deleted.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setDeleteConfirmOpen(false)}
						variant="outlined"
						color="inherit"
						sx={{ textTransform: "none", borderRadius: 2 }}
					>
						Cancel
					</Button>
					<Button
						onClick={handleUserDelete}
						color="error"
						variant="contained"
						startIcon={<DeleteOutlineOutlined />}
						sx={{ textTransform: "none", borderRadius: 2 }}
					>
						Delete User
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog
				open={deleteGroupConfirmOpen}
				onClose={() => setDeleteGroupConfirmOpen(false)}
				aria-labelledby="delete-group-dialog-title"
			>
				<DialogTitle id="delete-group-dialog-title">Confirm Deletion</DialogTitle>
				<DialogContent>
					<Typography variant="body1" color="text.primary">
						Are you sure you want to delete <strong>{groupToDelete?.name}</strong>?
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
						All {groupToDelete?.users.length ?? 0} member(s) will be removed from the group and any
						group admins demoted to member. Jobs and structures still owned by a user stay with that
						user; anything owned only by the group is deleted. This cannot be undone.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setDeleteGroupConfirmOpen(false)}
						variant="outlined"
						color="inherit"
						sx={{ textTransform: "none", borderRadius: 2 }}
					>
						Cancel
					</Button>
					<Button
						onClick={handleGroupDelete}
						color="error"
						variant="contained"
						startIcon={<GroupRemoveOutlined />}
						sx={{ textTransform: "none", borderRadius: 2 }}
					>
						Delete Group
					</Button>
				</DialogActions>
			</Dialog>
		</Paper>
	);
}

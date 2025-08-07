import { useEffect, useState } from 'react';
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
} from '@mui/material';
import { blueGrey, grey } from '@mui/material/colors';
import {
	GroupOutlined,
	RemoveCircleOutlineOutlined,
	CheckCircleOutlineOutlined,
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import {
	updateGroupName,
	getCurrentUserMembers,
	updateUser,
	upsertCurrentUser,
	getGroupById,
	getUserByEmail,
	getCurrentUserGroupJobs,
	updateJob,
	deleteJob,
	sendRequest,
} from '../services/api';
import type { User, Job } from '../types';

interface GroupPanelProps {
	token: string;
}

export default function GroupPanel({ token }: GroupPanelProps) {
	const { user } = useAuth0();

	const [users, setUsers] = useState<User[]>([]);
	const [jobs, setJobs] = useState<Job[]>([]);

	const [groupName, setGroupName] = useState('');
	const [groupId, setGroupId] = useState('');
	const [userRole, setUserRole] = useState('');

	const [newUserEmail, setNewUserEmail] = useState('');
	const [newUserError, setNewUserError] = useState('');

	const [reload, setReload] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
	const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [removalPolicy, setRemovalPolicy] = useState<'0' | '1' | '2'>('0');

	const [loading, setLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState('Loading...');

	// Fetch and load data sequentially with loading messages
	useEffect(() => {
		async function loadData() {
			if (!user?.email) return;
			setLoading(true);

			setLoadingMessage('Loading users...');
			const membersResp = await getCurrentUserMembers(token);
			setUsers(membersResp.data || []);

			setLoadingMessage('Loading current user...');
			const upsertResp = await upsertCurrentUser(token, user.email);
			setUserRole(upsertResp.data.role || '');

			setLoadingMessage('Loading group info...');
			if (upsertResp.data.group_id) {
				setGroupId(upsertResp.data.group_id);
				const grp = await getGroupById(upsertResp.data.group_id, token);
				if (grp.data) setGroupName(grp.data.name);
			}

			setLoadingMessage('Loading jobs...');
			const jobsResp = await getCurrentUserGroupJobs(token);
			setJobs(jobsResp.data || []);

			setLoading(false);
		}

		loadData();
	}, [token, user?.email, reload]);

	const statusColors: Record<string, string> = {
		pending: 'orange',
		approved: 'green',
		rejected: 'red',
	};

	// Handlers
	const handleGroupUpdate = async () => {
		await updateGroupName(groupId, groupName, token);
		setReload(r => !r);
	};

	const handleUserUpdate = async () => {
		if (!selectedUser) return;
		const userSub = selectedUser.user_sub;
		const userJobs = jobs.filter(j => j.user_sub === userSub);

		if (removalPolicy === '0') {
			await Promise.all(userJobs.map(j => deleteJob(j.job_id, token)));
		} else if (removalPolicy === '1') {
			await Promise.all(
				userJobs.map(j =>
					updateJob(j.job_id, j.status || '', j.runtime || '', user?.sub || '', token)
				)
			);
		}

		await updateUser(token, userSub, selectedUser.role, '');
		setReload(r => !r);
		setRemoveDialogOpen(false);
	};

  	const handleAddMember = async () => {
		if (!newUserEmail) return;
			const { data: foundUser, error } = await getUserByEmail(newUserEmail, token);
		if (error) {
			setNewUserError(error);
			return;
		}
		if (foundUser) {
			await sendRequest(foundUser.user_sub, groupId, token);
			setNewUserEmail('');
			setReload(r => !r);
			setAddMemberDialogOpen(false);
		}
  	};

	const paginatedUsers = users.slice(
		page * rowsPerPage,
		page * rowsPerPage + rowsPerPage
	);

  	return (
		<Paper sx={{ mb: 4, bgcolor: grey[50], borderRadius: 2 }}>
			{/* Header */}
			<Typography
				variant="h6"
				color="text.secondary"
				bgcolor={blueGrey[200]}
				sx={{ p: 2, display: 'flex', alignItems: 'center', borderTopLeftRadius: 5, borderTopRightRadius: 5 }}
			>
				<GroupOutlined sx={{ mr: 1 }} /> Group Management
			</Typography>
			{loading ? (
				<Paper sx={{ mb: 4, p: 4, bgcolor: grey[100], borderRadius: 2 }}>
					<Box display="flex" alignItems="center" justifyContent="center">
						<CircularProgress />
						<Typography variant="body2" sx={{ ml: 2 }}>{loadingMessage}</Typography>
					</Box>
				</Paper>
			) : (
				<>
					{/* Group Info and Add Member */}
					<Typography variant="body2" sx={{ px: 2, mb: 2, mt: 3, fontWeight: 'bold', color: grey[600] }}>
						{userRole === 'group_admin' ? 'Manage Group' : 'Group Information'}
					</Typography>

					<Grid container spacing={2} sx={{ px: 2 }}>
						<Grid size={{ xs: 12, md: 6 }}>
							{/* Group Name */}
							<Box sx={{ p: 2, bgcolor: grey[200], borderRadius: 2 }}>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								{userRole === 'group_admin' ? 'Update Group Name' : 'Group Name'}
								</Typography>
								<Box display="flex" gap={2}>
									<TextField
										label="Group Name"
										value={groupName}
										onChange={e => setGroupName(e.target.value)}
										size="small"
										disabled={userRole !== 'group_admin'}
									/>
									{userRole === 'group_admin' && (
										<Button
										variant="contained"
										onClick={handleGroupUpdate}
										size="small"
										disabled={!groupName}
										sx={{ textTransform: 'none' }}
										>
										Update
										</Button>
									)}
								</Box>
							</Box>
						</Grid>
						<Grid size={{ xs: 12, md: 6 }}>
							{/* Add Member */}
							{userRole === 'group_admin' && (
								<Box sx={{ p: 2, bgcolor: grey[200], borderRadius: 2 }}>
									{newUserError && <Alert severity="error" sx={{ mb: 2 }}>{newUserError}</Alert>}
									<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
										Add User to Group
									</Typography>
									<Box display="flex" gap={2}>
										<TextField
											label="User Email"
											value={newUserEmail}
											onChange={e => setNewUserEmail(e.target.value)}
											size="small"
										/>
										<Button
											variant="contained"
											onClick={() => setAddMemberDialogOpen(true)}
											size="small"
											disabled={!newUserEmail}
											sx={{ textTransform: 'none' }}
										>
											Add
										</Button>
									</Box>
								</Box>
							)}
						</Grid>
					</Grid>
					

					{/* User Table */}
					<Typography variant="body2" sx={{ px: 2, mb: 2, mt: 3, fontWeight: 'bold', color: grey[600] }}>
						{userRole === 'group_admin' ? 'Manage Group Members' : 'Your Group Members'}
					</Typography>
					<Table>
						<TableHead sx={{ bgcolor: blueGrey[50] }}>
						<TableRow>
							<TableCell>Email</TableCell>
							<TableCell>Role</TableCell>
							{userRole === 'group_admin' && <TableCell>Remove</TableCell>}
						</TableRow>
						</TableHead>
						<TableBody>
						{paginatedUsers.map(u => (
							<TableRow key={u.user_sub}>
							<TableCell>{u.email}</TableCell>
							<TableCell>
								<FormControl fullWidth size="small">
								<InputLabel id={`role-${u.user_sub}`}>Role</InputLabel>
								<Select labelId={`role-${u.user_sub}`} label="Role" value={u.role} disabled>
									<MenuItem value="group_admin">group_admin</MenuItem>
									<MenuItem value="member">member</MenuItem>
								</Select>
								</FormControl>
							</TableCell>
							{userRole === 'group_admin' && (
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
						onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
						rowsPerPageOptions={[5, 10, 25]}
						sx={{ bgcolor: blueGrey.A200, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 }}
					/>
					{/* Remove User Dialog */}
					<Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)} fullWidth>
						<DialogTitle>Remove User</DialogTitle>
						<DialogContent>
						<Typography variant="body2" color="text.secondary">
							Are you sure you want to remove this user from the group? This action cannot be undone.
						</Typography>
						<Box sx={{ border: 1, borderColor: 'divider', p: 3, mt: 2, borderRadius: 2 }}>
							<Typography variant="body2" color="text.secondary">
							As a group admin, you can choose what happens to the user's jobs they ran while they were part of your group.
							</Typography>
							<FormControl>
							<RadioGroup
								name="removal-policy"
								value={removalPolicy}
								onChange={e => setRemovalPolicy(e.target.value as '0'|'1'|'2')}
							>
								<FormControlLabel value="0" control={<Radio />} label="Delete all user's jobs" />
								<FormControlLabel value="1" control={<Radio />} label="Transfer ownership to me" />
								<FormControlLabel value="2" control={<Radio />} label="Let user retain their jobs" />
							</RadioGroup>
							</FormControl>
						</Box>
						</DialogContent>
						<DialogActions>
						<Button
							onClick={() => setRemoveDialogOpen(false)}
							variant="outlined"
							sx={{ textTransform: 'none', color: grey[600], borderColor: grey[400] }}
						>
							Cancel
						</Button>
						<Button
							onClick={handleUserUpdate}
							color="error"
							variant="contained"
							startIcon={<RemoveCircleOutlineOutlined />}
							sx={{ textTransform: 'none' }}
						>
							Remove
						</Button>
						</DialogActions>
					</Dialog>

					{/* Add Member Dialog */}
					<Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)} fullWidth>
						<DialogTitle>Confirm Add</DialogTitle>
						<DialogContent>
						<Typography variant="body2" color="text.secondary">
							Are you sure you want to add <strong style={{ color: '#1565c0' }}>{newUserEmail}</strong> to the group? They will have access to all group resources.
						</Typography>
						</DialogContent>
						<DialogActions>
						<Button
							onClick={() => setAddMemberDialogOpen(false)}
							variant="outlined"
							sx={{ textTransform: 'none', color: grey[600], borderColor: grey[400] }}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddMember}
							color="primary"
							variant="contained"
							startIcon={<CheckCircleOutlineOutlined />}
							sx={{ textTransform: 'none' }}
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

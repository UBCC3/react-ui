import React, { useEffect, useState } from 'react'
import { createGroup, deleteGroup, deleteUser, getAllGroups, getAllJobs, getAllUsers, updateUser } from '../services/api'
import { useAuth0 } from '@auth0/auth0-react';
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
	Typography
} from '@mui/material';
import { CancelOutlined, DeleteOutlined, EditOutlined, ExpandMore, RemoveCircleOutline, SaveOutlined, Search, GroupAddOutlined, ManageAccountsOutlined } from '@mui/icons-material';
import { MolmakerPageTitle } from '../components/custom';
import { Group, Job, User } from '../types';
import { green, red, blue, blueGrey, grey } from '@mui/material/colors';
import { UserRound, UsersRound } from 'lucide-react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const getRoleColor = (roleName: string) => {
	switch (roleName) {
		case 'admin':
			return red[100];
		case 'member':
			return blue[100];
		case 'group_admin':
			return green[100];
		default:
			return 'grey';
	}
}

const getChipColor = (role: string) => {
	switch (role) {
		case 'admin':
			return red[900];
		case 'member':
			return blue[900];
		case 'group_admin':
			return green[900];
		default:
			return 'grey';
	}
}

const getRoleName = (role: string) => {
	switch (role) {
		case 'admin':
			return 'Administrator';
		case 'member':
			return 'Member';
		case 'group_admin':
			return 'Group Admin';
		default:
			return 'User';
	}
}

const Users = () => {
	const { getAccessTokenSilently } = useAuth0();
	const [users, setUsers] = useState<User[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [jobs, setJobs] = useState<Job[]>([]);
	const [keyword, setKeyword] = useState('');
	const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [openEditDialog, setOpenEditDialog] = useState(false);
	const [deleteUserConfirmation, setDeleteUserConfirmation] = useState(false);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [alertMessage, setAlertMessage] = useState('');
	const [value, setValue] = useState(0);
	const [groupName, setGroupName] = useState('');
	const [groupAdmin, setGroupAdmin] = useState('');
	const [openConfirmation, setOpenConfirmation] = useState(false);
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				setLoading(true);
				const token = await getAccessTokenSilently();
				const groupResponse = await getAllGroups(token);
				setGroups(groupResponse.data);
				const userResponse = await getAllUsers(token);
				const jobResponse = await getAllJobs(token);
				setJobs(jobResponse.data);
				setUsers(userResponse.data.map(user => ({
					...user,
					group: groupResponse.data.find(group => group.group_id === user.group_id)?.name || 'No Group',
					jobCount: jobResponse.data.filter(job => job.user_sub === user.user_sub).length
				})));
				setLoading(false);
			} catch (error) {
				console.error('Error fetching users:', error);
			}
		};

		fetchUsers();
	}, []);

	useEffect(() => {
		if (keyword) {
			setFilteredUsers(users.filter(user => user.email.toLowerCase().includes(keyword.toLowerCase()) ||
				user.group?.toLowerCase().includes(keyword.toLowerCase())));
		} else {
			setFilteredUsers(users);
		}
	}, [keyword, users]);

	const handleDeMember = async (userSub: string) => {
		try {
			const token = await getAccessTokenSilently();
			await updateUser(token, userSub, 'member', '');
			setUsers(users.map(user => user.user_sub === userSub ? { ...user, role: 'member', group_id: '' } : user));
			setAlertMessage('User de-membered successfully.');
			setTimeout(() => setAlertMessage(''), 3000);
		} catch (error) {
			console.error('Error de-membering user:', error);
		}
	};

	const handleEditUser = async (user: User | null) => {
		if (!user) return;
		try {
			const token = await getAccessTokenSilently();
			await updateUser(token, user.user_sub, user.role, user.group_id);
			setUsers(users.map(u => u.user_sub === user.user_sub ? user : u));
			setAlertMessage('User updated successfully.');
			setTimeout(() => setAlertMessage(''), 3000);
		} catch (error) {
			console.error('Error editing user:', error);
		}
	};

	const handleDeleteUser = async (userSub: string) => {
		if (!userSub) return;
		try {
			const token = await getAccessTokenSilently();
			await deleteUser(token, userSub);
			setUsers(users.filter(u => u.user_sub !== userSub));
			setAlertMessage('User deleted successfully.');
			setTimeout(() => setAlertMessage(''), 3000);
		} catch (error) {
			console.error('Error deleting user:', error);
		}
	};

	const handleGroupCreate = async () => {
		const token = await getAccessTokenSilently();
		if (!groupName || !groupAdmin) {
			alert('Please provide both group name and admin email.');
			return;
		}
		const groupAdminUser = users.find(user => user.email === groupAdmin);
		if (!groupAdminUser) {
			alert('Group admin email does not match any user.');
			return;
		}
		const resp = await createGroup(groupName, token);
		if (resp.status !== 200) {
			alert('Failed to create group.');
		} else {
			await updateUser(token, groupAdminUser.user_sub, 'group_admin', resp.data.group_id);
		}

		setGroupName('');
		setGroupAdmin('');
	};

	const handleGroupDelete = async (groupId: string) => {
		if (!groupId) return;
		try {
			const token = await getAccessTokenSilently();
			await deleteGroup(token, groupId);
			setGroups(groups.filter(g => g.group_id !== groupId));
			setAlertMessage('Group deleted successfully.');
			setTimeout(() => setAlertMessage(''), 3000);
		} catch (error) {
			console.error('Error deleting group:', error);
		}
	};

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
			<Dialog
				open={openConfirmation}
				onClose={() => setOpenConfirmation(false)}
				fullWidth
			>
				<DialogTitle>
					Confirm Deletion
				</DialogTitle>
				<DialogContent sx={{ bgcolor: 'background.paper', mt: 1 }}>
					<Typography variant="body1" color="textPrimary">
						Are you sure you want to delete the group <strong>{selectedGroup?.name}</strong>?
					</Typography>
					<Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
						This action cannot be undone. All associated users will be removed from this group.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button 
							onClick={() => setOpenConfirmation(false)} 
							startIcon={<CancelOutlined />}
							variant='outlined'
							sx={{
								color: grey[700],
								borderColor: grey[700],
								'&:hover': { borderColor: grey[900], color: grey[900] },
								textTransform: 'none',
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (selectedGroup) {
									handleGroupDelete(selectedGroup.group_id);
								}
								setDeleteUserConfirmation(false);
							}}
							color="error"
							sx={{ ml: 1, textTransform: 'none' }}
							startIcon={<DeleteOutlined />}
							variant='contained'
						>
							Delete Group
						</Button>
				</DialogActions>
			</Dialog>
			<MolmakerPageTitle title="User Management" subtitle={"Manage users in the system."} />
			<Box sx={{ width: '100%' }}>
				<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
					<Tabs value={value} onChange={(event, newValue) => setValue(newValue)} aria-label="basic tabs example">
						<Tab 
							label={
								<div style={{ display: 'flex', alignItems: 'center' }}>
									<UserRound style={{ marginRight: 10, color: blue[600], width: 18, height: 18, fontWeight: 'bold' }} />
									<Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
										User List
									</Typography>
								</div>
							}
							{...a11yProps(0)} sx={{ textTransform: 'none' }} />
						<Tab 
							label={
								<div style={{ display: 'flex', alignItems: 'center' }}>
									<UsersRound style={{ marginRight: 10, color: blue[600], width: 18, height: 18, fontWeight: 'bold' }} />
									<Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
										Group Management
									</Typography>
								</div>
							}
							{...a11yProps(1)} sx={{ textTransform: 'none' }} />
					</Tabs>
				</Box>
				<CustomTabPanel value={value} index={0}>
					{loading ? (
						<Box sx={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
							<CircularProgress size={50} />
							<Typography variant="h6" sx={{ ml: 2, color: 'text.secondary', fontSize: '1rem' }}>Loading users...</Typography>
						</Box>
					) : (
						<>
							<Paper
								component="form"
								sx={{ p: '4px 4px', display: 'flex', alignItems: 'center', width: 400, mb: 2, borderRadius: 2, bgcolor: grey[50] }}
								elevation={3}
							>
								<IconButton sx={{ p: '10px' }} aria-label="search">
									<Search />
								</IconButton>
								<InputBase
									sx={{ ml: 1, flex: 1 }}
									placeholder="search users by email or group"
									inputProps={{ 'aria-label': 'search users by email or group' }}
									value={keyword}
									onChange={(e) => setKeyword(e.target.value)}
								/>
							</Paper>
							<Typography variant="h6" sx={{ my: 2, fontWeight: 600, fontSize: '0.875rem', color: grey[700] }}>
								{filteredUsers.length} users found
							</Typography>
							<Grid container spacing={2}>
								{filteredUsers.map((user) => (
									<Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={user.user_sub}>
										<Card sx={{ borderRadius: 2, bgcolor: grey[50] }} elevation={3}>
											<CardContent>
												<Chip
													label={getRoleName(user.role)}
													sx={{
														marginBottom: 1,
														bgcolor: getRoleColor(user.role),
														borderRadius: 1,
														color: getChipColor(user.role),
														fontWeight: 600,
														fontSize: '0.7rem',
													}} 
													size='small'
												/>
												<Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: 'primary.main' }}>
													{user.email}
												</Typography>
												<Typography variant="caption" color="textSecondary" sx={{ marginBottom: 1 }}>
													{user.group || 'No Group'}
												</Typography>
											</CardContent>
											<Divider />
											<CardActions sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
												<Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
													<span style={{ fontWeight: 600, marginRight: 7 }}>{user.job_count}</span>
													<span>jobs</span>
												</Typography>
												<Box>
													<IconButton aria-label="edit" color='primary' onClick={() => {
														setSelectedUser(user);
														setOpenEditDialog(true);
													}}>
														<EditOutlined />
													</IconButton>
													<IconButton aria-label="de-member" onClick={() => {
														setSelectedUser(user);
														handleDeMember(user.user_sub);
													}} color='warning'>
														<RemoveCircleOutline />
													</IconButton>
													<IconButton aria-label="delete" color='error' onClick={() => {
														setSelectedUser(user);
														setDeleteUserConfirmation(true);
													}}>
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
				<CustomTabPanel value={value} index={1}>
					<Paper sx={{ p: 3, borderRadius: 2, bgcolor: grey[50] }} elevation={3}>
						<Typography 
							variant="h6" 
							color={grey[800]}
							sx={{ display: 'flex', alignItems: 'center', borderTopLeftRadius: 5, borderTopRightRadius: 5, fontWeight: 'bold', fontSize: '1.1rem', mb: 3 }}
						>
							<GroupAddOutlined sx={{ mr: 1, color: blue[600] }} />
							Create New Group
						</Typography>
						<Box display="flex" gap={2}>
							<TextField label="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} size="small" required />
							<TextField label="Group Admin Email" value={groupAdmin} onChange={(e) => setGroupAdmin(e.target.value)}  size="small" required />
							<Button variant="contained" onClick={handleGroupCreate} size='small' disabled={!groupName || !groupAdmin} sx={{ textTransform: 'none' }}>
								Create Group
							</Button>
						</Box>
					</Paper>
					<Paper sx={{ borderRadius: 2, maxHeight: 500, overflowY: 'auto', p: 3, mt: 2, bgcolor: grey[50] }} elevation={3}>
						<Typography 
							variant="h6" 
							color={grey[800]}
							sx={{ display: 'flex', alignItems: 'center', borderTopLeftRadius: 5, borderTopRightRadius: 5, fontWeight: 'bold', fontSize: '1.1rem', mb: 3 }}
						>
							<ManageAccountsOutlined sx={{ mr: 1, color: blue[600] }} />
							Manage User Roles and Groups
						</Typography>
						{groups.map(group => (
							<Accordion key={group.group_id}>
								<AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: grey[100] }}>
									<Typography variant="body1" color={grey[700]} sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
										{group.name}
									</Typography>
								</AccordionSummary>
								<AccordionDetails sx={{ p: 0 }}>
									<List sx={{ width: '100%', bgcolor: 'background.paper', m:0, p: 0 }}>
										{group.users.map(user => (
											<ListItem key={user.user_sub} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
												<Typography variant="body2">{user.email}</Typography>
											</ListItem>
										))}
									</List>
								</AccordionDetails>
								<AccordionActions sx={{ justifyContent: 'flex-end', bgcolor: grey[100], p: 1 }}>
									<Tooltip title="Delete Group" arrow>
										<IconButton
											size="small" 
											onClick={() => {
												setSelectedGroup(group);
												setOpenConfirmation(true);
											}} 
											sx={{ textTransform: 'none' }} color='error'
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
			{openEditDialog && (
				// Placeholder for edit dialog component
				<Dialog
					open={openEditDialog}
					onClose={() => setOpenEditDialog(false)}
					fullWidth
				>
					<DialogTitle sx={{ bgcolor: blueGrey[200], color: blueGrey[900] }}>
						Edit User
					</DialogTitle>
					<DialogContent sx={{ bgcolor: 'background.paper', mt: 1 }}>
						<TextField
							label="Email"
							value={selectedUser?.email || ''}
							fullWidth
							margin="normal"
							variant="outlined"
							disabled
						/>
						<FormControl fullWidth margin="normal">
							<TextField
								select
								label="Group"
								value={selectedUser?.group_id || ''}
								onChange={(e) => {
									if (selectedUser) {
										setSelectedUser({ ...selectedUser, group_id: e.target.value });
									}
								}}
							>
								{groups.map(group => (
									<MenuItem key={group.group_id} value={group.group_id}>
										{group.name}
									</MenuItem>
								))}
							</TextField>
						</FormControl>
						<FormControl fullWidth margin="normal">
							<TextField
								select
								label="Role"
								value={selectedUser?.role || ''}
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
						<Button
							variant="contained"
							color="primary"
							onClick={() => {
								handleEditUser(selectedUser);
								setOpenEditDialog(false);
							}}
							sx={{ mt: 2, textTransform: 'none' }}
							startIcon={<SaveOutlined />}
						>
							Save Changes
						</Button>
					</DialogContent>
				</Dialog>
			)}
			{deleteUserConfirmation && (
				<Dialog
					open={deleteUserConfirmation}
					onClose={() => setDeleteUserConfirmation(false)}
				>
					<DialogTitle>
						Confirm Deletion
					</DialogTitle>
					<DialogContent sx={{ bgcolor: 'background.paper', mt: 2 }}>
						<Typography variant="body1" color="textPrimary">
							Are you sure you want to delete the user <strong>{selectedUser?.email}</strong>?
						</Typography>
						<Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
							This action cannot be undone. Any jobs and structures associated with this user will also be deleted.
						</Typography>
					</DialogContent>
					<DialogActions>
						<Button 
							onClick={() => setDeleteUserConfirmation(false)} 
							startIcon={<CancelOutlined />}
							variant='outlined'
							sx={{
								color: grey[700],
								borderColor: grey[700],
								'&:hover': { borderColor: grey[900], color: grey[900] },
								textTransform: 'none',
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (selectedUser) {
									handleDeleteUser(selectedUser.user_sub);
								}
								setDeleteUserConfirmation(false);
							}}
							color="error"
							sx={{ ml: 1, textTransform: 'none' }}
							startIcon={<DeleteOutlined />}
							variant='contained'
						>
							Delete User
						</Button>
					</DialogActions>
				</Dialog>
			)}
			{alertMessage && (
				<Alert
					severity="success"
					onClose={() => setAlertMessage('')}
					sx={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', width: '500px' }}
				>
					{alertMessage}
				</Alert>
			)}
		</Box>
	)
}

export default Users
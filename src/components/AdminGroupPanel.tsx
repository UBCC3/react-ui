import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, MenuItem, Select, FormControl, InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  AccordionActions
} from '@mui/material';
import { getAllGroups, createGroup, getAllUsers, updateUser } from '../services/api'; // assume these exist
import type { User, Group } from '../types';
import { grey, blueGrey } from '@mui/material/colors';
import { WorkspacesOutlined, ExpandMore, PersonRemoveAlt1Outlined, DeleteOutlineOutlined, GroupRemoveOutlined } from '@mui/icons-material';

export default function AdminGroupPanel({ token }: { token: string }) {
	const [groups, setGroups] = useState<Group[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [groupName, setGroupName] = useState('');
	const [groupAdmin, setGroupAdmin] = useState('');
	const [reload, setReload] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	useEffect(() => {
		const fetchData = async () => {
			const [groupResp, userResp] = await Promise.all([
				getAllGroups(token),
				getAllUsers(token)
			]);
			setGroups(groupResp.data);
			setUsers(userResp.data);
		};
		fetchData();
	}, [token, reload]);

	const handleGroupCreate = async () => {
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
		setReload(!reload);
	};

	const handleUserUpdate = async (userSub: string, newRole: string, newGroupId: string) => {
		if (!newGroupId) {
			await updateUser(token, userSub, newRole);
		} else {
			await updateUser(token, userSub, newRole, newGroupId);
		}
		setReload(!reload);
	};

  	return (
		<Paper sx={{ mb: 4 }}>
			<Typography variant="h6" color="text.secondary" bgcolor={blueGrey[200]} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
				<WorkspacesOutlined sx={{ mr: 1 }} />
				Group Management
			</Typography>
			<Box sx={{ m: 2, p: 2, border: '1px solid', borderRadius: 2, borderColor: 'divider' }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
					Create New Group
				</Typography>
				<Box display="flex" gap={2}>
					<TextField label="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} size="small" required />
					<TextField label="Group Admin Email" value={groupAdmin} onChange={(e) => setGroupAdmin(e.target.value)}  size="small" required />
					<Button variant="contained" onClick={handleGroupCreate} size='small' disabled={!groupName || !groupAdmin} sx={{ textTransform: 'none' }}>
						Create Group
					</Button>
				</Box>
			</Box>
			<Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, px: 2 }}>
				Manage User Roles and Groups
			</Typography>
			<Box sx={{ width: '100%', maxHeight: 500, overflowY: 'auto', bgcolor: grey[50] }}>
			{groups.map(group => (
				<Accordion key={group.group_id}>
					<AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }}>
						<Typography variant="body1" color="text.primary">{group.name}</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ p: 0 }}>
						<List sx={{ width: '100%', bgcolor: 'background.paper' }}>
							{group.users.map(user => (
								<Box key={user.user_sub} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
									<Typography variant="body2">{user.email}</Typography>
									<FormControl size="small" sx={{ minWidth: 120 }}>
										<InputLabel>Role</InputLabel>
										<Select
											value={user.role}
											label="Role"
											onChange={(e) => handleUserUpdate(user.user_sub, e.target.value, group.group_id)}
										>
											<MenuItem value="member">Member</MenuItem>
											<MenuItem value="group_admin">Group Admin</MenuItem>
										</Select>
									</FormControl>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
											<Button
												variant="outlined"
												size="small"
												onClick={() => handleUserUpdate(user.user_sub, user.role, '')}
												sx={{ textTransform: 'none' }}
												startIcon={<PersonRemoveAlt1Outlined />}
											>
												Remove from Group
											</Button>
											<Button
												variant="outlined"
												size="small"
												color="error"
												onClick={() => handleUserUpdate(user.user_sub, user.role, group.group_id)}
												sx={{ textTransform: 'none' }}
												startIcon={<DeleteOutlineOutlined />}
											>
												Delete User
											</Button>
										</Box>
								</Box>
							))}
						</List>
					</AccordionDetails>
					<AccordionActions sx={{ justifyContent: 'flex-end', bgcolor: grey[100] }}>
						<Button 
							variant="contained" 
							size="small" 
							onClick={() => handleUserUpdate(group.group_id, 'group_admin', group.group_id)} 
							sx={{ textTransform: 'none' }} color='error'
							startIcon={<GroupRemoveOutlined />}
						>
							Delete Group
						</Button>
					</AccordionActions>
				</Accordion>
			))}
			</Box>
		</Paper>
  	);
}

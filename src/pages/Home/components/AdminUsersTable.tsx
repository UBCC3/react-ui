import React, { use } from 'react';
import {
	TableContainer,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	Chip,
	Box,
	Typography,
	Button,
	Grid
} from '@mui/material';
import { ArrowDropUpOutlined, ArrowDropDownOutlined, AutoMode, TuneOutlined } from '@mui/icons-material';
import { statusColors } from '../../../constants';
import { blueGrey } from '@mui/material/colors';
import type { Job, User } from '../../../types';
import { getAllUsers } from '../../../services/api';
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function AdminUsersTable({}) {
	const { getAccessTokenSilently } = useAuth0();
	const [users, setUsers] = React.useState<User[]>([]);

  	useEffect(() => {
		const fetchUsers = async () => {
			const token = await getAccessTokenSilently();
			const response = await getAllUsers(token);
			setUsers(response.data);
		}
		fetchUsers();
	}, [getAccessTokenSilently]);

	return (
		<TableContainer>
			<Table>
				<TableHead sx={{ bgcolor: blueGrey[50] }}>
					<TableRow>
						<TableCell>User ID</TableCell>
						<TableCell>Email</TableCell>
						<TableCell>Group ID</TableCell>
						<TableCell>Role</TableCell>
						<TableCell>Actions</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{users.map(user => (
						<TableRow key={user.user_sub}>
							<TableCell>{user.user_sub}</TableCell>
							<TableCell>{user.email}</TableCell>
							<TableCell>{user.group_id || 'None'}</TableCell>
							<TableCell>{user.role}</TableCell>
							<TableCell>
								<Button variant="outlined" color="primary" size="small">
									Edit
								</Button>
								<Button variant="outlined" color="secondary" size="small" sx={{ ml: 1 }}>
									Delete
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

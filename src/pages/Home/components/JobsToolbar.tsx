import React from 'react';
import { 
	Toolbar,
	Typography,
	Box,
	IconButton,
	Tooltip,
	Divider,
	FormControl,
	InputLabel,
	Select,
	MenuItem
} from '@mui/material';
import {
	Refresh,
	Visibility,
	Image,
	FilterList,
	Block
} from '@mui/icons-material';
import { blueGrey } from '@mui/material/colors';

export interface JobsToolbarProps {
	selectedJobId: string | null;
	onViewDetails: () => void;
	onViewStructure: () => void;
	onFilterByStructure: () => void;
	onCancelJob: () => void;
	onRefresh: () => void;
	structures: Array<{ structure_id: string; name: string }>;
	selectedStructure: string;
	onStructureChange: (structureId: string) => void;
}

export default function JobsToolbar({
	selectedJobId,
	onViewDetails,
	onViewStructure,
	onFilterByStructure,
	onCancelJob,
	onRefresh,
	structures,
	selectedStructure,
	onStructureChange
}: JobsToolbarProps) {
	return (
		<Toolbar sx={{ justifyContent: 'space-between', bgcolor: blueGrey['A200'] }}>
			<Typography variant="h6" color="text.secondary">
				Jobs History
			</Typography>

			<Box sx={{ display: 'flex', alignItems: 'center' }}>
				<Box>
					<Tooltip title="View job details">
						<IconButton
							disabled={!selectedJobId}
							onClick={onViewDetails}
						>
							<Visibility />
						</IconButton>
					</Tooltip>

					<Tooltip title="View structures">
						<IconButton
							disabled={!selectedJobId}
							onClick={onViewStructure}
						>
							<Image />
						</IconButton>
					</Tooltip>

					<Tooltip title="Filter jobs with same structure">
						<IconButton
							disabled={!selectedJobId}
							onClick={onFilterByStructure}
						>
							<FilterList />
						</IconButton>
					</Tooltip>

					<Tooltip title="Cancel job">
						<IconButton
							disabled={!selectedJobId}
							onClick={onCancelJob}
						>
							<Block />
						</IconButton>
					</Tooltip>
				</Box>

				<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

				<Tooltip title="Refresh jobs">
					<IconButton onClick={onRefresh}>
						<Refresh />
					</IconButton>
				</Tooltip>

				<FormControl sx={{ minWidth: 160, ml: 2 }}>
					<InputLabel id="structure-select-label">Structure</InputLabel>
					<Select
						labelId="structure-select-label"
						value={selectedStructure}
						label="Structure"
						onChange={(e) => onStructureChange(e.target.value as string)}
					>
						{structures.map(({ structure_id, name }) => (
							<MenuItem key={structure_id} value={structure_id}>
								{name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>
		</Toolbar>
	);
}

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
	VisibilityOutlined,
	PhotoOutlined,
	FilterList,
	Block,
	AutoMode,
	TuneOutlined,
	DeleteOutlineOutlined
} from '@mui/icons-material';
import { blueGrey } from '@mui/material/colors';

interface JobsToolbarProps {
	selectedJobId: string | null;
	onViewDetails: () => void;
	onViewStructure: () => void;
	onFilterByStructure: () => void;
	viewStructureDisabled: boolean;
	cancelDisabled: (selectedJobId: string | null) => boolean;
	deleteDisabled: (selectedJobId: string | null) => boolean;
	onCancelJob: () => void;
	onDeleteJob: () => void;
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
	viewStructureDisabled,
	cancelDisabled,
	deleteDisabled,
	onCancelJob,
	onDeleteJob,
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
					<Tooltip title="Run Standard Job">
						<IconButton
							onClick={() => window.location.href = '/submit'}
						>
							<AutoMode />
						</IconButton>
					</Tooltip>
					<Tooltip title="Add Advanced Job">
						<IconButton
							onClick={() => window.location.href = '/advanced'}
						>
							<TuneOutlined />
						</IconButton>
					</Tooltip>
				</Box>
				<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
				<Box>
					<Tooltip title="View job details">
						<span>
							<IconButton
								disabled={!selectedJobId}
								onClick={onViewDetails}
							>
								<VisibilityOutlined />
							</IconButton>
						</span>
					</Tooltip>
					<Tooltip title="View structures">
						<span>
							<IconButton
								disabled={viewStructureDisabled}
								onClick={onViewStructure}
							>
								<PhotoOutlined />
							</IconButton>
						</span>
					</Tooltip>
					<Tooltip title="Filter jobs with same structure">
						<span>
							<IconButton
								disabled={!selectedJobId}
								onClick={onFilterByStructure}
							>
								<FilterList />
							</IconButton>
						</span>
					</Tooltip>
					<Tooltip title="Cancel job">
						<span>
							<IconButton
								disabled={cancelDisabled(selectedJobId)}
								onClick={onCancelJob}
							>
								<Block />
							</IconButton>
						</span>
					</Tooltip>
					<Tooltip title="Delete job">
						<span>
							<IconButton
								disabled={deleteDisabled(selectedJobId)}
								onClick={onDeleteJob}
							>
								<DeleteOutlineOutlined />
							</IconButton>
						</span>
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

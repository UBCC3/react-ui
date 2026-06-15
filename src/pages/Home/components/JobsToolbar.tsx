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
	DeleteOutlineOutlined,
	WorkHistoryOutlined,
	ArchiveOutlined,
    ManageSearchOutlined,
    InfoOutlined
} from '@mui/icons-material';
import { blue, grey } from '@mui/material/colors';

import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import {
    Collapse,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Button,
    TextField,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import type { Job } from '../../../types';

/**
 * Props for the JobsToolbar
 */
interface JobsToolbarProps {
    title?: string;
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
	onZipDownload: () => void;
	downloadDisabled: (selectedJobId: string | null) => boolean;
	isGroupAdmin?: boolean;

    // Select Columns
    displayColumns: Record<string, boolean>;
    columnDisplayNames: Record<string, string>;
    onColumnToggle: (col: string, checked: boolean) => void;
    // Filter Rows
    filters: Array<{
        column: keyof Job;
        value: string;
        extent: 'contains' | 'equals' | 'startsWith';
    }>;
    onFiltersChange: (filters: Array<{
        column: keyof Job;
        value: string;
        extent: 'contains' | 'equals' | 'startsWith';
    }>) => void;
    onFilterSubmit: () => void;
}

/**
 * Displays the toolbar for the jobs history table.
 * 
 * This toolbar provides actions for:
 * - creating standard or advanced jobs,
 * - viewing details for the selected job,
 * - viewing structures,
 * - filtering jobs by structure,
 * - downloading job archives,
 * - cancelling or deleting jobs for group admins,
 * - refreshing the jobs list,
 * - selecting a structure filter from the dropdown.
 */
export default function JobsToolbar({
    title = "Jobs History",
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
	onStructureChange,
	onZipDownload,
	downloadDisabled,
	isGroupAdmin = false,
    displayColumns,
    columnDisplayNames,
    onColumnToggle,
    filters,
    onFiltersChange,
    onFilterSubmit,
}: JobsToolbarProps) {
    const [selectColumnsOpen, setSelectColumnsOpen] = React.useState(false);
    const [filterRowsOpen, setFilterRowsOpen] = React.useState(false);

	return (
        <Box>
            <Toolbar sx={{ justifyContent: 'space-between', borderTopLeftRadius: 5, borderTopRightRadius: 5 }}>
                <Typography variant="h6" color={grey[800]} sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    <WorkHistoryOutlined sx={{ mr: 2, color: blue[600] }} />
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Select Columns + Filter Rows toggles */}
                    <Box sx={{ borderRadius: 1, display: 'flex', alignItems: 'center', px: 2, bgcolor: grey[100], mr: 1 }}>
                        <Tooltip title="Select Columns">
                            <IconButton onClick={() => setSelectColumnsOpen(o => !o)}>
                                <ViewColumnIcon sx={{ color: selectColumnsOpen ? blue[600] : 'inherit' }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Filter Rows">
                            <IconButton onClick={() => setFilterRowsOpen(o => !o)}>
                                <ManageSearchOutlined sx={{ color: filterRowsOpen ? blue[600] : 'inherit' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {/* Other functions' icons */}
                    <Box sx={{ borderRadius: 1, display: 'flex', alignItems: 'center', px: 2, bgcolor: grey[100], mr: 1 }}>
                        <Tooltip title="View job details">
                            <span>
                                <IconButton disabled={!selectedJobId} onClick={onViewDetails}>
                                    <VisibilityOutlined />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="View structures">
                            <span>
                                <IconButton disabled={viewStructureDisabled} onClick={onViewStructure}>
                                    <PhotoOutlined />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Filter jobs with same structure">
                            <span>
                                <IconButton disabled={!selectedJobId} onClick={onFilterByStructure}>
                                    <FilterList />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Download job archive">
                            <span>
                                <IconButton disabled={downloadDisabled(selectedJobId)} onClick={onZipDownload}>
                                    <ArchiveOutlined />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {isGroupAdmin && (
                            <Tooltip title="Cancel job">
                                <span>
                                    <IconButton disabled={cancelDisabled(selectedJobId)} onClick={onCancelJob}>
                                        <Block />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        {isGroupAdmin && (
                            <Tooltip title="Delete job">
                                <span>
                                    <IconButton disabled={deleteDisabled(selectedJobId)} onClick={onDeleteJob}>
                                        <DeleteOutlineOutlined />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                    </Box>
                    <Box sx={{ borderRadius: 1, display: 'flex', alignItems: 'center', px: 2, bgcolor: grey[100] }}>
                        <Tooltip title="Refresh jobs">
                            <IconButton onClick={onRefresh}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2}}>
                        <Tooltip title="Filter jobs by library structure. Select a structure to show only jobs that used it.">
                            <InfoOutlined sx={{ fontSize: 16, color: grey[600], mr: 0}}/>
                        </Tooltip>
                        <FormControl size="small" sx={{ minWidth: 160, ml: 2 }}>
                            <InputLabel shrink>Library Structure</InputLabel>
                            <Select
                                value={selectedStructure}
                                label="Library Structure"
                                displayEmpty
                                notched
                                onChange={(e) => onStructureChange(e.target.value as string)}
                            >
                                {structures.map(({ structure_id, name }) => (
                                    <MenuItem key={structure_id} value={structure_id}>{name}</MenuItem>
                                ))}

                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Toolbar>
    
            {/* Select Columns panel */}
            <Collapse in={selectColumnsOpen}>
                <Box sx={{ borderTop: `1px solid ${grey[200]}`, px: 3, py: 2 }}>
                    <Typography variant="body2" color={grey[500]} sx={{ mb: 1 }}>
                        Choose which columns to display
                    </Typography>
                    <FormGroup sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, mt: 1 }}>
                        {Object.keys(columnDisplayNames).map((col) => (
                            <FormControlLabel
                                key={col}
                                control={
                                    <Checkbox
                                        checked={displayColumns[col] ?? true}
                                        onChange={(e) => onColumnToggle(col, e.target.checked)}
                                        color="primary"
                                        size="small"
                                    />
                                }
                                label={
                                    <span className='text-xs text-gray-600 font-semibold'>
                                        {columnDisplayNames[col].toUpperCase()}
                                    </span>
                                }
                            />
                        ))}
                    </FormGroup>
                </Box>
            </Collapse>
    
            {/* Filter Rows panel */}
            <Collapse in={filterRowsOpen}>
                <Box sx={{ borderTop: `1px solid ${grey[200]}`, px: 3, py: 2 }}>
                    <Typography variant="body2" color={grey[500]} sx={{ mb: 1 }}>
                        Add one or more filters to search within jobs
                    </Typography>
                    <Box sx={{ bgcolor: grey[200], p: 3, borderRadius: 2 }}>
                        {filters.map((filter, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Select
                                    value={filter.column}
                                    size='small'
                                    onChange={(e) => {
                                        const updated = [...filters];
                                        updated[index] = { ...updated[index], column: e.target.value as keyof Job };
                                        onFiltersChange(updated);
                                    }}
                                    sx={{ minWidth: 120, mr: 1 }}
                                >
                                    {Object.keys(columnDisplayNames).map(col => (
                                        <MenuItem key={col} value={col}>{columnDisplayNames[col]}</MenuItem>
                                    ))}
                                </Select>
                                <Select
                                    value={filter.extent}
                                    size='small'
                                    onChange={(e) => {
                                        const updated = [...filters];
                                        updated[index] = { ...updated[index], extent: e.target.value as 'contains' | 'equals' | 'startsWith' };
                                        onFiltersChange(updated);
                                    }}
                                    sx={{ minWidth: 120, mr: 1 }}
                                >
                                    <MenuItem value="contains">Contains</MenuItem>
                                    <MenuItem value="equals">Equals</MenuItem>
                                    <MenuItem value="startsWith">Starts With</MenuItem>
                                </Select>
                                <TextField
                                    variant="outlined"
                                    size="small"
                                    value={filter.value}
                                    onChange={(e) => {
                                        const updated = [...filters];
                                        updated[index] = { ...updated[index], value: e.target.value };
                                        onFiltersChange(updated);
                                    }}
                                    sx={{ flexGrow: 1, mr: 1 }}
                                />
                                <IconButton
                                    color="error"
                                    onClick={() => {
                                        const updated = [...filters];
                                        updated.splice(index, 1);
                                        onFiltersChange(updated);
                                    }}
                                >
                                    <DeleteOutlineOutlined />
                                </IconButton>
                            </Box>
                        ))}
                        <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<Add />}
                            sx={{ mt: 1, textTransform: 'none' }}
                            onClick={() => onFiltersChange([...filters, { column: 'job_name', value: '', extent: 'contains' }])}
                        >
                            Add Filter
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={onFilterSubmit}
                            sx={{ mt: 2, textTransform: 'none', display: 'block', borderRadius: 2 }}
                            fullWidth
                        >
                            Apply Filters
                        </Button>
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}

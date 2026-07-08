import React, { useState } from "react";
import { Box, Chip, Collapse, Typography } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import { Job } from "../../types";
import { MolmakerPageTitle } from "../custom";
import ViewerTipsCard from "./ViewerTipsCard";
import { useDrawerWidth } from "../../contexts/DrawerWidthContext";

interface JobResultHeaderProps {
    job: Job;
}

/**
 * Convert the backend calculation type value into a user-facing label.
 */
const renderCalculationType = (type: string) => {
    switch (type) {
        case "standard":
            return "Standard Analysis";
        case "optimization":
            return "Geometric Optimization";
        case "frequency":
            return "Vibration Frequency";
        case "orbitals":
            return "Molecular Orbital";
        case "energy":
            return "Molecular Energy";
        case "transition":
            return "Transition State Optimization";
        case "irc":
            return "Intrinsic Reaction Coordinate";
    }
}

/**
 * Job details header (title, tags, notes) and viewer tips card, shown above
 * every result page - both standard analysis (multi-tab) and standalone
 * custom job results.
 */
const JobResultHeader: React.FC<JobResultHeaderProps> = ({ job }) => {
    const [notesOpen, setNotesOpen] = useState(false);
    const { drawerWidth } = useDrawerWidth();

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 3,
            pr: `${drawerWidth}px`,
        }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <MolmakerPageTitle
                    title={job.job_name}
                    subtitle={renderCalculationType(job.calculation_type)}
                    removeBottomPadding={true}
                />

                {job.tags.length > 0 && (
                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        mt: 1.5
                    }}>
                        {job.tags.map((tag, index) => (
                            <Chip
                                key={`tag-${index}`}
                                label={tag}
                                size="small"
                                variant="outlined"
                            />
                        ))}
                    </Box>
                )}
                {job.job_notes && (
                    <Box sx={{ mt: 1.5 }}>
                        <Box
                            onClick={() => setNotesOpen(!notesOpen)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                color: 'text.secondary',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                '&:hover': { backgroundColor: grey[100] },
                            }}
                        >
                            <Typography variant="body2" sx={{ mr: 0.5, fontWeight: 500 }}>
                                {notesOpen ? 'Hide notes' : 'Show notes'}
                            </Typography>
                            {notesOpen ? <ExpandLess fontSize="small"/> : <ExpandMore fontSize="small"/>}
                        </Box>
                        <Collapse in={notesOpen}>
                            <Typography variant="body2" sx={{
                                mt: 1,
                                p: 1.5,
                                bgcolor: grey[100],
                                borderRadius: 1,
                                maxWidth: 600,
                            }}>
                                {job.job_notes}
                            </Typography>
                        </Collapse>
                    </Box>
                )}
            </Box>
            <Box sx={{ width: 320, flexShrink: 0 }}>
                <ViewerTipsCard />
            </Box>
        </Box>
    );
};

export default JobResultHeader;
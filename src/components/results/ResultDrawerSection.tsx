import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, Typography, SxProps, SvgIconProps } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { grey } from '@mui/material/colors';

interface ResultDrawerSectionProps {
    /**
     * Whether the parent drawer is expanded (full width) vs collapsed (mini/icon-only)
     */
    open: boolean;
    /**
     * Whether this accordion is expanded
     */
    expanded: boolean;
    onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
    icon: React.ReactElement<SvgIconProps>;
    label: string;
    /**
     * Used to build unique aria-controls/id pairs, e.g. "panel1"
     */
    ariaId: string;
    children: React.ReactNode;
    detailsSx?: SxProps;
}

/**
 * One accordion section within a ResultDrawer (e.g. "Calculated Quantities",
 * "Partial Charges", "Orbitals", "Vibration Modes"). Encapsulates the
 * repeated accordion styling and icon/label collapse behavior that was
 * previously duplicated across every result viewer.
 */
export function ResultDrawerSection({
    open,
    expanded,
    onChange,
    icon,
    label,
    ariaId,
    children,
    detailsSx,
}: ResultDrawerSectionProps) {
    return (
        <Accordion
            expanded={expanded}
            onChange={onChange}
            sx={{
                backgroundColor: expanded ? grey[300] : grey[100],
                borderRadius: 0,
                boxShadow: 'none',
                mb: 0,
                transition: 'background-color 0.3s ease',
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls={`${ariaId}-content`}
                id={`${ariaId}-header`}
                sx={{ color: grey[900], px: 1.5 }}
            >
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                    {React.cloneElement(icon, { sx: open ? { mr: 1 } : { ml: 2 } })}
                    {open && <span>{label}</span>}
                </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', p: 0, ...detailsSx }}>
                {children}
            </AccordionDetails>
        </Accordion>
    )
}
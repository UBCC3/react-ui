import React from "react";
import { Drawer, Toolbar, IconButton } from "@mui/material";
import { Fullscreen, FullscreenExit } from '@mui/icons-material';
import { grey } from '@mui/material/colors';
import { APP_BAR_HEIGHT } from "../../constants";

/** 
 * Width of the expanded result drawer in pixels.
 */
export const DRAWER_FULL_WIDTH = 400;
/**
 * Width of the collapsed
 */
export const DRAWER_MINI_WIDTH = 80;

interface ResultDrawerProps {
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

/**
 * Persistent right-side result drawer shared by all calculation result
 * viewers (Energy, Optimization, Orbital, Vibration). Renders the
 * fullscreen/collapse toggle in the toolbar; viewer-specific content is
 * passed in as `children`, typically a series of <ResultDrawerSection />s.
 */
export function ResultDrawer({ open, onToggle, children }: ResultDrawerProps) {
    return (
        <Drawer
            variant="persistent"
            anchor="right"
            sx={{
                width: open ? DRAWER_FULL_WIDTH : DRAWER_MINI_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    top: `${APP_BAR_HEIGHT}px`,
                    height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
                    width: open ? DRAWER_FULL_WIDTH : DRAWER_MINI_WIDTH,
                    boxSizing: 'border-box',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    backgroundColor: grey['A100'],
                }
            }}
            open
        >
            <Toolbar sx={{ justifyContent: 'flex-start', displa: 'flex', alignItems: 'center' }}>
                <IconButton onClick={onToggle} size="small" sx={{ color: grey[500], mr: 2 }}>
                    {open ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
            </Toolbar>
            {children}
        </Drawer>
    );
}
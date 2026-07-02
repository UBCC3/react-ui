import React from "react";
import { Drawer, Toolbar, IconButton, Box } from "@mui/material";
import { Fullscreen, FullscreenExit } from '@mui/icons-material';
import { grey } from '@mui/material/colors';
import { APP_BAR_HEIGHT } from "../../constants";
import { useResizableWidth } from "../../hooks/UseResizableWidth";

/** 
 * Default width of the expanded result drawer in pixels.
 */
export const DRAWER_FULL_WIDTH = 400;
/**
 * Width of the collapsed result drawer in pixels.
 */
export const DRAWER_MINI_WIDTH = 80;
/**
 * Narrowest the drawer can be dragged to while expanded.
 */
const DRAWER_MIN_WIDTH = 320;
/**
 * Widest the drawer can be dragged to while expanded.
 */
const DRAWER_MAX_WIDTH = 720;

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
 * 
 * The dragged width only applies while the drawer is expanded - collapsing
 * it always snaps back to DRAWER_MINI_WIDTH, and the last dragged width is
 * restored the next time it's expanded.
 */
export function ResultDrawer({ open, onToggle, children }: ResultDrawerProps) {
    const { width, startResizing } = useResizableWidth(DRAWER_FULL_WIDTH, DRAWER_MIN_WIDTH, DRAWER_MAX_WIDTH);
    const drawerWidth = open ? width : DRAWER_MINI_WIDTH;

    return (
        <Drawer
            variant="persistent"
            anchor="right"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    top: `${APP_BAR_HEIGHT}px`,
                    height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    backgroundColor: grey['A100'],
                    transition: 'none',
                }
            }}
            open
        >
            {open && (
                <Box
                    onMouseDown={startResizing}
                    sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '6px',
                        cursor: 'col-resize',
                        zIndex: (theme) => theme.zIndex.drawer + 1,
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            opacity: 0.4,
                        },
                    }}
                />
            )}
            <Toolbar sx={{ justifyContent: 'flex-start', displa: 'flex', alignItems: 'center' }}>
                <IconButton onClick={onToggle} size="small" sx={{ color: grey[500], mr: 2 }}>
                    {open ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
            </Toolbar>
            {children}
        </Drawer>
    );
}
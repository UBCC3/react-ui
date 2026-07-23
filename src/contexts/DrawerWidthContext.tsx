import React, { createContext, useContext, useState } from "react";
import { DRAWER_MINI_WIDTH } from "../constants";

interface DrawerWidthContextValue {
	drawerWidth: number;
	setDrawerWidth: (width: number) => void;
}

const DrawerWidthContext = createContext<DrawerWidthContextValue>({
	drawerWidth: DRAWER_MINI_WIDTH,
	setDrawerWidth: () => {},
});

/**
 * Shares the result drawer's current effective width (open/collapsed,
 * including drag-resized values) with ancestor layout components that need
 * to reserve space for it, without prop-drilling through every viewer.
 */
export const DrawerWidthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [drawerWidth, setDrawerWidth] = useState(DRAWER_MINI_WIDTH);
	return (
		<DrawerWidthContext.Provider value={{ drawerWidth, setDrawerWidth }}>
			{children}
		</DrawerWidthContext.Provider>
	);
};

export const useDrawerWidth = () => useContext(DrawerWidthContext);

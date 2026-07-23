import { createContext, useContext, useState, useMemo, PropsWithChildren } from "react";

/**
 * Shape of the shared drawer state.
 */
type DrawerCtx = {
	open: boolean;
	width: number;
	toggle: () => void;
};

/**
 * Default drawer context value.
 */
const defaultCtx: DrawerCtx = {
	open: true,
	width: 250,
	toggle: () => {},
};

/**
 * React context used to share drawer state across layout components.
 */
const Ctx = createContext<DrawerCtx>(defaultCtx);

/**
 * Provides drawer state to child components.
 *
 * Components inside this provider can access the drawer's open state, current
 * width, and toggle function through the `useDrawer` hook.
 */
export const DrawerProvider = ({ children }: PropsWithChildren) => {
	const [open, setOpen] = useState(true);
	const width = open ? 250 : 56;

	const value = useMemo<DrawerCtx>(
		() => ({ open, width, toggle: () => setOpen((o) => !o) }),
		[open],
	);
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useDrawer = () => useContext(Ctx);

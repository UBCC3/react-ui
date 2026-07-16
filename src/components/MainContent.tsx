import { Box, Toolbar } from "@mui/material";
import { useDrawer } from "./DrawerContext";

/**
 * Layout wrapper for the main page content.
 */
export default function MainContent({ children }) {
	const { width } = useDrawer();

	return (
		<Box
			component="main"
			sx={{
				flexGrow: 1,
				ml: `${width}px`,
				transition: (theme) =>
					theme.transitions.create("margin-left", {
						easing: theme.transitions.easing.sharp,
						duration: theme.transitions.duration.standard,
					}),
			}}
			className="bg-stone-100"
		>
			<Toolbar />
			{children}
		</Box>
	);
}

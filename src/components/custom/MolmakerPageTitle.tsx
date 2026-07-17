import { Grid, Typography, Box } from "@mui/material";
import { ReactNode } from "react";

interface MolmakerPageTitleProps {
    title: ReactNode;
    subtitle: ReactNode;
    removeBottomPadding?: boolean;
}

/**
 * Renders a reusable MolmakerPageTitle
 *
 * Props:
 * - title: the main title of the panel
 * - subtitle: the sub title of thhe panel
 * - removeBottomPadding: when true, remove the bottom padding
 */
const MolmakerPageTitle = ({ title, subtitle, removeBottomPadding = false }: MolmakerPageTitleProps) => {
	return (
		<Box
			sx={{
				mb: removeBottomPadding ? 0 : 3,
			}}
		>
			<Grid
				container
				sx={{
					display: "flex",
					alignItems: "start",
					flexDirection: "column",
					justifyContent: "center",
				}}
			>
				<h5 className="font-semibold text-2xl text-gray-700 mb-2 font-sans">{title}</h5>
				<Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
					{subtitle}
				</Typography>
			</Grid>
		</Box>
	);
};

export default MolmakerPageTitle;

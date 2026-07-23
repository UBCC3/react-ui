import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { grey } from "@mui/material/colors";

/**
 * Static hint card shown beside the JSmol viewer. Surfaces the viewer's
 * right-click context menu (export image, display style, spin, measurements,
 * etc.), which isn't otherwise discoverable anywhere in the UI.
 */
const ViewerTipsCard: React.FC = () => {
	return (
		<Paper
			variant="outlined"
			sx={{
				p: 2,
				bgcolor: grey[50],
				display: "flex",
				flexDirection: "column",
				gap: 1,
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 0.5,
				}}
			>
				<InfoOutlined fontSize="small" color="action" />
				<Typography variant="subtitle2">Viewer tips</Typography>
			</Box>
			<Typography variant="body2" color="text.secondary">
				Right-click the 3D viewer for more options — export an image, change display style, spin,
				measure distances, and more.
			</Typography>
		</Paper>
	);
};

export default ViewerTipsCard;

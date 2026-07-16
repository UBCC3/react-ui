import { Box, Button, Typography } from "@mui/material";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";

const NotFound = ({ subject = "Page" }) => {
	return (
		// Full-page centered layout for displying a not-found message.
		<Box
			bgcolor={"rgb(247, 249, 252)"}
			p={4}
			display="flex"
			justifyContent="center"
			alignItems="center"
			height="80vh"
			flexDirection="column"
		>
			{/* Main heading showing what type of item was not found. */}
			<Typography variant="h2" color="text.secondary">
				{subject} not found
			</Typography>

			{/* Short explanation shown below the heading. */}
			<Typography variant="body1" color="text.secondary" mt={4}>
				Uh oh! It seems like the page you are looking for does not exist.
			</Typography>

			{/* Button that redirects the user back to the home page. */}
			<Button
				variant="contained"
				color="primary"
				sx={{ mt: 4, textTransform: "none" }}
				onClick={() => (window.location.href = "/")}
				startIcon={<ExitToAppOutlinedIcon fontSize="small" />}
			>
				Go to Home
			</Button>
		</Box>
	);
};

export default NotFound;

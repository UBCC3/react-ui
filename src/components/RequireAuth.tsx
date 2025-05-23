import { useAuth0 } from "@auth0/auth0-react";
import { CircularProgress, Box } from "@mui/material";

const RequireAuth = ({ children }) => {
	const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

	if (isLoading) {
		return (
			<Box display="flex" justifyContent="center" bgcolor={'rgb(247, 249, 252)'} p={4}>
				<CircularProgress />
			</Box>
		);
	}

	if (!isAuthenticated) {
		loginWithRedirect();
		return null;
	}

	return children;
};

export default RequireAuth;

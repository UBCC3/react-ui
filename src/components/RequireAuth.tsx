import { useAuth0 } from "@auth0/auth0-react";
import MolmakerLoading from "../MolmakerFormComponents/MolmakerLoading";

const RequireAuth = ({ children }) => {
	const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

	if (isLoading) {
		return (
			<MolmakerLoading />
		);
	}

	if (!isAuthenticated) {
		loginWithRedirect();
		return null;
	}

	return children;
};

export default RequireAuth;

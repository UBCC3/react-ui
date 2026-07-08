import { useAuth0 } from "@auth0/auth0-react";
import MolmakerLoading from "./custom/MolmakerLoading";

/**
 * Protects routes that should only be accessible to authenticated users.
 * 
 * This component checks the Auth0 authentication state before rendering
 * the protected page content.
 * 
 * Behaviour:
 * - Shows a loading screen while Auth0 is still checking the session
 * - Redirects unauthenticated users to the Auth0 login page
 * - Renders the protected child components once the user is authenticated
 */
const RequireAuth = ({ children }) => {
	const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

	if (isLoading) {
		return (
			<MolmakerLoading />
		);
	}

	if (!isAuthenticated) {
		loginWithRedirect({
            appState: { returnTo: window.location.pathname }
        });
		return null;
	}

	return children;
};

export default RequireAuth;

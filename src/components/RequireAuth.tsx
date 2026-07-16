import { ReactNode, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import MolmakerLoading from "./custom/MolmakerLoading";
import { useLocation } from "react-router-dom";

type RequireAuthProps = {
    children: ReactNode;
};

/**
 * Protects pages that require an authenticated user.
 *
 * While Auth0 checks the session, a loading screen is displayed.
 * Unauthenticated users are redirected to Auth0 and returned to
 * their original page after signing in.
 */
const RequireAuth = ({ children }: RequireAuthProps) => {
    const {
        isAuthenticated,
        isLoading,
        loginWithRedirect,
    } = useAuth0();

    const location = useLocation();
    const redirectStarted = useRef(false);

    const returnTo = location.pathname + location.search;

    useEffect(() => {
        if (
            isLoading ||
            isAuthenticated ||
            redirectStarted.current
        ) {
            return;
        }

        redirectStarted.current = true;

        void loginWithRedirect({
            appState: {
                returnTo,
            },
        }).catch((error) => {
            // Allow another attempt if starting the Auth0 redirect failed.
            redirectStarted.current = false;
            console.error("Unable to start Auth0 login redirect", error);
        });
    }, [
        isLoading,
        isAuthenticated,
        loginWithRedirect,
        returnTo,
    ]);

    if (isLoading || !isAuthenticated) {
        return <MolmakerLoading />;
    }

    return children;
};

export default RequireAuth;

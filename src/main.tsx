import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { AppState, Auth0Provider } from "@auth0/auth0-react";
import "./index.css";
import App from "./App";

const Auth0ProviderWithNavigate = ({ children }: React.PropsWithChildren) => {
	const navigate = useNavigate();

	const onRedirectCallback = (appState?: AppState) => {
		navigate(appState?.returnTo || "/", { replace: true });
	};

    return (
        <Auth0Provider
            domain={import.meta.env.VITE_AUTH0_DOMAIN}
            clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
            authorizationParams={{
                redirect_uri: window.location.origin + '/ubchemica',
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            }}
            useRefreshTokens={true}
            onRedirectCallback={onRedirectCallback}
        >
            {children}
        </Auth0Provider>
    )
}

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<BrowserRouter basename='/ubchemica'>
                <Auth0ProviderWithNavigate>
                    <App />
                </Auth0ProviderWithNavigate>
            </BrowserRouter>
		</StrictMode>,
	);
} else {
	console.error("Root element with id 'root' not found.");
}

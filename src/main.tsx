import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from "@auth0/auth0-react";
import './index.css'
import App from './App.jsx'

const onRedirectCallback = (appState) => {
    window.history.replaceState(
        {},
        document.title,
        appState?.returnTo || window.location.pathname
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<Auth0Provider
				domain={import.meta.env.VITE_AUTH0_DOMAIN}
				clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
				authorizationParams={{
					redirect_uri: window.location.origin + (import.meta.env.VITE_MODE === 'development' ? '/callback' : '/ubchemica'),
					audience: import.meta.env.VITE_AUTH0_AUDIENCE,
				}}
                useRefreshTokens={true}
                onRedirectCallback={onRedirectCallback}
			>
				<App />
			</Auth0Provider>
		</StrictMode>,
	);
} else {
	console.error("Root element with id 'root' not found.");
}

/// <reference types="vite/client" />

// Extend Vite's ImportMetaEnv interface with your custom env variables
interface ImportMetaEnv {
	readonly VITE_STORAGE_API_URL: string;
	readonly VITE_API_URL: string;
	readonly VITE_MODE: "development" | "production";
	readonly VITE_BASE_URL: string;
	readonly VITE_BASE_URL_WITHOUT_SLASH: string;
	/** Optional override for the JSmol server; falls back to the public host. */
	readonly VITE_JSMOL_SERVER_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

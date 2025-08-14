/// <reference types="vite/client" />

// Extend Vite's ImportMetaEnv interface with your custom env variables
interface ImportMetaEnv {
	readonly VITE_STORAGE_API_URL: string;
	readonly VITE_API_URL: string;
	readonly VITE_MODE: 'development' | 'production';
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

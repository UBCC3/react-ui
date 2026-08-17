import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev-only: mimic production nginx behavior of redirecting /ubchemica ->
// /ubchemica/ (preserving the query string). Auth0's registered callback URL
// has no trailing slash, but Vite's dev server only serves the app under the
// slashed base, so this bridges the two.
const redirectBaseWithoutSlash = (base, baseWithoutSlash) => ({
	name: "redirect-base-without-trailing-slash",
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			const [path, query] = req.url.split("?");
			if (path === baseWithoutSlash) {
				res.statusCode = 302;
				res.setHeader("Location", base + (query ? "?" + query : ""));
				res.end();
				return;
			}
			next();
		});
	},
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	// The third argument is the prefix filter. "" disables it, which is required
	// because BASE_URL and BASE_URL_WITHOUT_SLASH are not VITE_-prefixed. These
	// stay server-side only; nothing here is exposed to client code.
	const env = loadEnv(mode, process.cwd());
	const base = env.VITE_BASE_URL || "/";
	const baseWithoutSlash = env.VITE_BASE_URL_WITHOUT_SLASH || base.replace(/\/$/, "");

	return {
		base,
		plugins: [react(), tailwindcss(), redirectBaseWithoutSlash(base, baseWithoutSlash)],
	};
});

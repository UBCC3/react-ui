import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only: mimic production nginx behavior of redirecting /ubchemica ->
// /ubchemica/ (preserving the query string). Auth0's registered callback URL
// has no trailing slash, but Vite's dev server only serves the app under the
// slashed base, so this bridges the two.
const redirectBaseWithoutSlash = {
	name: 'redirect-base-without-trailing-slash',
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			const [path, query] = req.url.split('?');
			if (path === '/ubchemica') {
				res.statusCode = 302;
				res.setHeader('Location', '/ubchemica/' + (query ? '?' + query : ''));
				res.end();
				return;
			}
			next();
		});
	},
};

// https://vite.dev/config/
export default defineConfig({
	base: '/ubchemica/',
	plugins: [react(), tailwindcss(), redirectBaseWithoutSlash],
})
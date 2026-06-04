import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom Vite plugin to handle favicon.ico requests
function faviconFallback() {
  return {
    name: 'favicon-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/favicon.ico') {
          res.writeHead(302, { Location: '/favicon.svg' });
          res.end();
        } else {
          next();
        }
      });
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), faviconFallback()],
})
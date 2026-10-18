import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 3000 matches CLIENT_URL in the backend .env.
// The proxy forwards /api/* to the Express server, so the browser never hits CORS in development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
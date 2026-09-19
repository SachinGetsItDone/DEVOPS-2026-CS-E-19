import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only proxy: lets the client call relative paths like `/api/...` and
// `/ws/...` (see .env.example — VITE_API_URL is left blank on purpose) while
// the FastAPI backend runs separately on :8000. No effect on the production
// build (nginx.conf handles the same routing there).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only proxy: lets the client call relative paths like `/api/...` and
// `/ws/...` while the backend runs separately on :8000.
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})

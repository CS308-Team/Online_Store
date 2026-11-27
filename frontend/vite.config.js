import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Forwards the frontend's /api/... requests to FastAPI, so development works
// without a CORS setting on the backend. If the backend runs on another port:
// BACKEND_URL=http://localhost:8001 npm run dev
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})

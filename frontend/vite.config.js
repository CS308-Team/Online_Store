import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Frontend /api/... isteklerini FastAPI'ye yönlendirir. Böylece backend'e
// CORS ayarı eklemeden geliştirme yapılabilir. Backend başka portta
// çalışıyorsa: BACKEND_URL=http://localhost:8001 npm run dev
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
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

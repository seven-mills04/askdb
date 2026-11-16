import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development, Vite runs on :5173 and forwards /api calls to the Spring Boot server on :8080.
export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 600 },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})

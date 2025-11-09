import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(() => {
  const BACKEND_URL = 'https://ecsc-challenge-trophy-backend.onrender.com'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true
        }
      }
    }
  }
})


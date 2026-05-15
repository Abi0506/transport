import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 2886,
    proxy: {
      '/api': {
        target: 'https://sdc2.psgitech.ac.in/transport',
        changeOrigin: true
      }
    }
  }
})

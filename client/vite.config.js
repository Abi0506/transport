import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: '/transport/',
  plugins: [react(), viteSingleFile()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://sdc2.psgitech.ac.in/transportbackend2026',
        changeOrigin: true
      }
    }
  }
})

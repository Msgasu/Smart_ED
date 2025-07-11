import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001, // Different port from main Smart_ED app
    open: true
  },
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '../src' // Access shared components from main Smart_ED
    }
  }
}) 
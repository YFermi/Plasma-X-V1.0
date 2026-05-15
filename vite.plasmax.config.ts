import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/',
  root: './plasmax',
  build: {
    outDir: 'dist' // DEPLOYMENT-FIX
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './plasmax/src')
    }
  }
})

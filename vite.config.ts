import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Real clip engine (ffmpeg + Whisper) — see server/. No rewrite: the
      // engine serves /api/clips/v1/* and /files/* exactly as called.
      '/api/clips': {
        target: process.env.VITE_ENGINE_URL || 'http://localhost:8787',
        changeOrigin: true,
      },
      '/files': {
        target: process.env.VITE_ENGINE_URL || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
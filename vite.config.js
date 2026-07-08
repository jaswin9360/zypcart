import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  base: './',
  plugins: [
    react(), 
    basicSsl() // Generates local dev certificates automatically
  ],
  server: {
    // Force Vite to listen using explicit https configurations
    https: true, 
    host: 'localhost',
    port: 5173,
    hmr: {
      // Fixes the WebSocket connection failures securely
      protocol: 'wss', 
      host: 'localhost',
      port: 5173
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    }
  }
})
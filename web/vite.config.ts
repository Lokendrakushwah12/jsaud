import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ponytail: proxy keeps everything same-origin; no CORS, no API base url in code
  server: { proxy: { '/api': 'http://localhost:3001' } }
})

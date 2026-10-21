import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Com VITE_API=http, as chamadas /api vão para o Spring Boot local.
    proxy: { '/api': 'http://localhost:8080' },
  },
})

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    host: true,
    port: 7777,
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:7770',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})

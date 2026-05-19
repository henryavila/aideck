import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: 'src/client',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/client', import.meta.url)),
      '@schemas': fileURLToPath(new URL('./src/schemas', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:7777',
        changeOrigin: true
      },
      '/sse': {
        target: 'http://localhost:7777',
        changeOrigin: true,
        ws: false
      }
    }
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    sourcemap: true
  }
})

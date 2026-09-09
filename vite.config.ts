import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'API_URL'],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ['localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'https://real-estate-crm-4748.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/socket.io': {
        target: 'https://real-estate-crm-4748.onrender.com',
        ws: true,
        changeOrigin: true,
      },
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com https://*.s3.amazonaws.com; connect-src 'self' http://localhost:5000 ws://localhost:5000 https://real-estate-crm-4748.onrender.com wss://real-estate-crm-4748.onrender.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts'
            }
            if (id.includes('@atlaskit')) {
              return 'vendor-dnd'
            }
            if (id.includes('@reduxjs') || id.includes('react-redux')) {
              return 'vendor-redux'
            }
            if (id.includes('lucide-react') || id.includes('@heroicons')) {
              return 'vendor-icons'
            }
            if (id.includes('socket.io-client')) {
              return 'vendor-socket'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})


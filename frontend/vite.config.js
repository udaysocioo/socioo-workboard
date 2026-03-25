import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'chart-vendor': ['recharts'],
          'dnd-vendor': ['@hello-pangea/dnd'],
          'query-vendor': ['@tanstack/react-query'],
          'date-vendor': ['date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})

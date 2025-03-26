import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'date-fns/_lib/format/longFormatters': 'date-fns/esm/_lib/format/longFormatters'
    }
  },
  optimizeDeps: {
    include: ['date-fns/esm/_lib/format/longFormatters']
  },
  server: {
    host: '0.0.0.0', // This allows connections from other devices
  }
})
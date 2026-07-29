import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/html2canvas') || id.includes('node_modules/pdf-lib')) return 'export'
          if (id.includes('node_modules/react') || id.includes('node_modules/framer-motion')) return 'react'
        },
      },
    },
  },
})

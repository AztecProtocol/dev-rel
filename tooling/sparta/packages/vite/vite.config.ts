// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import nodePolyfills from 'rollup-plugin-node-polyfills'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // stub out process.env so logger.ts can call process.env.LOG_LEVEL etc.
    'process.env': {}
  },  
  resolve: {
    alias: {
      // map `process` to the browser shim
      process: 'process/browser'
    }
  }
})

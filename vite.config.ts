import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // Debug: Log environment variables during build
  console.log('🔧 Vite Build - Mode:', mode)
  console.log('🔧 VITE_GOOGLE_CLIENT_ID:', env.VITE_GOOGLE_CLIENT_ID ? 'LOADED ✅' : 'MISSING ❌')
  console.log('🔧 VITE_GOOGLE_CLIENT_SECRET:', env.VITE_GOOGLE_CLIENT_SECRET ? 'LOADED ✅' : 'MISSING ❌')
  console.log('🔧 Process.env check:', process.env.VITE_GOOGLE_CLIENT_SECRET ? 'FOUND IN PROCESS.ENV ✅' : 'NOT IN PROCESS.ENV ❌')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true
    },
    build: {
      outDir: 'dist'
    },
    define: {
      global: 'globalThis',
      // Explicitly expose Google OAuth env vars - try both env and process.env
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID),
      'import.meta.env.VITE_GOOGLE_CLIENT_SECRET': JSON.stringify(env.VITE_GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET),
    },
  }
})

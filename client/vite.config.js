import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  const envDefines = {}
  Object.keys(env).forEach((key) => {
    if (key.startsWith('REACT_APP_')) {
      envDefines[`process.env.${key}`] = JSON.stringify(env[key])
    }
  })
  envDefines['process.env'] = {}

  return {
    plugins: [react()],
    define: envDefines
  }
})

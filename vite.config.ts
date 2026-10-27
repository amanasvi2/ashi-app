import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localApiPlugin } from './server/localApi.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Vite exposes only VITE_* variables to the browser. Server secrets stay
  // in process.env for the existing handlers, never in `define`.
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GROQ_API_KEY', 'GROQ_CHAT_MODEL']) {
    if (process.env[key] === undefined && env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [react(), tailwindcss(), localApiPlugin()],
    server: { host: '127.0.0.1', watch: { usePolling: true, interval: 500 } },
  };
})

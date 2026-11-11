import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), '');
  return {
    // Only these two public Supabase values are embedded into the browser bundle.
    // Other variables, including any service-role key, stay in the build process.
    define: {
      'import.meta.env.vite_supabase_url': JSON.stringify(publicEnv.vite_supabase_url || ''),
      'import.meta.env.vite_supabase_anon_key': JSON.stringify(publicEnv.vite_supabase_anon_key || ''),
    },
    plugins: [react()],
    server: {
      port: 5173,
      host: true
    }
  };
});


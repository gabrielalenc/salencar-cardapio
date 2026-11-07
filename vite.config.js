import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'vite_supabase_'],
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});



import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Permite que o código continue usando process.env.API_KEY localmente
    'process.env': process.env
  },
  server: {
    port: 5173,
    open: true
  }
});

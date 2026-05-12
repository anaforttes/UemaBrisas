import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@features': path.resolve(__dirname, 'features'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});

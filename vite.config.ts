import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // Exposes server over local network
  },
  optimizeDeps: {
    include: ['lucide-react', 'qrcode'],
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});
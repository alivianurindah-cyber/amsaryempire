import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // expose process.env for the Gemni SDK usage in browser
    'process.env': process.env || {}
  }
});
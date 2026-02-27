import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Safely expose specific environment variables to the browser
      // Using JSON.stringify ensures values are embedded as strings
      // If the variable is missing, we default to empty string "" to avoid "undefined" string injection
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      'process.env.NETLIFY_DATABASE_URL': JSON.stringify(env.NETLIFY_DATABASE_URL || env.DATABASE_URL || ""),
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL || ""),
    }
  };
});
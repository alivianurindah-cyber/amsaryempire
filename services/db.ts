import { neon } from '@netlify/neon';

// Initialize the SQL client using the environment variable exposed by Vite
// We check multiple standard variable names
const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

let sqlInstance: any;

// Strict validation helper
const isValidUrl = (url: string | undefined | null): boolean => {
  return typeof url === 'string' && url.trim().length > 0 && url !== 'undefined' && url !== 'null';
};

if (isValidUrl(dbUrl)) {
  try {
    // Only call neon() if we are absolutely sure we have a string
    sqlInstance = neon(dbUrl!);
  } catch (error) {
    console.error("Failed to initialize Neon client:", error);
    // Safe fallback
    sqlInstance = async () => {
      throw new Error("Database configuration error: Client failed to initialize.");
    };
  }
} else {
  // Graceful fallback if no DB URL is configured
  // This allows the UI to render (showing errors on actions) instead of white-screening
  console.warn("Database connection string (NETLIFY_DATABASE_URL) is missing. Database operations will fail.");
  
  sqlInstance = async (strings: TemplateStringsArray | string, ...values: any[]) => {
      console.error("Attempted to execute SQL without a valid database connection.");
      console.error("Please set NETLIFY_DATABASE_URL in your environment variables.");
      throw new Error("Database not configured. System is in offline mode.");
  };
}

export const sql = sqlInstance;
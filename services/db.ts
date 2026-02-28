// 1. Prioritize NETLIFY_DATABASE_URL as per Netlify documentation
// 2. Fallback to DATABASE_URL (standard)
// 3. Handle empty/undefined strings safely
const getDbUrl = () => {
  // Check process.env (Vite replaces these with strings)
  // Also check import.meta.env for Vite-native variables
  const netlifyUrl = process.env.NETLIFY_DATABASE_URL;
  const stdUrl = process.env.DATABASE_URL;
  const viteUrl = (import.meta as any).env?.VITE_DATABASE_URL;

  // Clean quotes that JSON.stringify might have added
  const clean = (url: string | undefined) => {
      if (!url) return '';
      // If it's literally the string "undefined", treat as empty
      if (url === 'undefined') return '';
      return url.replace(/['"]/g, '').trim();
  };

  const url = clean(netlifyUrl) || clean(stdUrl) || clean(viteUrl);
  
  if (url) {
      const masked = url.replace(/:([^@]+)@/, ':****@');
      console.log(`Database URL detected: ${masked}`);
  }

  if (!url || url === 'undefined' || url === 'null') return null;
  return url;
};

const dbUrl = getDbUrl();
export const isOffline = !dbUrl;

export type DbStatus = 'OFFLINE' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
let currentStatus: DbStatus = isOffline ? 'OFFLINE' : 'CONNECTING';
let connectionError: string | null = null;

export const getDbStatus = () => ({ status: currentStatus, error: connectionError });

export const isTrulyOnline = () => currentStatus === 'CONNECTED';

let sqlInstance: any | undefined;

const getSqlInstance = async () => {
  if (sqlInstance) return sqlInstance;
  if (!dbUrl) {
    currentStatus = 'OFFLINE';
    return null;
  }

  try {
    currentStatus = 'CONNECTING';
    console.log("Connecting to Database...");
    // Dynamic import to avoid top-level side effects (like fetch polyfill issues)
    const { neon } = await import('@neondatabase/serverless');
    sqlInstance = neon(dbUrl);
    
    // Test the connection immediately to catch auth errors early
    await sqlInstance`SELECT 1`;
    
    currentStatus = 'CONNECTED';
    connectionError = null;
    return sqlInstance;
  } catch (error: any) {
    currentStatus = 'ERROR';
    console.error("Failed to initialize Neon client:", error);
    if (error.message?.includes('authentication failed')) {
        connectionError = "Invalid DATABASE_URL credentials. Please check your Neon password.";
        console.error(connectionError);
    } else {
        connectionError = error.message || "Failed to connect to database.";
    }
    sqlInstance = undefined; // Reset so we can try again if URL changes
    return null;
  }
};

// Proxy function that handles both tagged template literals and regular function calls
export const sql = async (stringsOrQuery: TemplateStringsArray | string, ...values: any[]) => {
  if (isOffline) {
    return [];
  }

  const instance = await getSqlInstance();
  
  if (!instance) {
    console.warn("Database unavailable, returning empty result");
    return [];
  }

  // Handle both tagged template and function call styles
  if (typeof stringsOrQuery === 'string') {
      return (instance as any)(stringsOrQuery, values);
  }
  return instance(stringsOrQuery, ...values);
};

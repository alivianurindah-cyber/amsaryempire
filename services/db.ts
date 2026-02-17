import { neon } from '@neondatabase/serverless';

// 1. Prioritize NETLIFY_DATABASE_URL as per Netlify documentation
// 2. Fallback to DATABASE_URL (standard)
// 3. Handle empty/undefined strings safely
const getDbUrl = () => {
  // Check process.env (Vite replaces these with strings)
  const netlifyUrl = process.env.NETLIFY_DATABASE_URL;
  const stdUrl = process.env.DATABASE_URL;

  // Clean quotes that JSON.stringify might have added
  const clean = (url: string | undefined) => url ? url.replace(/['"]/g, '').trim() : '';

  const url = clean(netlifyUrl) || clean(stdUrl);
  
  if (!url || url === 'undefined' || url === 'null') return null;
  return url;
};

const dbUrl = getDbUrl();
export const isOffline = !dbUrl;

let sqlInstance: any;

if (!isOffline && dbUrl) {
  try {
    console.log("Connecting to Database...");
    sqlInstance = neon(dbUrl);
  } catch (error) {
    console.error("Failed to initialize Neon client:", error);
    // Fallback to offline if initialization crashes
    sqlInstance = async () => [];
  }
} else {
  console.log("⚠️ Database URL missing. Running in OFFLINE mode using LocalStorage.");
  // Dummy function that returns empty array to prevent immediate crash,
  // though application logic should check `isOffline` flag.
  sqlInstance = async () => [];
}

export const sql = sqlInstance;
// 1. Prioritize NETLIFY_DATABASE_URL as per Netlify documentation
// 2. Fallback to DATABASE_URL (standard)
// 3. Handle empty/undefined strings safely
const getDbUrl = () => {
  // Check process.env (Vite replaces these with strings)
  const netlifyUrl = process.env.NETLIFY_DATABASE_URL;
  const stdUrl = process.env.DATABASE_URL;

  // Clean quotes that JSON.stringify might have added
  const clean = (url: string | undefined) => {
      if (!url) return '';
      // If it's literally the string "undefined", treat as empty
      if (url === 'undefined') return '';
      return url.replace(/['"]/g, '').trim();
  };

  const url = clean(netlifyUrl) || clean(stdUrl);
  
  if (!url || url === 'undefined' || url === 'null') return null;
  return url;
};

const dbUrl = getDbUrl();
export const isOffline = !dbUrl;

let sqlInstance: any | undefined;

const getSqlInstance = async () => {
  if (sqlInstance) return sqlInstance;
  if (!dbUrl) return null;

  try {
    console.log("Connecting to Database...");
    // Dynamic import to avoid top-level side effects (like fetch polyfill issues)
    const { neon } = await import('@neondatabase/serverless');
    sqlInstance = neon(dbUrl);
    return sqlInstance;
  } catch (error) {
    console.error("Failed to initialize Neon client:", error);
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

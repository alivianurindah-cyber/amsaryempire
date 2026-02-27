export const safeJSONParse = <T>(jsonString: string | null | undefined, fallback: T): T => {
  if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
    return fallback;
  }
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('JSON Parse Error:', e);
    return fallback;
  }
};

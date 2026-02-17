import { GoogleGenAI } from "@google/genai";

// Helper to safely get the AI client
// We initialize lazily to prevent the app from crashing on load if the API key is missing
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI verification will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Verifies the attendance photo using Gemini Vision.
 * It checks if a person is visible and describes the setting.
 */
export const verifyAttendanceImage = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return "AI Verification bypassed (No API Key)";
    }

    // Remove the data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Data = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: 'Analyze this image for a staff attendance system. Confirm if a person is visible and briefly describe the environment (e.g., office, outdoors, home) in one short sentence. If no person is clearly visible, state that.',
          },
        ],
      },
    });

    return response.text || "Verification completed.";
  } catch (error) {
    console.error("Gemini verification failed:", error);
    return "AI Verification unavailable (Error)";
  }
};
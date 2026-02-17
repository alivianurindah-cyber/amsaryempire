import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// IMPORTANT: process.env.API_KEY is expected to be injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Verifies the attendance photo using Gemini Vision.
 * It checks if a person is visible and describes the setting.
 */
export const verifyAttendanceImage = async (base64Image: string): Promise<string> => {
  try {
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
    return "AI Verification unavailable.";
  }
};

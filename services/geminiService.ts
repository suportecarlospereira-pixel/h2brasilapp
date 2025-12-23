import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageSize } from "../types";

export const generateChatResponse = async (
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string
): Promise<AsyncGenerator<string, void, unknown>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: "Você é o assistente virtual inteligente da H2 Brasil Distribuidora. Ajude motoristas e administradores com dúvidas sobre logística, melhores práticas de direção, manutenção básica e uso do sistema. Responda de forma concisa e útil.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessageStream({ message: newMessage });
    
    // Generator function to yield chunks
    async function* streamGenerator() {
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          yield c.text;
        }
      }
    }
    return streamGenerator();

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateLogisticsImage = async (
  prompt: string,
  size: ImageSize
): Promise<string> => {
  try {
    // Handling specific model requirement for images
    let modelName = 'gemini-3-pro-image-preview';
    // If user requested 1K, we could technically use gemini-2.5-flash-image for speed, 
    // but the prompt explicitly requested the Pro model features.
    
    // Note: The prompt specifically requested gemini-3-pro-image-preview 
    // and affordance for 1K, 2K, 4K.
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          imageSize: size, // 1K, 2K, or 4K
          aspectRatio: "16:9",
        }
      }
    });

    // Parse response for image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};
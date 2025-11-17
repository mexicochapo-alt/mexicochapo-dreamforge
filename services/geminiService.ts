
import { GoogleGenAI, GenerateContentResponse, Modality, Operation } from "@google/genai";
import { AspectRatio } from "../types";

// FIX: Updated getApiKey to throw an error if the key is not set, ensuring type safety.
const getApiKey = (): string => {
    const key = process.env.API_KEY;
    if (!key) {
        // This is a safeguard against a misconfigured environment.
        // Per guidelines, API_KEY is assumed to be available.
        throw new Error("API_KEY environment variable not set.");
    }
    return key;
};

// Create a new instance for each API call for Veo to pick up latest key
const getFreshAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });
const ai = new GoogleGenAI({ apiKey: getApiKey() });


export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error("Image generation failed or returned no images.");
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType,
                    },
                },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Image editing failed or returned no image.");
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16'): Promise<Operation> => {
    const freshAi = getFreshAiClient();
    const operation = await freshAi.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio,
        }
    });
    return operation;
};

export const checkVideoOperation = async (operation: Operation): Promise<Operation> => {
    const freshAi = getFreshAiClient();
    return await freshAi.operations.getVideosOperation({ operation });
};

export const getChatResponse = async (prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], isProMode: boolean): Promise<GenerateContentResponse> => {
    // FIX: Updated model name to 'gemini-flash-lite-latest' as per guidelines.
    const modelName = isProMode ? 'gemini-2.5-pro' : 'gemini-flash-lite-latest';
    const config = isProMode ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
    
    const chat = ai.chats.create({
        model: modelName,
        history,
        config,
    });
    
    const response = await chat.sendMessage({ message: prompt });
    return response;
};

export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType,
                    },
                },
            ],
        },
    });
    return response.text;
};

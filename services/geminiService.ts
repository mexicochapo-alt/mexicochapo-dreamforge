
import { GoogleGenAI, GenerateContentResponse, Modality, Operation, Chat, Type, FunctionDeclaration, HarmCategory, HarmBlockThreshold } from "@google/genai";

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

// Define strict safety settings for moderation
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

export const createVideoFunctionDeclaration: FunctionDeclaration = {
  name: 'create_video',
  description: 'Creates a video based on a user-provided text description. Call this tool when the user explicitly asks to generate, create, or make a video.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'A detailed description of the video to be generated.',
      },
      aspectRatio: {
        type: Type.STRING,
        description: 'The aspect ratio of the video. Defaults to 16:9. Supported values are "16:9" (landscape) and "9:16" (portrait).',
      },
    },
    required: ['prompt'],
  },
};

export const createImageFunctionDeclaration: FunctionDeclaration = {
  name: 'create_image',
  description: 'Generates an image based on a text description. Call this tool when the user asks to draw, paint, generate, create, or make an image.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'The detailed description of the image to generate.',
      },
    },
    required: ['prompt'],
  },
};

export const generateImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
            safetySettings,
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
            safetySettings,
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
            // Veo specific safety params if supported, otherwise default is used
        }
    });
    return operation;
};

export const checkVideoOperation = async (operation: Operation): Promise<Operation> => {
    const freshAi = getFreshAiClient();
    return await freshAi.operations.getVideosOperation({ operation });
};

export const startChat = (
    isProMode: boolean, 
    history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
    tools?: any[]
): Chat => {
    // Use Gemini 3 Pro Preview for Pro Mode with Thinking Config
    const modelName = isProMode ? 'gemini-3-pro-preview' : 'gemini-flash-lite-latest';
    const config: any = isProMode ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
    
    // Attach safety settings to chat config
    config.safetySettings = safetySettings;

    if (tools) {
        config.tools = tools;
    }
    
    const chat = ai.chats.create({
        model: modelName,
        history,
        config,
    });
    
    return chat;
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
        config: {
            safetySettings,
        }
    });
    return response.text;
};

export const suggestTopics = async (languageName: string): Promise<string[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Suggest 4 sophisticated and professional conversation topics for an executive learning ${languageName}. The topics should be relevant to business, global economics, corporate culture, or technology trends.`,
        config: {
            responseMimeType: "application/json",
            safetySettings,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    topics: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                            description: "A professional conversation topic"
                        },
                        description: "An array of 4 conversation topics."
                    }
                },
                required: ["topics"]
            }
        }
    });

    try {
        const jsonResponse = JSON.parse(response.text);
        if (jsonResponse.topics && Array.isArray(jsonResponse.topics)) {
            return jsonResponse.topics.slice(0, 4);
        }
        throw new Error("Invalid format for suggested topics. Expected an object with a 'topics' array.");
    } catch (e) {
        console.error("Failed to parse suggested topics:", response.text, e);
        throw new Error("Could not get suggested topics.");
    }
};

export const getPronunciationGuide = async (text: string, languageName: string): Promise<{ ipa: string, phonetic: string }> => {
    if (!text.trim()) return { ipa: "", phonetic: "" };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Provide the International Phonetic Alphabet (IPA) transcription and a simplified phonetic respelling (for English speakers) for the following ${languageName} text: "${text}". Respond with a JSON object containing "ipa" and "phonetic" keys.`,
        config: {
            responseMimeType: "application/json",
            safetySettings,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    ipa: {
                        type: Type.STRING,
                        description: "The IPA transcription."
                    },
                    phonetic: {
                        type: Type.STRING,
                        description: "Simplified phonetic respelling."
                    }
                },
                required: ["ipa", "phonetic"]
            }
        }
    });

    try {
        const jsonResponse = JSON.parse(response.text);
        return {
            ipa: jsonResponse.ipa || "",
            phonetic: jsonResponse.phonetic || ""
        };
    } catch (e) {
        console.error("Failed to parse pronunciation guide:", response.text, e);
        return { ipa: "", phonetic: "" };
    }
};

export const getTranslation = async (text: string): Promise<string> => {
    if (!text.trim()) return "";
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate the following text to English: "${text}". Respond with only the translated text in a JSON object with a single key "translation".`,
        config: {
            responseMimeType: "application/json",
            safetySettings,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    translation: {
                        type: Type.STRING,
                        description: "The English translation of the text."
                    }
                },
                required: ["translation"]
            }
        }
    });

    try {
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.translation;
    } catch (e) {
        console.error("Failed to parse translation:", response.text, e);
        return "Translation unavailable";
    }
};

export const generateSpeech = async (text: string, voice: string = 'Kore'): Promise<string> => {
    if (!text.trim()) return "";
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            safetySettings,
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                },
            },
        },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        return base64Audio;
    }
    throw new Error("Failed to generate speech");
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: audioBase64,
                        mimeType: mimeType
                    }
                },
                { text: "Transcribe this audio accurately, preserving the original language and speaker intent." }
            ]
        },
        config: {
            safetySettings
        }
    });
    return response.text;
};
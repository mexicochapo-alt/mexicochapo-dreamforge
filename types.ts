
import React from 'react';
import { PageKey } from "./constants";

export interface Page {
  key: PageKey;
  name: string;
  icon: React.ReactNode;
  component: React.FC;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  type: 'text' | 'video' | 'image' | 'api_key_prompt';
  text: string;
  timestamp: Date;
  
  // Moderation
  isFlagged?: boolean;
  
  // Video-specific properties
  videoUrl?: string;
  isLoadingVideo?: boolean;
  videoLoadingMessage?: string;

  // Image-specific properties
  imageUrl?: string;
  isLoadingImage?: boolean;
}

export interface ChatSession {
    id: string;
    timestamp: number;
    title: string;
    messages: ChatMessage[];
}

export interface LanguageChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp?: number;
  language?: string;
  ipa?: string;
  phonetic?: string;
  showIpa?: boolean;
  isFetchingIpa?: boolean;
  translation?: string;
  showTranslation?: boolean;
  isFetchingTranslation?: boolean;
  audioData?: string;
  isFetchingAudio?: boolean;
}

export interface LessonSession {
    id: string;
    timestamp: number;
    language: { code: string; name: string; flag: string };
    topic: string;
    messages: LanguageChatMessage[];
}

export interface ImageHistoryItem {
    id: string;
    prompt: string;
    base64Image: string;
    timestamp: number;
}

declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
    }
}
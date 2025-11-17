import { PageKey } from "./constants";

export interface Page {
  key: PageKey;
  name: string;
  icon: React.ReactNode;
  component: React.FC;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface LanguageChatMessage {
  role: 'user' | 'model';
  text: string;
  language?: string;
}

// FIX: Moved AIStudio interface and global window declaration here
// to serve as a single source of truth and prevent type conflicts.
export interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
}

declare global {
    interface Window {
        aistudio?: AIStudio;
    }
}


import React from 'react';
import { ImageGenerator } from './components/ImageGenerator';
import { ImageEditor } from './components/ImageEditor';
import { VideoGenerator } from './components/VideoGenerator';
import { Chatbot } from './components/Chatbot';
import { ImageAnalyzer } from './components/ImageAnalyzer';
import { LanguageTeacher } from './components/LanguageTeacher';
import { AudioTranscriber } from './components/AudioTranscriber';
import { TextToSpeech } from './components/TextToSpeech';
import { Image as ImageIcon, Video, MessageSquare, Edit, ScanSearch, Languages, Mic, Speech } from 'lucide-react';
import { Page } from './types';

export const PAGE_KEYS = ['image-gen', 'image-edit', 'video-gen', 'chatbot', 'image-analyze', 'language-teacher', 'audio-transcribe', 'text-to-speech'] as const;
export type PageKey = typeof PAGE_KEYS[number];

export const PAGES: Page[] = [
  {
    key: 'image-gen',
    name: 'Image Generation',
    icon: <ImageIcon size={20} />,
    component: ImageGenerator,
  },
  {
    key: 'image-edit',
    name: 'Image Editing',
    icon: <Edit size={20} />,
    component: ImageEditor,
  },
  {
    key: 'video-gen',
    name: 'Video Generation',
    icon: <Video size={20} />,
    component: VideoGenerator,
  },
  {
    key: 'chatbot',
    name: 'AI Chatbot',
    icon: <MessageSquare size={20} />,
    component: Chatbot,
  },
    {
    key: 'image-analyze',
    name: 'Image Analysis',
    icon: <ScanSearch size={20} />,
    component: ImageAnalyzer,
  },
  {
    key: 'language-teacher',
    name: 'Language Teacher',
    icon: <Languages size={20} />,
    component: LanguageTeacher,
  },
  {
    key: 'audio-transcribe',
    name: 'Audio Transcriber',
    icon: <Mic size={20} />,
    component: AudioTranscriber,
  },
  {
    key: 'text-to-speech',
    name: 'Text to Speech',
    icon: <Speech size={20} />,
    component: TextToSpeech,
  },
];

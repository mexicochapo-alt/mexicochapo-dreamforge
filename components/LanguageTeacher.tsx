import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { LanguageChatMessage } from '../types';
import { Mic, Square, Loader2, AlertTriangle } from 'lucide-react';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

const TOPICS = [
    "Ordering coffee ☕️", "Talking about your hobbies 🎨", "Asking for directions 🗺️",
    "Making plans with a friend 📅", "Discussing your favorite movie 🎬"
];

const getSystemInstruction = (languageName: string) => `You are Forge, a friendly and super cool language tutor for Gen-Z teaching ${languageName}. Your tone is modern, encouraging, and you sometimes use appropriate slang or emojis. When the user speaks, your audio response should be structured like this: First, give a quick, friendly tip in English to correct their main mistake. For example, say 'Hey, great start! Just a quick tip: remember to use 'estar' for location.' Then, reply to their corrected sentence in ${languageName}. Keep your reply conversational and engaging.`;

export const LanguageTeacher: React.FC = () => {
    const [targetLanguage, setTargetLanguage] = useState(LANGUAGES[0]);
    const [conversation, setConversation] = useState<LanguageChatMessage[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTopic, setCurrentTopic] = useState('');
    const [userInput, setUserInput] = useState('');
    const [modelOutput, setModelOutput] = useState('');
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    useEffect(() => {
        setCurrentTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
    }, []);

    const cleanup = useCallback(() => {
        isRecording && setIsRecording(false);
        streamRef.current?.getTracks().forEach(track => track.stop());
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        
        sessionPromiseRef.current?.then(session => session.close());

        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        streamRef.current = null;
        processorRef.current = null;
        sourceRef.current = null;
        sessionPromiseRef.current = null;
    }, [isRecording]);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = LANGUAGES.find(l => l.code === e.target.value);
        if (newLang) {
            cleanup();
            setTargetLanguage(newLang);
            setConversation([]);
            setError(null);
        }
    };

    const startRecording = async () => {
        setError(null);
        setConversation([]);
        setIsRecording(true);
        nextStartTimeRef.current = 0;
        
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            setError("Microphone access denied. Please allow microphone access in your browser settings.");
            setIsRecording(false);
            return;
        }

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    if (!streamRef.current || !inputAudioContextRef.current) return;
                    sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                    processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    processorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    sourceRef.current.connect(processorRef.current);
                    processorRef.current.connect(inputAudioContextRef.current.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        setUserInput(prev => prev + message.serverContent.inputTranscription.text);
                    }
                    if (message.serverContent?.outputTranscription) {
                        setModelOutput(prev => prev + message.serverContent.outputTranscription.text);
                    }
                    if (message.serverContent?.turnComplete) {
                        setConversation(prev => [
                            ...prev,
                            { role: 'user', text: userInput + (message.serverContent?.inputTranscription?.text || '') },
                            { role: 'model', text: modelOutput + (message.serverContent?.outputTranscription?.text || ''), language: targetLanguage.flag }
                        ]);
                        setUserInput('');
                        setModelOutput('');
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        
                        const currentTime = outputAudioContextRef.current.currentTime;
                        const startTime = Math.max(currentTime, nextStartTimeRef.current);
                        source.start(startTime);
                        
                        nextStartTimeRef.current = startTime + audioBuffer.duration;
                        outputSourcesRef.current.add(source);
                        source.onended = () => outputSourcesRef.current.delete(source);
                    }
                },
                onerror: (e) => {
                    console.error('API Error:', e);
                    setError('An API error occurred. Please try again.');
                    cleanup();
                },
                onclose: () => {},
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: getSystemInstruction(targetLanguage.name),
                outputAudioTranscription: {},
                inputAudioTranscription: {},
            },
        });
    };
    
    const stopRecording = () => cleanup();
    
    return (
        <div className="h-full flex flex-col pt-16 md:pt-0 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-white font-orbitron">Language Teacher</h1>
                <select value={targetLanguage.code} onChange={handleLanguageChange} className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500">
                    {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>)}
                </select>
            </div>
            
            <div className="flex items-center space-x-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center animate-pulse-slow">
                    <span className="text-2xl">🤖</span>
                </div>
                <div>
                    <h2 className="font-semibold text-lg text-white">Hi, I'm Forge!</h2>
                    <p className="text-gray-400">Let's practice <span className="font-bold text-indigo-400">{targetLanguage.name}</span>! Press the mic and let's talk.</p>
                </div>
            </div>

            <div className="bg-gray-800/50 p-3 rounded-md mb-4 text-center">
                <span className="text-sm text-gray-400">Topic of the Day:</span>
                <span className="font-semibold text-gray-200 ml-2">{currentTopic}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-900/50 rounded-lg mb-4 border border-gray-700/50 min-h-[200px]">
                <div className="space-y-4">
                    {conversation.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-start gap-2 max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                {msg.role === 'model' && <span className="text-lg">{msg.language}</span>}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isRecording && !userInput && conversation.length === 0 && <div className="text-center text-gray-500">Listening...</div>}
                </div>
            </div>

            {error && <div className="text-center p-4 mb-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 flex items-center justify-center gap-2">
                <AlertTriangle size={20}/> {error}
            </div>}

            <div className="flex flex-col items-center justify-center space-y-4">
                 <div className="h-6 text-center text-gray-400 italic">
                    {isRecording && userInput}
                </div>
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 ring-offset-2 ring-offset-[#121212] ${isRecording ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    {isRecording ? <Square size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
                </button>
            </div>
            <style>{`.animate-pulse-slow { animation: pulse 3s ease-in-out infinite; }`}</style>
        </div>
    );
};

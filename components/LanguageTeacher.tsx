
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { LanguageChatMessage, LessonSession } from '../types';
import { Mic, Square, Loader2, AlertTriangle, Sparkles, Ear, BookOpen, Plus, History, Trash2, X, Languages, Volume2, Turtle, ChevronDown, GraduationCap, Briefcase } from 'lucide-react';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { suggestTopics, getPronunciationGuide, getTranslation, generateSpeech } from '../services/geminiService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'zh', name: 'Mandarin', flag: '🇨🇳' },
];

const TOPICS = [
    "Professional Introduction",
    "Business Meeting Negotiations",
    "Travel Logistics",
    "Dining Etiquette",
    "Cultural History",
    "Tech & Innovation",
    "Global Economics"
];

interface Topic {
    text: string;
    isSuggested?: boolean;
}

const initialTopics: Topic[] = TOPICS.map(t => ({ text: t }));

const getSystemInstruction = (languageName: string, topic: string) => `You are Professor Forge, an elite linguistics consultant specializing in teaching ${languageName} to professionals. Your demeanor is sophisticated, patient, and encouraging.

Your objective is to facilitate a high-level conversation about "${topic}".

When the user speaks:
1. Analyze their speech for grammatical precision and pronunciation accuracy.
2. Begin your response with a brief, constructive correction in English if errors are present. If their speech was excellent, offer a nuanced synonym or advanced phrasing tip to elevate their fluency.
3. Respond naturally to their input in ${languageName}, maintaining the flow of the professional dialogue.
4. Keep the conversation engaging and culturally relevant.`;

export const LanguageTeacher: React.FC = () => {
    const [targetLanguage, setTargetLanguage] = useState(LANGUAGES[0]);
    const [conversation, setConversation] = useState<LanguageChatMessage[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [topics, setTopics] = useState<Topic[]>(initialTopics);
    const [currentTopic, setCurrentTopic] = useState(initialTopics[0].text);
    const [isSuggestingTopics, setIsSuggestingTopics] = useState(false);
    const [userInputDisplay, setUserInputDisplay] = useState('');
    
    // History State
    const [history, setHistory] = useState<LessonSession[]>([]);
    const [sessionId, setSessionId] = useState<string>(Date.now().toString());
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const userInputRef = useRef('');
    const modelOutputRef = useRef('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Audio Visualization Refs
    const visualizerIds = [1, 2, 3, 4, 5];
    const visualizerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const currentVolumeRef = useRef(0);
    const animationFrameRef = useRef<number>();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation, userInputDisplay]);

    // Load history on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('languageLessonHistory');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse lesson history", e);
            }
        }
    }, []);

    // Save history whenever the conversation updates
    useEffect(() => {
        if (conversation.length === 0) return;

        setHistory(prev => {
            const existingIndex = prev.findIndex(h => h.id === sessionId);
            const newSession: LessonSession = {
                id: sessionId,
                timestamp: existingIndex >= 0 ? prev[existingIndex].timestamp : Date.now(),
                language: targetLanguage,
                topic: currentTopic,
                messages: conversation
            };

            let newHistory;
            if (existingIndex >= 0) {
                newHistory = [...prev];
                newHistory[existingIndex] = newSession;
            } else {
                newHistory = [newSession, ...prev];
            }
            
            localStorage.setItem('languageLessonHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    }, [conversation, sessionId, targetLanguage, currentTopic]);

    const cleanup = useCallback(() => {
        isRecording && setIsRecording(false);
        
        // Stop visualizer
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        visualizerRefs.current.forEach(ref => {
            if (ref) ref.style.height = '4px'; // Reset height
        });

        streamRef.current?.getTracks().forEach(track => track.stop());
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);
        playbackContextRef.current?.close().catch(console.error);
        
        sessionPromiseRef.current?.then(session => session.close()).catch(console.error);

        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        playbackContextRef.current = null;
        streamRef.current = null;
        processorRef.current = null;
        sourceRef.current = null;
        sessionPromiseRef.current = null;
    }, [isRecording]);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);
    
    const fetchAndSetIpa = useCallback(async (messageId: string, text: string, langName: string) => {
        setConversation(prev => prev.map(m => m.id === messageId ? { ...m, isFetchingIpa: true } : m));
        try {
            const result = await getPronunciationGuide(text, langName);
            setConversation(prev => prev.map(m => m.id === messageId ? { ...m, ipa: result.ipa, phonetic: result.phonetic, isFetchingIpa: false } : m));
        } catch (e) {
            console.error(`Failed to fetch IPA for message ${messageId}`, e);
            setConversation(prev => prev.map(m => m.id === messageId ? { ...m, isFetchingIpa: false } : m));
        }
    }, []);

    const fetchAndSetTranslation = useCallback(async (messageId: string, text: string) => {
        setConversation(prev => prev.map(m => m.id === messageId ? { ...m, isFetchingTranslation: true } : m));
        try {
            const translation = await getTranslation(text);
            setConversation(prev => prev.map(m => m.id === messageId ? { ...m, translation: translation, isFetchingTranslation: false } : m));
        } catch (e) {
             console.error(`Failed to fetch translation for message ${messageId}`, e);
             setConversation(prev => prev.map(m => m.id === messageId ? { ...m, isFetchingTranslation: false } : m));
        }
    }, []);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = LANGUAGES.find(l => l.code === e.target.value);
        if (newLang) {
            handleNewSession(newLang);
        }
    };
    
    const handleNewSession = (lang = targetLanguage) => {
        cleanup();
        setTargetLanguage(lang);
        setConversation([]);
        setError(null);
        setTopics(initialTopics);
        setCurrentTopic(initialTopics[0].text);
        setSessionId(Date.now().toString());
        setIsHistoryOpen(false);
    };

    const handleLoadSession = (session: LessonSession) => {
        cleanup();
        setTargetLanguage(session.language);
        setConversation(session.messages);
        setCurrentTopic(session.topic);
        setSessionId(session.id);
        setError(null);
        setIsHistoryOpen(false);
    };

    const handleDeleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        localStorage.setItem('languageLessonHistory', JSON.stringify(newHistory));
        if (sessionId === id) {
            handleNewSession();
        }
    };

    const playAudioData = async (base64Data: string, rate: number = 1.0) => {
        if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
            playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        try {
             const audioBuffer = await decodeAudioData(decode(base64Data), playbackContextRef.current, 24000, 1);
             const source = playbackContextRef.current.createBufferSource();
             source.buffer = audioBuffer;
             source.playbackRate.value = rate;
             source.connect(playbackContextRef.current.destination);
             source.start();
        } catch(e) {
            console.error("Error playing audio", e);
        }
    };

    const handlePlayAudio = async (msg: LanguageChatMessage, rate: number = 1.0) => {
        if (msg.audioData) {
            playAudioData(msg.audioData, rate);
            return;
        }
    
        setConversation(prev => prev.map(m => m.id === msg.id ? { ...m, isFetchingAudio: true } : m));
        
        try {
            // Use 'Puck' for user (student) and 'Zephyr' for model (tutor) to match Live API
            const voiceName = msg.role === 'user' ? 'Puck' : 'Zephyr';
            const audioData = await generateSpeech(msg.text, voiceName);
            setConversation(prev => prev.map(m => m.id === msg.id ? { ...m, audioData, isFetchingAudio: false } : m));
            playAudioData(audioData, rate);
        } catch (e) {
            console.error(e);
            setConversation(prev => prev.map(m => m.id === msg.id ? { ...m, isFetchingAudio: false } : m));
            setError("Failed to generate audio for this message.");
        }
    };

    const animateVisualizer = () => {
        const volume = currentVolumeRef.current;
        
        visualizerRefs.current.forEach((bar, index) => {
            if (!bar) return;
            const multiplier = index === 2 ? 1.5 : (index === 1 || index === 3) ? 1.2 : 0.8;
            const jitter = Math.random() * 5; 
            const height = Math.max(4, Math.min(50, (volume * 300 * multiplier) + jitter));
            
            bar.style.height = `${height}px`;
        });
        
        animationFrameRef.current = requestAnimationFrame(animateVisualizer);
    };

    const startRecording = async () => {
        setError(null);
        setIsRecording(true);
        nextStartTimeRef.current = 0;
        userInputRef.current = '';
        modelOutputRef.current = '';
        
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            setError("Microphone access denied. Please allow microphone access in your browser settings.");
            setIsRecording(false);
            return;
        }

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        // Start Visualizer Loop
        animationFrameRef.current = requestAnimationFrame(animateVisualizer);

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    if (!streamRef.current || !inputAudioContextRef.current) return;
                    sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                    processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    processorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        
                        let sum = 0;
                        for (let i = 0; i < inputData.length; i++) {
                            sum += inputData[i] * inputData[i];
                        }
                        currentVolumeRef.current = Math.sqrt(sum / inputData.length);

                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(d => d * 32768)).buffer)),
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
                        userInputRef.current += message.serverContent.inputTranscription.text;
                        setUserInputDisplay(userInputRef.current);
                    }
                    if (message.serverContent?.outputTranscription) {
                        modelOutputRef.current += message.serverContent.outputTranscription.text;
                    }
                    if (message.serverContent?.turnComplete) {
                        const finalUserInput = userInputRef.current;
                        const finalModelOutput = modelOutputRef.current;
                        
                        if (finalUserInput.trim() || finalModelOutput.trim()) {
                            const userMessage: LanguageChatMessage = { id: `user-${Date.now()}`, role: 'user', text: finalUserInput, timestamp: Date.now() };
                            const modelMessage: LanguageChatMessage = { id: `model-${Date.now() + 1}`, role: 'model', text: finalModelOutput, language: targetLanguage.flag, timestamp: Date.now() };
                            
                            setConversation(prev => [...prev, userMessage, modelMessage]);
                            
                            fetchAndSetIpa(userMessage.id, userMessage.text, targetLanguage.name);
                            fetchAndSetIpa(modelMessage.id, modelMessage.text, targetLanguage.name);
                            fetchAndSetTranslation(userMessage.id, userMessage.text);
                            fetchAndSetTranslation(modelMessage.id, modelMessage.text);
                        }

                        userInputRef.current = '';
                        modelOutputRef.current = '';
                        setUserInputDisplay('');
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
                    setError('Connection interrupted. Please try again.');
                    cleanup();
                },
                onclose: () => {},
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: getSystemInstruction(targetLanguage.name, currentTopic),
                outputAudioTranscription: {},
                inputAudioTranscription: {},
            },
        });
    };
    
    const stopRecording = () => cleanup();

    const handleSuggestTopics = async () => {
        setIsSuggestingTopics(true);
        setError(null);
        try {
            const newTopicStrings = await suggestTopics(targetLanguage.name);
            const uniqueNewTopics = newTopicStrings
                .filter(newTopic => !topics.some(existingTopic => existingTopic.text === newTopic))
                .map(t => ({ text: t, isSuggested: true }));
            
            setTopics(prev => [...prev, ...uniqueNewTopics]);
        } catch (err) {
            setError("Unable to generate topics at this time.");
        } finally {
            setIsSuggestingTopics(false);
        }
    };
    
    const handleToggleIpa = (id: string) => {
        setConversation(prev =>
            prev.map(msg =>
                msg.id === id ? { ...msg, showIpa: !msg.showIpa } : msg
            )
        );
    };

    const handleToggleTranslation = (id: string) => {
        setConversation(prev =>
            prev.map(msg =>
                msg.id === id ? { ...msg, showTranslation: !msg.showTranslation } : msg
            )
        );
    };

    return (
        <div className="h-full flex flex-col pt-16 md:pt-0 max-w-5xl mx-auto relative overflow-hidden bg-white dark:bg-[#0a0a0c]">
             {/* History Sidebar Overlay */}
             {isHistoryOpen && (
                <div className="absolute inset-0 bg-black/40 dark:bg-black/60 z-30 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryOpen(false)} />
            )}
            
            {/* History Sidebar */}
            <div className={`absolute top-0 right-0 h-full w-80 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-out z-40 border-l border-gray-200 dark:border-gray-800 ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <History size={18} className="text-indigo-500" />
                        <h3 className="font-orbitron font-bold text-gray-900 dark:text-white tracking-wide">Session Archive</h3>
                    </div>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-70px)] p-4 space-y-3">
                    {history.length === 0 && (
                        <div className="text-center text-gray-400 dark:text-gray-500 mt-10">
                            <BookOpen size={48} className="mx-auto mb-2 opacity-30" />
                            <p>No previous sessions.</p>
                        </div>
                    )}
                    {history.map(session => (
                        <div 
                            key={session.id} 
                            onClick={() => handleLoadSession(session)}
                            className={`group relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                                sessionId === session.id 
                                ? 'bg-indigo-50/50 border-indigo-500/30 dark:bg-indigo-500/10 dark:border-indigo-500/50 shadow-sm' 
                                : 'bg-transparent border-gray-200/50 hover:border-indigo-300/50 dark:border-white/5 dark:hover:bg-white/5 dark:hover:border-white/10'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg shadow-sm">{session.language.flag}</span>
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{session.language.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    {new Date(session.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mb-1">{session.topic}</p>
                            
                            <button 
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                className="absolute bottom-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Header Area */}
            <div className="flex justify-between items-center px-6 py-4 z-10 border-b border-gray-100 dark:border-gray-800/50 bg-white/50 dark:bg-[#0a0a0c]/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shadow-lg shadow-slate-500/20 dark:shadow-white/5">
                        <GraduationCap size={24} className="text-white dark:text-black" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-orbitron leading-none tracking-tight">Linguist AI</h1>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">Executive Coach</span>
                             <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                             <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{targetLanguage.name}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                     <div className="relative group">
                        <select 
                            value={targetLanguage.code} 
                            onChange={handleLanguageChange} 
                            className="appearance-none bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-4 pr-10 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                    <button 
                        onClick={() => handleNewSession()} 
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="New Session"
                    >
                        <Plus size={20} />
                    </button>
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="History"
                    >
                        <History size={20} />
                    </button>
                </div>
            </div>
            
            {/* Topic Selector */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/50 bg-slate-50/50 dark:bg-[#0f0f12]/50">
                <div className="flex items-center gap-1 mb-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <Briefcase size={12} /> Active Context
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                     <button 
                        onClick={handleSuggestTopics}
                        disabled={isRecording || isSuggestingTopics}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-indigo-600 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
                    >
                        {isSuggestingTopics ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        <span>Suggest Contexts</span>
                    </button>
                    
                    {topics.map(topic => (
                        <button
                            key={topic.text}
                            onClick={() => setCurrentTopic(topic.text)}
                            disabled={isRecording}
                            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                                currentTopic === topic.text
                                    ? 'bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/20'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            {topic.text}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin space-y-8 bg-white dark:bg-[#0a0a0c]">
                {conversation.length === 0 && !isRecording && (
                    <div className="h-full flex flex-col items-center justify-center opacity-60 animate-fade-in-up">
                         <div className="w-24 h-24 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800">
                             <Mic size={36} className="text-slate-400 dark:text-slate-500" />
                         </div>
                         <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 font-orbitron">Ready to Begin</h3>
                         <p className="text-slate-500 dark:text-slate-400 mt-2 text-center max-w-xs">Tap the microphone to start your session on <br/><span className="font-semibold text-indigo-500">"{currentTopic}"</span></p>
                    </div>
                )}
                
                {conversation.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group`}>
                        <div className={`max-w-[85%] md:max-w-[75%] p-6 shadow-sm relative transition-all duration-300 ${
                            msg.role === 'user' 
                            ? 'bg-slate-900 dark:bg-indigo-900/20 text-white dark:text-indigo-100 rounded-2xl rounded-tr-sm' 
                            : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm'
                        }`}>
                            {/* Header: Language Flag & Role */}
                            <div className={`flex justify-between items-center mb-3 text-xs font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-slate-400' : 'text-indigo-500'}`}>
                                <span>{msg.role === 'user' ? 'Student' : 'Professor'}</span>
                                {msg.role === 'model' && <span className="opacity-50">{msg.language}</span>}
                            </div>

                            <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>

                            {/* Metadata Loading States */}
                            <div className="flex gap-2 mt-2">
                                {msg.isFetchingIpa && <div className="flex items-center gap-1 text-[10px] text-slate-400"><Loader2 size={8} className="animate-spin"/> <span>Analyzing Phonetics</span></div>}
                                {msg.isFetchingTranslation && <div className="flex items-center gap-1 text-[10px] text-slate-400"><Loader2 size={8} className="animate-spin"/> <span>Translating</span></div>}
                            </div>

                            {/* Enriched Content (IPA/Translation) */}
                            {(msg.showIpa || msg.showTranslation) && (
                                <div className={`mt-4 pt-4 border-t space-y-3 animate-fade-in-up ${msg.role === 'user' ? 'border-slate-700' : 'border-slate-200 dark:border-slate-800'}`}>
                                    {msg.showIpa && (msg.ipa || msg.phonetic) && (
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase mb-1 opacity-70">
                                                <Ear size={12} /> Phonetics
                                            </div>
                                            <div className={`font-mono text-sm p-2 rounded ${msg.role === 'user' ? 'bg-black/20' : 'bg-slate-100 dark:bg-black/30'}`}>
                                                /{msg.ipa}/ <span className="opacity-60 ml-2">[{msg.phonetic}]</span>
                                            </div>
                                        </div>
                                    )}
                                    {msg.showTranslation && msg.translation && (
                                        <div>
                                             <div className="flex items-center gap-2 text-xs font-bold uppercase mb-1 opacity-70">
                                                <Languages size={12} /> English
                                            </div>
                                            <p className="italic opacity-90">"{msg.translation}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                             {/* Floating Action Bar */}
                            <div className={`absolute -bottom-5 ${msg.role === 'user' ? 'right-0' : 'left-0'} flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1 z-10 scale-95 hover:scale-100`}>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); (msg.ipa || msg.phonetic) && handleToggleIpa(msg.id); }} 
                                    className={`p-2 rounded-md transition-colors ${msg.showIpa ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'}`}
                                    title="Phonetics"
                                    disabled={!msg.ipa && !msg.phonetic}
                                 >
                                    <Ear size={16} />
                                 </button>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); msg.translation && handleToggleTranslation(msg.id); }} 
                                    className={`p-2 rounded-md transition-colors ${msg.showTranslation ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'}`}
                                    title="Translate"
                                    disabled={!msg.translation}
                                 >
                                    <Languages size={16} />
                                 </button>
                                 <div className="w-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handlePlayAudio(msg); }} 
                                    className={`p-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 ${msg.isFetchingAudio ? 'opacity-50' : ''}`}
                                    title="Play Audio"
                                 >
                                    {msg.isFetchingAudio ? <Loader2 size={16} className="animate-spin"/> : <Volume2 size={16} />}
                                 </button>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handlePlayAudio(msg, 0.75); }} 
                                    className={`p-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 ${msg.isFetchingAudio ? 'opacity-50' : ''}`}
                                    title="Slow Play"
                                 >
                                    <Turtle size={16} />
                                 </button>
                            </div>
                        </div>
                        
                        <div className="h-6"></div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            {error && <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-xl flex items-center gap-3 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle size={18}/> {error}
            </div>}

            {/* Control Center (Footer) */}
            <div className="bg-white dark:bg-[#0a0a0c] border-t border-gray-100 dark:border-gray-800 pb-8 pt-4">
                 <div className="h-6 text-center text-xs font-mono text-indigo-500 dark:text-indigo-400 overflow-hidden whitespace-nowrap px-4 transition-all mb-4">
                    {userInputDisplay ? `"${userInputDisplay}"` : (isRecording ? "LISTENING..." : "")}
                </div>
                
                <div className="relative flex items-center justify-center">
                     {/* Visualizer */}
                     {isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none z-0 opacity-40">
                            {visualizerIds.map((id, idx) => (
                                <div
                                    key={id}
                                    ref={(el) => { visualizerRefs.current[idx] = el; }}
                                    className="w-1.5 bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-75 ease-linear"
                                    style={{ height: '4px' }} 
                                />
                            ))}
                        </div>
                    )}

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isRecording 
                            ? 'bg-slate-900 dark:bg-white shadow-lg shadow-slate-900/20 scale-110' 
                            : 'bg-slate-900 dark:bg-indigo-600 shadow-xl shadow-indigo-500/30 hover:scale-105'
                        }`}
                    >
                        {isRecording ? <Square size={24} className="text-white dark:text-black fill-current" /> : <Mic size={32} className="text-white" />}
                    </button>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-[0.2em]">
                    {isRecording ? "Tap to Conclude" : "Tap to Speak"}
                </p>
            </div>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

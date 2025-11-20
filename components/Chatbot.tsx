
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { startChat, createVideoFunctionDeclaration, createImageFunctionDeclaration, generateVideo, checkVideoOperation, generateImage } from '../services/geminiService';
import { ChatMessage, ChatSession } from '../types';
import { Send, BrainCircuit, Video, AlertTriangle, Loader2, History, Plus, Trash2, X, MessageSquare, Info, Sparkles, Bot, User, Image as ImageIcon, ShieldAlert } from 'lucide-react';
import type { Chat, Operation } from '@google/genai';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

const LOADING_MESSAGES = [
    "Warming up the digital director's chair...",
    "Assembling pixels into cinematic art...",
    "Rendering your vision, frame by frame...",
    "This can take a few minutes. Great art takes time!",
];

const SUGGESTIONS = [
    "Generate an image of a cyberpunk city",
    "Explain quantum computing like I'm 5",
    "Create a video of a robot surfing",
    "Draft a professional email for a job application"
];

// Basic client-side blocklist for immediate feedback
// In a real app, this would be more comprehensive or handled via a dedicated API
const FLAGGED_KEYWORDS = ['hate', 'violence', 'kill', 'illegal', 'abuse']; 

export const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isProMode, setIsProMode] = useState(false);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [isKeyChecked, setIsKeyChecked] = useState(false);
    
    // History state
    const [history, setHistory] = useState<ChatSession[]>([]);
    const [sessionId, setSessionId] = useState<string>(Date.now().toString());
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Load history on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            try {
                // We need to parse the dates back to Date objects
                const parsedHistory: ChatSession[] = JSON.parse(savedHistory);
                parsedHistory.forEach(session => {
                    session.messages.forEach(msg => {
                        msg.timestamp = new Date(msg.timestamp);
                    });
                });
                setHistory(parsedHistory);
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        }
        // Initialize default chat with both video and image tools
        setChatSession(startChat(false, [], [{ functionDeclarations: [createVideoFunctionDeclaration, createImageFunctionDeclaration] }]));
    }, []);

    // Save history whenever messages or sessionId changes
    useEffect(() => {
        if (messages.length === 0) return;
        
        setHistory(prev => {
            const existingIndex = prev.findIndex(h => h.id === sessionId);
            const firstUserMsg = messages.find(m => m.role === 'user')?.text || 'New Conversation';
            const title = firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg;

            const newSession: ChatSession = {
                id: sessionId,
                timestamp: existingIndex >= 0 ? prev[existingIndex].timestamp : Date.now(),
                title,
                messages
            };
            
            let newHistory;
            if (existingIndex >= 0) {
                newHistory = [...prev];
                newHistory[existingIndex] = newSession;
            } else {
                newHistory = [newSession, ...prev];
            }
            
            localStorage.setItem('chatHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    }, [messages, sessionId]);

    const checkApiKey = useCallback(async () => {
        if (isKeyChecked) return hasApiKey;
        const keyStatus = await window.aistudio?.hasSelectedApiKey();
        setHasApiKey(keyStatus ?? false);
        setIsKeyChecked(true);
        return keyStatus;
    }, [isKeyChecked, hasApiKey]);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    const initializeChat = useCallback((proMode: boolean, history: any[] = []) => {
        const tools = [{ functionDeclarations: [createVideoFunctionDeclaration, createImageFunctionDeclaration] }];
        return startChat(proMode, history, tools);
    }, []);

    // Update chat session when switching modes or loading a new session
    useEffect(() => {
        const history = messages
            .filter(m => m.type === 'text' && !m.isFlagged) // Do not include flagged messages in history context
            .map(msg => ({
                role: msg.role as 'user' | 'model',
                parts: [{ text: msg.text }]
            }));
        setChatSession(initializeChat(isProMode, history));
    }, [isProMode, sessionId, initializeChat]); 

    const handleSelectKey = async () => {
        await window.aistudio?.openSelectKey();
        setHasApiKey(true);
        setMessages(prev => prev.filter(m => m.type !== 'api_key_prompt'));
        const confirmationMessage: ChatMessage = {
            id: `status-${Date.now()}`, role: 'model', type: 'text',
            text: "API key selected! Please try your request again.",
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmationMessage]);
    };

    const handleNewSession = () => {
        setMessages([]);
        setSessionId(Date.now().toString());
        setIsHistoryOpen(false);
    };

    const handleLoadSession = (session: ChatSession) => {
        setMessages(session.messages);
        setSessionId(session.id);
        setIsHistoryOpen(false);
    };

    const handleDeleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        localStorage.setItem('chatHistory', JSON.stringify(newHistory));
        if (sessionId === id) {
            handleNewSession();
        }
    };

    const generateAndPollVideo = useCallback(async (args: any, messageId: string) => {
        let loadingInterval: number;
        try {
            loadingInterval = window.setInterval(() => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, videoLoadingMessage: LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)] } : m));
            }, 3000);

            const initialOperation = await generateVideo(args.prompt, args.aspectRatio || '16:9');
            
            let currentOp = initialOperation;
            while (!currentOp.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                currentOp = await checkVideoOperation(currentOp);
            }

            const downloadLink = currentOp.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink && process.env.API_KEY) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                const videoUrl = URL.createObjectURL(blob);
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isLoadingVideo: false, videoUrl } : m));
            } else {
                throw new Error("Video generation completed but no download link was found.");
            }
        } catch (err: any) {
            console.error(err);
             if (err.message?.includes("Requested entity was not found.")) {
                setHasApiKey(false); // Reset key state
                setIsKeyChecked(false);
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, type:'text', isLoadingVideo: false, text: "API key error. Please select your key again and retry." } : m));
             } else {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, type:'text', isLoadingVideo: false, text: `Sorry, video generation failed: ${err.message}` } : m));
             }
        } finally {
             clearInterval(loadingInterval!);
        }
    }, []);

    const handleVideoRequest = async (args: any) => {
        const keyReady = await checkApiKey();
        if (!keyReady) {
            const promptMessage: ChatMessage = {
                id: `apikey-${Date.now()}`, role: 'model', type: 'api_key_prompt',
                text: "To generate videos, you need to select an API key.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, promptMessage]);
            return;
        }
        
        const messageId = `video-${Date.now()}`;
        const videoMessage: ChatMessage = {
            id: messageId, role: 'model', type: 'video',
            text: `Generating video for: "${args.prompt}"`,
            timestamp: new Date(),
            isLoadingVideo: true,
            videoLoadingMessage: LOADING_MESSAGES[0],
        };
        setMessages(prev => [...prev, videoMessage]);

        generateAndPollVideo(args, messageId);
    };

    const handleImageRequest = async (args: any) => {
        const messageId = `image-${Date.now()}`;
        const imageMessage: ChatMessage = {
            id: messageId, role: 'model', type: 'image',
            text: `Generating image for: "${args.prompt}"`,
            timestamp: new Date(),
            isLoadingImage: true,
        };
        setMessages(prev => [...prev, imageMessage]);

        try {
            const imageUrl = await generateImage(args.prompt);
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isLoadingImage: false, imageUrl } : m));
        } catch (error: any) {
            console.error(error);
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, type: 'text', isLoadingImage: false, text: `Sorry, image generation failed: ${error.message}` } : m));
        }
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim() || isLoading || !chatSession) return;

        // Client-side moderation check
        const isClientFlagged = FLAGGED_KEYWORDS.some(keyword => textToSend.toLowerCase().includes(keyword));
        
        if (isClientFlagged) {
             const flaggedMessage: ChatMessage = { 
                 id: `flagged-${Date.now()}`, 
                 role: 'user', 
                 type: 'text', 
                 text: textToSend, 
                 timestamp: new Date(),
                 isFlagged: true
             };
             setMessages(prev => [...prev, flaggedMessage]);
             
             const responseMessage: ChatMessage = {
                 id: `response-flagged-${Date.now()}`,
                 role: 'model',
                 type: 'text',
                 text: "I cannot process that request as it violates our community safety guidelines.",
                 timestamp: new Date(),
                 isFlagged: true
             };
             setMessages(prev => [...prev, responseMessage]);
             setInput('');
             return;
        }

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', type: 'text', text: textToSend, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatSession.sendMessage({ message: textToSend });
            
            if(response.text) {
                const modelMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', type: 'text', text: response.text, timestamp: new Date() };
                setMessages(prev => [...prev, modelMessage]);
            } else {
                 // If there is no text and no function call, it's likely a safety block that didn't throw explicitly
                 // or an empty response.
                 if (!response.functionCalls || response.functionCalls.length === 0) {
                    const flaggedMessage: ChatMessage = { 
                        id: `safety-block-${Date.now()}`, 
                        role: 'model', 
                        type: 'text', 
                        text: "This response was flagged by safety filters and cannot be displayed.", 
                        timestamp: new Date(),
                        isFlagged: true 
                    };
                    setMessages(prev => [...prev, flaggedMessage]);
                 }
            }
            
            if (response.functionCalls && response.functionCalls.length > 0) {
                for (const fc of response.functionCalls) {
                    if (fc.name === 'create_video') {
                        await handleVideoRequest(fc.args);
                    } else if (fc.name === 'create_image') {
                        await handleImageRequest(fc.args);
                    }
                }
            }

        } catch (error: any) {
            console.error(error);
            // Detect Safety Errors or Policy Violations
            if (error.message?.includes("safety") || error.message?.includes("blocked")) {
                 const blockedMessage: ChatMessage = { 
                     id: `blocked-${Date.now()}`, 
                     role: 'model', 
                     type: 'text', 
                     text: "The response was blocked due to safety concerns.", 
                     timestamp: new Date(),
                     isFlagged: true
                 };
                 setMessages(prev => [...prev, blockedMessage]);
            } else {
                const errorMessage: ChatMessage = { id: `error-${Date.now()}`, role: 'model', type: 'text', text: "Sorry, I encountered an error. Please try again.", timestamp: new Date() };
                setMessages(prev => [...prev, errorMessage]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Render function for individual messages
    const renderMessage = useCallback((index: number, msg: ChatMessage) => (
        <div className={`flex gap-4 pb-6 px-4 md:px-8 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
            {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 mt-1 border border-indigo-200 dark:border-indigo-500/30">
                    <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
            )}

            <div className={`flex flex-col max-w-[85%] md:max-w-[70%]`}>
                {msg.type === 'text' && (
                    <div className={`p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden ${
                        msg.isFlagged 
                        ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                        : msg.role === 'user' 
                            ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 text-gray-800 dark:text-gray-100 rounded-tl-none'
                    }`}>
                        {/* Subtle shine for user messages */}
                        {msg.role === 'user' && !msg.isFlagged && <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>}
                        
                        {msg.isFlagged && (
                            <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                                <ShieldAlert size={14} />
                                <span>Moderation Alert</span>
                            </div>
                        )}

                        <p className={`whitespace-pre-wrap text-[15px] leading-relaxed ${msg.isFlagged ? 'italic' : ''}`}>{msg.text}</p>
                    </div>
                )}
                
                {msg.type === 'video' && (
                    <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 w-full max-w-md">
                        <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400 text-sm">
                            <Video size={16} />
                            <span>Video Generation</span>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mb-4 font-medium italic">"{msg.text.replace('Generating video for: ', '').replace(/"/g, '')}"</p>
                        {msg.isLoadingVideo ? (
                            <div className="aspect-video bg-black/5 dark:bg-black/20 rounded-lg flex flex-col items-center justify-center p-6 border border-dashed border-gray-300 dark:border-gray-600">
                                <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                                <p className="text-xs text-center text-gray-500 dark:text-gray-400 animate-pulse">{msg.videoLoadingMessage}</p>
                            </div>
                        ) : msg.videoUrl ? (
                            <div className="rounded-lg overflow-hidden shadow-lg bg-black">
                                <video src={msg.videoUrl} controls autoPlay loop className="w-full h-auto" />
                            </div>
                        ) : null}
                    </div>
                )}

                {msg.type === 'image' && (
                    <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 w-full max-w-md">
                        <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400 text-sm">
                            <ImageIcon size={16} />
                            <span>Image Generation</span>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mb-4 font-medium italic">"{msg.text.replace('Generating image for: ', '').replace(/"/g, '')}"</p>
                        {msg.isLoadingImage ? (
                            <div className="aspect-square bg-black/5 dark:bg-black/20 rounded-lg flex flex-col items-center justify-center p-6 border border-dashed border-gray-300 dark:border-gray-600">
                                <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                                <p className="text-xs text-center text-gray-500 dark:text-gray-400 animate-pulse">Dreaming...</p>
                            </div>
                        ) : msg.imageUrl ? (
                            <div className="rounded-lg overflow-hidden shadow-lg bg-black animate-scale-in">
                                <img src={msg.imageUrl} alt="Generated" className="w-full h-auto object-cover" />
                            </div>
                        ) : null}
                    </div>
                )}

                {msg.type === 'api_key_prompt' && (
                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-200">
                            <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
                            <div>
                                <h3 className="font-bold mb-1">Setup Required</h3>
                                <p className="text-sm mb-3 opacity-90">{msg.text}</p>
                                <button onClick={handleSelectKey} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm py-2 px-4 rounded-lg transition-colors shadow-md">
                                    Select API Key
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <p className={`text-[10px] mt-1.5 opacity-60 px-1 ${msg.role === 'user' ? 'text-right text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
            </div>
            
            {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-md">
                    <User size={16} className="text-white" />
                </div>
            )}
        </div>
    ), []);
    
    // Footer for Virtuoso to handle thinking state
    const renderFooter = useCallback(() => {
        if (!isLoading) return <div className="h-4" />; // spacer
        return (
            <div className="flex gap-4 pb-6 px-4 md:px-8">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-500/30">
                    <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 flex items-center gap-3 w-fit shadow-sm">
                    {isProMode ? (
                        <>
                            <BrainCircuit size={18} className="text-indigo-500 animate-pulse" />
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-indigo-500 animate-pulse">Thinking deeply...</span>
                                <span className="h-1 w-16 bg-indigo-200 dark:bg-indigo-900/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-1/2 animate-[loading_1s_ease-in-out_infinite]"></div>
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="flex space-x-1.5">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [isLoading, isProMode]);

    return (
        <div className="h-full flex flex-col pt-16 md:pt-0 max-w-5xl mx-auto relative overflow-hidden">
             {/* History Sidebar Overlay */}
             {isHistoryOpen && (
                <div className="absolute inset-0 bg-black/40 dark:bg-black/60 z-30 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryOpen(false)} />
            )}
            
            {/* History Sidebar */}
            <div className={`absolute top-0 right-0 h-full w-80 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-out z-40 border-l border-gray-200 dark:border-gray-800 ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <History size={18} className="text-indigo-500" />
                        <h3 className="font-orbitron font-bold text-gray-900 dark:text-white tracking-wide">History</h3>
                    </div>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-70px)] p-4 space-y-3">
                    {history.length === 0 && (
                        <div className="text-center text-gray-400 dark:text-gray-500 mt-10">
                            <MessageSquare size={48} className="mx-auto mb-2 opacity-30" />
                            <p>No chats yet.</p>
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
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1 mr-2">{session.title}</p>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                                    {new Date(session.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate opacity-70">{session.messages.length} messages</p>
                            
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

            {/* Header */}
            <div className="flex justify-between items-center px-4 md:px-0 py-2 mb-2 z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-25"></div>
                        <div className="relative bg-white dark:bg-gray-800 p-2 rounded-full">
                            <Bot size={24} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-orbitron">AI Chatbot</h1>
                        <div className="flex items-center gap-1.5">
                             <span className={`w-2 h-2 rounded-full ${isProMode ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse' : 'bg-green-500'}`}></span>
                             <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                 {isProMode ? 'Gemini 3 Pro' : 'Standard'}
                             </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1.5 rounded-full border border-gray-200 dark:border-gray-700">
                        <button 
                            onClick={() => setIsProMode(!isProMode)}
                            className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-2 ${
                                isProMode 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                             <BrainCircuit size={14} />
                             Pro Mode
                        </button>
                        
                        <div className="group relative px-2 cursor-help">
                             <Info size={16} className="text-gray-400 hover:text-indigo-500 transition-colors" />
                             {/* Tooltip */}
                             <div className="absolute top-full right-0 mt-3 w-64 p-4 bg-[#1a1a20] text-white text-xs rounded-xl shadow-2xl border border-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 origin-top-right scale-95 group-hover:scale-100">
                                <div className="font-bold mb-2 text-indigo-400 flex items-center gap-1.5">
                                    <BrainCircuit size={14} />
                                    Gemini 3 Pro + Thinking
                                </div>
                                <p className="text-gray-300 leading-relaxed">
                                    Activates deeper reasoning capabilities. The model "thinks" before responding, making it ideal for complex logic, coding, and creative problem-solving.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    <button 
                        onClick={handleNewSession} 
                        className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="New Chat"
                    >
                        <Plus size={20} />
                    </button>
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="History"
                    >
                        <History size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area (Virtualized) */}
            <div className="flex-1 h-full relative">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-0 animate-fade-in-up overflow-y-auto" style={{ animationDelay: '0.1s' }}>
                        <div className="text-center max-w-2xl mx-auto">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 rotate-3">
                                <Sparkles size={40} className="text-indigo-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 font-orbitron">How can I help you create?</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-10">I can generate images, videos, write code, or brainstorm ideas.</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full px-4">
                                {SUGGESTIONS.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(suggestion)}
                                        className="p-4 text-left text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 group"
                                    >
                                        <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{suggestion}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={messages}
                        itemContent={renderMessage}
                        components={{ Footer: renderFooter }}
                        style={{ height: '100%' }}
                        followOutput="auto"
                        initialTopMostItemIndex={messages.length - 1}
                        alignToBottom
                        className="scrollbar-thin"
                    />
                )}
            </div>

            {/* Floating Input Area */}
            <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent dark:from-[#121212] dark:via-[#121212] dark:to-transparent z-20">
                <div className="max-w-3xl mx-auto relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 blur-xl transition-opacity duration-300" style={{ opacity: isLoading ? 0.1 : 0.2 }}></div>
                    <div className="relative flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-full p-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isProMode ? "Ask a complex question..." : "Type your message..."}
                            className="flex-1 pl-4 pr-2 py-2 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || !input.trim()}
                            className={`p-2.5 rounded-full transition-all duration-300 ${
                                input.trim() && !isLoading
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={input.trim() ? 'ml-0.5' : ''} />}
                        </button>
                    </div>
                </div>
                <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 mt-3">
                    AI can make mistakes. Please verify important information.
                </p>
            </div>
             <style>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .scrollbar-thin::-webkit-scrollbar { width: 6px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
                .dark .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; }
                .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scale-in { animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};
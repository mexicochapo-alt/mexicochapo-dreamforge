import React, { useState, useEffect, useCallback } from 'react';
import { generateVideo, checkVideoOperation } from '../services/geminiService';
import { Loader2, Sparkles, Video, AlertTriangle, Clock, Play, Film } from 'lucide-react';
import type { Operation } from '@google/genai';

interface VideoHistoryItem {
    id: string;
    prompt: string;
    uri: string;
    timestamp: number;
    aspectRatio: '16:9' | '9:16';
}

const ApiKeySelector: React.FC<{ onKeySelected: () => void }> = ({ onKeySelected }) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-md mx-auto animate-fade-in">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20">
            <AlertTriangle className="text-yellow-500" size={32} />
        </div>
        <h2 className="text-3xl font-bold mb-3 font-orbitron text-gray-900 dark:text-white">Unlock Veo</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            To create cinematic AI videos, you need to connect your own Google AI Studio API key. It's a secure, one-time setup.
        </p>
        <button
            onClick={async () => {
                await window.aistudio?.openSelectKey();
                onKeySelected();
            }}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] transition-all"
        >
            Connect API Key
        </button>
        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="mt-6 text-xs text-gray-400 hover:text-indigo-400 transition-colors">
            View billing documentation
        </a>
    </div>
);

const LOADING_MESSAGES = [
    "Warming up the digital director's chair...",
    "Assembling pixels into cinematic art...",
    "Teaching algorithms the art of storytelling...",
    "Rendering your vision, frame by frame...",
    "This can take a few minutes. Great art takes time!",
];

export const VideoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    
    const [history, setHistory] = useState<VideoHistoryItem[]>(() => {
        const saved = localStorage.getItem('videoHistory');
        return saved ? JSON.parse(saved) : [];
    });

    const checkApiKey = useCallback(async () => {
        const keyStatus = await window.aistudio?.hasSelectedApiKey();
        setHasApiKey(keyStatus ?? false);
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    useEffect(() => {
        let interval: number;
        if (isLoading) {
            interval = window.setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = LOADING_MESSAGES.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
                    return LOADING_MESSAGES[nextIndex];
                });
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    const pollOperation = useCallback(async (op: Operation): Promise<string> => {
        let currentOp = op;
        while (!currentOp.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            try {
                currentOp = await checkVideoOperation(currentOp);
            } catch (err: any) {
                if (err.message?.includes("Requested entity was not found.")) {
                    setError("API key error. Please re-select your key.");
                    setHasApiKey(false);
                    setIsLoading(false);
                    throw new Error("API Key Invalid");
                }
                throw err;
            }
        }
        
        const downloadLink = currentOp.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            return downloadLink;
        } else {
            throw new Error("Video generation completed but no download link was found.");
        }
    }, []);

    const saveToHistory = (item: VideoHistoryItem) => {
        const updatedHistory = [item, ...history].slice(0, 10);
        setHistory(updatedHistory);
        localStorage.setItem('videoHistory', JSON.stringify(updatedHistory));
    };

    const fetchAndDisplayVideo = async (uri: string) => {
        if (!process.env.API_KEY) throw new Error("API Key missing");
        const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error("Failed to download video.");
        const blob = await response.blob();
        setGeneratedVideoUrl(URL.createObjectURL(blob));
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedVideoUrl(null);
        setLoadingMessage(LOADING_MESSAGES[0]);

        try {
            const initialOperation = await generateVideo(prompt, aspectRatio);
            const uri = await pollOperation(initialOperation);
            await fetchAndDisplayVideo(uri);
            
            saveToHistory({
                id: Date.now().toString(),
                prompt,
                uri,
                timestamp: Date.now(),
                aspectRatio
            });

        } catch (err: any) {
            console.error(err);
            if (err.message === "API Key Invalid") {
                // handled
            } else if (err.message?.includes("Requested entity was not found.")) {
                setError("API key error. Please re-select your key.");
                setHasApiKey(false);
            } else {
                setError('Failed to generate video. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadFromHistory = async (item: VideoHistoryItem) => {
        if (isLoading) return;
        setIsLoading(true);
        setLoadingMessage("Restoring video from history...");
        setGeneratedVideoUrl(null);
        setError(null);
        setPrompt(item.prompt);
        setAspectRatio(item.aspectRatio);

        try {
             await fetchAndDisplayVideo(item.uri);
        } catch (err) {
            console.error(err);
            setError("Could not load video. The link may have expired.");
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!hasApiKey) {
        return <ApiKeySelector onKeySelected={() => { setHasApiKey(true); setError(null); }} />;
    }

    return (
        <div className="h-full flex flex-col lg:flex-row gap-8 pt-20 md:pt-4 p-4 max-w-7xl mx-auto">
            {/* Control Panel */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-orbitron mb-2">Veo Studio</h1>
                    <p className="text-gray-500 dark:text-gray-400">Director's prompt. Scene 1. Take 1.</p>
                </div>
                
                <div className="bg-white dark:bg-[#1a1a20] p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl opacity-0 group-focus-within:opacity-30 transition duration-500 blur"></div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe a scene: A neon hologram of a cat driving a cyberpunk car..."
                        className="relative w-full h-40 p-4 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 resize-none leading-relaxed"
                    />
                </div>

                <div className="flex gap-3">
                    {(['16:9', '9:16'] as const).map(ar => (
                        <button
                            key={ar}
                            onClick={() => setAspectRatio(ar)}
                            className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all duration-200 ${
                                aspectRatio === ar 
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' 
                                : 'border-transparent bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                        >
                            {ar === '16:9' ? 'Landscape' : 'Portrait'} <span className="opacity-50 text-xs">({ar})</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Film size={20} className="group-hover:animate-pulse" />}
                    <span>{isLoading ? 'Filming...' : 'Action!'}</span>
                </button>

                {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm text-center">{error}</div>}
            </div>

            {/* Stage & History */}
            <div className="flex-1 flex flex-col gap-6 min-h-0">
                {/* Main Stage */}
                <div className="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[400px] shadow-2xl border border-gray-800">
                    {isLoading && (
                        <div className="text-center z-10 px-4">
                            <Loader2 size={48} className="animate-spin text-rose-500 mx-auto mb-4" />
                            <p className="text-rose-400 font-orbitron animate-pulse tracking-widest uppercase text-sm mb-2">Processing</p>
                            <p className="text-gray-500 text-xs">{loadingMessage}</p>
                        </div>
                    )}
                    {!isLoading && !generatedVideoUrl && (
                        <div className="text-center text-gray-600 opacity-50">
                            <Video size={64} className="mx-auto mb-2" />
                            <p className="font-orbitron tracking-widest">NO SIGNAL</p>
                        </div>
                    )}
                    {generatedVideoUrl && (
                        <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                    )}
                </div>

                {/* History Strip */}
                {history.length > 0 && (
                    <div className="h-32">
                        <div className="flex items-center gap-2 mb-2 px-1 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                            <Clock size={12} /> Recent Takes
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 h-full scrollbar-thin">
                            {history.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => loadFromHistory(item)}
                                    disabled={isLoading}
                                    className="group flex-shrink-0 w-40 h-full bg-white dark:bg-[#1a1a20] rounded-xl border border-gray-200 dark:border-white/5 p-3 text-left relative overflow-hidden hover:border-rose-500/50 transition-colors"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                        <span className="text-white text-[10px] font-bold flex items-center gap-1"><Play size={10} fill="currentColor" /> Load</span>
                                    </div>
                                    <div className="h-full flex flex-col">
                                        <span className="text-[10px] font-mono text-rose-500 mb-1">{item.aspectRatio}</span>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 leading-tight font-medium group-hover:text-rose-400 transition-colors">
                                            {item.prompt}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .scrollbar-thin::-webkit-scrollbar { height: 4px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
            `}</style>
        </div>
    );
};
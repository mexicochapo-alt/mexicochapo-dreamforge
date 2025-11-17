import React, { useState, useEffect, useCallback } from 'react';
import { generateVideo, checkVideoOperation } from '../services/geminiService';
import { Loader2, Sparkles, Video, AlertTriangle } from 'lucide-react';
import type { Operation } from '@google/genai';

// Assume window.aistudio is available, per guidelines. Its type is defined globally in types.ts.

const ApiKeySelector: React.FC<{ onKeySelected: () => void }> = ({ onKeySelected }) => (
    <div className="text-center max-w-md mx-auto">
        <AlertTriangle className="mx-auto text-yellow-400 mb-4" size={48} />
        <h2 className="text-2xl font-bold mb-2">API Key Required</h2>
        <p className="text-gray-400 mb-6">
            Video generation with Veo requires you to select your own API key. This is a one-time setup.
        </p>
        <button
            onClick={async () => {
                await window.aistudio?.openSelectKey();
                onKeySelected();
            }}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
        >
            Select API Key
        </button>
        <p className="text-xs text-gray-500 mt-4">
            For more information on billing, please visit {' '}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-400">
                ai.google.dev/gemini-api/docs/billing
            </a>.
        </p>
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

    const pollOperation = useCallback(async (op: Operation) => {
        let currentOp = op;
        while (!currentOp.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            try {
                currentOp = await checkVideoOperation(currentOp);
            } catch (err: any) {
                if (err.message?.includes("Requested entity was not found.")) {
                    setError("API key error. Please re-select your key.");
                    setHasApiKey(false); // Reset key state
                    setIsLoading(false);
                    return;
                }
                throw err;
            }
        }
        
        const downloadLink = currentOp.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink && process.env.API_KEY) {
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await response.blob();
            setGeneratedVideoUrl(URL.createObjectURL(blob));
        } else {
            throw new Error("Video generation completed but no download link was found.");
        }
    }, []);

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
            await pollOperation(initialOperation);
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes("Requested entity was not found.")) {
                setError("API key error. Please re-select your key.");
                setHasApiKey(false);
            } else {
                setError('Failed to generate video. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!hasApiKey) {
        return (
            <div className="h-full flex items-center justify-center pt-16 md:pt-0">
                <ApiKeySelector onKeySelected={() => {
                    setHasApiKey(true);
                    setError(null);
                }} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col md:flex-row gap-8 pt-16 md:pt-0">
            <div className="w-full md:w-1/3 flex flex-col space-y-6">
                <h1 className="text-3xl font-bold text-white font-orbitron">Video Generator</h1>
                <p className="text-gray-400">Describe the video you want to create. Be descriptive and imaginative.</p>
                
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A neon hologram of a cat driving at top speed"
                    className="w-full h-32 p-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['16:9', '9:16'] as const).map(ar => (
                            <button
                                key={ar}
                                onClick={() => setAspectRatio(ar)}
                                className={`p-2 rounded-md transition-all duration-200 border-2 ${aspectRatio === ar ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700/50 border-gray-600 hover:border-indigo-500'}`}
                            >
                                {ar} {ar === '16:9' ? '(Landscape)' : '(Portrait)'}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                    <span>{isLoading ? 'Generating...' : 'Generate Video'}</span>
                </button>

                {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <div className="flex-1 bg-gray-900/50 rounded-lg border border-dashed border-gray-700 flex items-center justify-center p-4">
                {isLoading && (
                    <div className="text-center text-indigo-400">
                        <Loader2 size={48} className="animate-spin mx-auto" />
                        <p className="mt-4 font-semibold">{loadingMessage}</p>
                    </div>
                )}
                {!isLoading && !generatedVideoUrl && (
                    <div className="text-center text-gray-500">
                        <Video size={64} className="mx-auto" />
                        <p className="mt-2">Your generated video will appear here</p>
                    </div>
                )}
                {generatedVideoUrl && (
                    <video src={generatedVideoUrl} controls autoPlay loop className="max-h-full max-w-full object-contain rounded-md" />
                )}
            </div>
        </div>
    );
};
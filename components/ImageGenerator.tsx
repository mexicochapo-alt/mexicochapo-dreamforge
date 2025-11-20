
import React, { useState, useEffect } from 'react';
import { generateImage } from '../services/geminiService';
import { Loader2, Image as ImageIcon, Sparkles, Wand2, History, X, Download, Trash2, RotateCcw } from 'lucide-react';
import { ImageHistoryItem } from '../types';

export const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // History State
    const [history, setHistory] = useState<ImageHistoryItem[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Load history on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('imageHistory');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse image history", e);
            }
        }
    }, []);

    const saveToHistory = (newImage: string, promptText: string) => {
        const newItem: ImageHistoryItem = {
            id: Date.now().toString(),
            prompt: promptText,
            base64Image: newImage,
            timestamp: Date.now()
        };

        setHistory(prev => {
            // Limit to last 10 items to prevent LocalStorage quota issues with base64 images
            const newHistory = [newItem, ...prev].slice(0, 10);
            localStorage.setItem('imageHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const imageUrl = await generateImage(prompt);
            setGeneratedImage(imageUrl);
            saveToHistory(imageUrl, prompt);
        } catch (err) {
            setError('Failed to generate image. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadFromHistory = (item: ImageHistoryItem) => {
        setPrompt(item.prompt);
        setGeneratedImage(item.base64Image);
        setIsHistoryOpen(false);
    };

    const handleDeleteFromHistory = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newHistory = history.filter(item => item.id !== id);
        setHistory(newHistory);
        localStorage.setItem('imageHistory', JSON.stringify(newHistory));
    };

    const handleDownload = (e: React.MouseEvent, base64Image: string, id: string) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = base64Image;
        link.download = `dreamforge-${id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-8 pt-20 md:pt-4 p-4 max-w-7xl mx-auto relative overflow-hidden">
             {/* History Sidebar Overlay */}
             {isHistoryOpen && (
                <div className="absolute inset-0 bg-black/40 dark:bg-black/60 z-30 backdrop-blur-sm transition-opacity lg:fixed" onClick={() => setIsHistoryOpen(false)} />
            )}
            
            {/* History Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-out z-50 border-l border-gray-200 dark:border-gray-800 ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <History size={18} className="text-indigo-500" />
                        <h3 className="font-orbitron font-bold text-gray-900 dark:text-white tracking-wide">Gallery</h3>
                    </div>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-70px)] p-4 space-y-4">
                    {history.length === 0 && (
                        <div className="text-center text-gray-400 dark:text-gray-500 mt-10">
                            <ImageIcon size={48} className="mx-auto mb-2 opacity-30" />
                            <p>No images generated yet.</p>
                        </div>
                    )}
                    {history.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => handleLoadFromHistory(item)}
                            className="group relative bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all"
                        >
                            <div className="aspect-square w-full overflow-hidden relative">
                                <img src={item.base64Image} alt={item.prompt} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={(e) => handleDownload(e, item.base64Image, item.id)}
                                        className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white transition-colors"
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteFromHistory(e, item.id)}
                                        className="p-2 bg-red-500/20 backdrop-blur-md rounded-full hover:bg-red-500/80 text-red-200 hover:text-white transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-3">
                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-1 font-medium">{item.prompt}</p>
                                <span className="text-[10px] text-gray-400 block">
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Left Control Panel */}
            <div className="w-full lg:w-1/3 flex flex-col space-y-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-orbitron mb-2">Image Forge</h1>
                        <p className="text-gray-500 dark:text-gray-400">Transmute words into visual reality.</p>
                    </div>
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors lg:hidden"
                    >
                        <History size={24} />
                    </button>
                </div>
                
                <div className="space-y-6 relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                    <div className="relative bg-white dark:bg-[#1a1a20] rounded-xl p-1">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="A futuristic city made of crystal, neon lights, cinematic lighting, 8k resolution..."
                            className="w-full h-48 p-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 border-none focus:ring-0 resize-none text-lg leading-relaxed"
                        />
                        <div className="flex justify-end px-4 pb-2">
                             <span className="text-xs text-gray-400">{prompt.length} chars</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="group relative w-full flex items-center justify-center gap-3 py-4 rounded-xl overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_100%] animate-shimmer"></div>
                    <div className="relative flex items-center gap-2 text-white font-bold tracking-wide">
                        {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 size={20} className="group-hover:rotate-12 transition-transform" />}
                        <span>{isLoading ? 'Forging Reality...' : 'Generate Masterpiece'}</span>
                    </div>
                </button>

                <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="hidden lg:flex w-full items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-600 dark:text-gray-300 font-medium"
                >
                    <History size={18} />
                    <span>View Gallery History</span>
                </button>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-600 dark:text-red-400 rounded-r-lg">
                        {error}
                    </div>
                )}
            </div>

            {/* Right Output Panel */}
            <div className="flex-1 bg-gray-100 dark:bg-[#0f0f12] rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-[400px] shadow-inner group">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
                     style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                </div>

                {isLoading && (
                    <div className="text-center z-10">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 animate-pulse" size={32} />
                        </div>
                        <h3 className="text-xl font-orbitron text-gray-900 dark:text-white animate-pulse">Dreaming...</h3>
                        <p className="text-gray-500 mt-2">Constructing pixels from pure imagination</p>
                    </div>
                )}

                {!isLoading && !generatedImage && (
                    <div className="text-center text-gray-400 dark:text-gray-600 z-10">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                            <ImageIcon size={40} />
                        </div>
                        <p className="text-lg font-medium">Your canvas is empty</p>
                        <p className="text-sm">Enter a prompt to begin creation</p>
                    </div>
                )}

                {generatedImage && (
                    <div className="relative z-10 group-hover:scale-[1.01] transition-transform duration-500 max-w-full max-h-full">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <img 
                            src={generatedImage} 
                            alt="Generated art" 
                            className="relative rounded-lg shadow-2xl max-h-[70vh] object-contain" 
                        />
                        
                        {/* Action Overlay */}
                         <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                                onClick={(e) => handleDownload(e, generatedImage, Date.now().toString())}
                                className="p-2.5 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-full text-gray-800 dark:text-white hover:scale-110 transition-transform shadow-lg"
                                title="Download"
                            >
                                <Download size={20} />
                            </button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};
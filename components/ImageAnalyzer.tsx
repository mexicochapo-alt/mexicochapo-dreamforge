import React, { useState, useRef } from 'react';
import { analyzeImage } from '../services/geminiService';
import { Loader2, Upload, Send, Image as ImageIcon, ScanSearch, Bot } from 'lucide-react';
import { fileToBase64 } from '../utils/fileUtils';

export const ImageAnalyzer: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<{ file: File, url: string } | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { 
                setError('File size must be less than 4MB.');
                return;
            }
            setImage({ file, url: URL.createObjectURL(file) });
            setAnalysis(null);
            setError(null);
        }
    };
    
    const handleAnalyze = async () => {
        if (!prompt.trim()) {
            setError('Please enter a question.');
            return;
        }
        if (!image) {
            setError('Please upload an image.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const base64Data = await fileToBase64(image.file);
            const result = await analyzeImage(prompt, base64Data, image.file.type);
            setAnalysis(result);
        } catch (err) {
            setError('Failed to analyze image. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="h-full flex flex-col md:flex-row gap-8 pt-20 md:pt-4 p-4 max-w-7xl mx-auto">
            {/* Left: Upload Column */}
            <div className="w-full md:w-1/3 flex flex-col gap-6">
                 <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-orbitron">Visual Cortex</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gemini Vision 2.5 Analysis.</p>
                </div>

                <div className="flex-1 bg-white dark:bg-[#1a1a20] rounded-2xl border border-gray-200 dark:border-white/5 shadow-lg overflow-hidden flex flex-col">
                    <div className="flex-1 relative group">
                        {image ? (
                            <>
                                <img src={image.url} alt="Analysis Target" className="w-full h-full object-contain bg-black/5 dark:bg-black/40" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform"
                                    >
                                        Change Image
                                    </button>
                                </div>
                            </>
                        ) : (
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all"
                            >
                                <Upload size={48} className="mb-4" />
                                <span className="font-bold">Upload Image</span>
                                <span className="text-xs opacity-70 mt-1">PNG, JPEG (Max 4MB)</span>
                            </button>
                        )}
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>
            </div>

            {/* Right: Interaction Column */}
            <div className="flex-1 flex flex-col gap-4 h-[600px] md:h-auto">
                <div className="flex-1 bg-gray-50 dark:bg-[#0f0f12] rounded-2xl border border-gray-200 dark:border-white/5 p-6 overflow-y-auto relative scrollbar-thin">
                    {!analysis && !isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 opacity-50 pointer-events-none">
                            <ScanSearch size={64} strokeWidth={1} />
                            <p className="mt-4 font-orbitron tracking-widest">AWAITING INPUT</p>
                        </div>
                    )}
                    
                    {analysis && (
                        <div className="flex gap-4 animate-fade-in-up">
                             <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div className="bg-white dark:bg-[#1a1a20] p-6 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-200 leading-relaxed">
                                <p className="whitespace-pre-wrap">{analysis}</p>
                            </div>
                        </div>
                    )}

                    {isLoading && (
                         <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 pt-2">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl opacity-20 blur"></div>
                    <div className="relative bg-white dark:bg-[#1a1a20] p-2 rounded-xl flex items-center gap-2 shadow-lg">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ask about the image..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 px-2"
                            disabled={!image}
                            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading || !image || !prompt}
                            className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>
        </div>
    );
};
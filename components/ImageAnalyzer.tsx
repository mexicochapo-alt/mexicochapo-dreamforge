
import React, { useState, useRef } from 'react';
import { analyzeImage } from '../services/geminiService';
import { Loader2, Upload, Send, Image as ImageIcon } from 'lucide-react';
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
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
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
            setError('Please enter a question or instruction.');
            return;
        }
        if (!image) {
            setError('Please upload an image first.');
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
        <div className="h-full flex flex-col md:flex-row gap-8 pt-16 md:pt-0">
            <div className="w-full md:w-2/5 flex flex-col space-y-6">
                <h1 className="text-3xl font-bold text-white font-orbitron">Image Analyzer</h1>
                <p className="text-gray-400">Upload an image and ask Gemini anything about it.</p>

                <div className="flex flex-col space-y-4">
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700/50 border-2 border-dashed border-gray-600 text-gray-300 py-6 px-4 rounded-lg hover:bg-gray-700/80 hover:border-gray-500 transition-colors"
                    >
                        <Upload size={20} />
                        <span>{image ? 'Change Image' : 'Upload Image'}</span>
                    </button>
                    {image && <p className="text-xs text-center text-gray-400 truncate">Selected: {image.file.name}</p>}
                </div>
                
                <div className="flex-1 flex flex-col">
                    <div className="bg-gray-900/50 rounded-lg border border-dashed border-gray-700 flex items-center justify-center p-2 flex-1">
                        {image ? (
                             <img src={image.url} alt="To be analyzed" className="max-h-full max-w-full object-contain rounded-md" />
                        ) : (
                            <div className="text-center text-gray-500">
                                 <ImageIcon size={64} className="mx-auto" />
                                 <p className="mt-2">Upload an image to start</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="flex-1 flex flex-col">
                <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700/50 p-4 overflow-y-auto mb-4">
                    {isLoading && <div className="flex items-center justify-center h-full"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>}
                    {!isLoading && !analysis && <div className="flex items-center justify-center h-full text-gray-500">Analysis will appear here.</div>}
                    {analysis && <p className="whitespace-pre-wrap">{analysis}</p>}
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., What is in this image? Describe it in detail."
                        className="flex-1 p-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        disabled={!image}
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !image || !prompt}
                        className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
                 {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
        </div>
    );
};

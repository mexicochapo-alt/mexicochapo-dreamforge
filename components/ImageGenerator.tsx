
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { AspectRatio } from '../types';
import { Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';

const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const imageUrl = await generateImage(prompt, selectedAspectRatio);
            setGeneratedImage(imageUrl);
        } catch (err) {
            setError('Failed to generate image. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-8 pt-16 md:pt-0">
            <div className="w-full md:w-1/3 flex flex-col space-y-6">
                <h1 className="text-3xl font-bold text-white font-orbitron">Image Generator</h1>
                <p className="text-gray-400">Describe the image you want to create. Be as specific as possible for the best results.</p>
                
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A majestic lion wearing a crown, studio lighting, hyperrealistic"
                    className="w-full h-32 p-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-5 gap-2">
                        {aspectRatios.map(ar => (
                            <button
                                key={ar}
                                onClick={() => setSelectedAspectRatio(ar)}
                                className={`p-2 rounded-md transition-all duration-200 border-2 ${selectedAspectRatio === ar ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700/50 border-gray-600 hover:border-indigo-500'}`}
                            >
                                {ar}
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
                    <span>{isLoading ? 'Generating...' : 'Generate'}</span>
                </button>

                {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <div className="flex-1 bg-gray-900/50 rounded-lg border border-dashed border-gray-700 flex items-center justify-center p-4">
                {isLoading && <Loader2 size={48} className="animate-spin text-indigo-500" />}
                {!isLoading && !generatedImage && (
                    <div className="text-center text-gray-500">
                        <ImageIcon size={64} className="mx-auto" />
                        <p className="mt-2">Your generated image will appear here</p>
                    </div>
                )}
                {generatedImage && (
                    <img src={generatedImage} alt="Generated art" className="max-h-full max-w-full object-contain rounded-md" />
                )}
            </div>
        </div>
    );
};

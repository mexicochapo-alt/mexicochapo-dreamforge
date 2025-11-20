import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { Loader2, Upload, Sparkles, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { fileToBase64 } from '../utils/fileUtils';

export const ImageEditor: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [originalImage, setOriginalImage] = useState<{ file: File, url: string } | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
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
            setOriginalImage({ file, url: URL.createObjectURL(file) });
            setEditedImage(null);
            setError(null);
        }
    };

    const handleEdit = async () => {
        if (!prompt.trim()) {
            setError('Please enter an editing instruction.');
            return;
        }
        if (!originalImage) {
            setError('Please upload an image first.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            const base64Data = await fileToBase64(originalImage.file);
            const imageUrl = await editImage(prompt, base64Data, originalImage.file.type);
            setEditedImage(imageUrl);
        } catch (err) {
            setError('Failed to edit image. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col pt-20 md:pt-4 p-4 max-w-7xl mx-auto gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-orbitron">AI Editor</h1>
                    <p className="text-gray-500 dark:text-gray-400">Modify images with natural language instructions.</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                
                {/* Controls Column */}
                <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto">
                    {/* Upload Zone */}
                    <div className="relative group">
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 group-hover:border-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 ${
                                originalImage 
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-500/50' 
                                : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-white/5'
                            }`}
                        >
                            <div className={`p-4 rounded-full mb-3 transition-colors ${originalImage ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 group-hover:text-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900'}`}>
                                <Upload size={24} />
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-200">
                                {originalImage ? 'Replace Image' : 'Upload Source Image'}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">Max 4MB (PNG, JPEG)</span>
                        </button>
                    </div>

                    {/* Instruction Input */}
                    <div className="flex-1 flex flex-col gap-4">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Instructions</label>
                        <div className="relative flex-1">
                             <div className="absolute -inset-0.5 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-xl opacity-0 focus-within:opacity-30 transition duration-300 blur-sm"></div>
                             <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. Make the sky sunset orange, add a red hat to the cat..."
                                className="relative w-full h-full min-h-[150px] p-4 bg-white dark:bg-[#1a1a20] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-0 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                                disabled={!originalImage}
                            />
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleEdit}
                        disabled={isLoading || !originalImage || !prompt}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                        <span>{isLoading ? 'Processing...' : 'Apply Edits'}</span>
                    </button>
                     {error && <p className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/10 p-2 rounded-lg">{error}</p>}
                </div>

                {/* Preview Column (Split View) */}
                <div className="lg:col-span-8 flex flex-col md:flex-row gap-4 h-full min-h-[400px]">
                    {/* Original */}
                    <div className="flex-1 bg-gray-100 dark:bg-[#0f0f12] rounded-2xl border border-gray-200 dark:border-white/5 flex items-center justify-center p-4 relative overflow-hidden group">
                        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">ORIGINAL</div>
                        {originalImage ? (
                             <img src={originalImage.url} alt="Original" className="max-h-full max-w-full object-contain rounded-lg shadow-xl" />
                        ) : (
                            <div className="text-center opacity-30">
                                <ImageIcon size={48} className="mx-auto mb-2" />
                                <p>Waiting for upload...</p>
                            </div>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex items-center justify-center text-gray-400">
                        <ArrowRight size={24} />
                    </div>

                    {/* Edited */}
                    <div className="flex-1 bg-gray-100 dark:bg-[#0f0f12] rounded-2xl border border-gray-200 dark:border-white/5 flex items-center justify-center p-4 relative overflow-hidden">
                         <div className="absolute top-4 left-4 bg-indigo-500/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full z-10">RESULT</div>
                         
                         {isLoading && (
                             <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                                 <Loader2 size={48} className="animate-spin text-white drop-shadow-lg" />
                             </div>
                         )}

                         {editedImage ? (
                            <img src={editedImage} alt="Edited" className="max-h-full max-w-full object-contain rounded-lg shadow-xl animate-scale-in" />
                        ) : (
                            <div className="text-center opacity-30">
                                <Sparkles size={48} className="mx-auto mb-2" />
                                <p>Result will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { Loader2, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
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
        <div className="h-full flex flex-col md:flex-row gap-8 pt-16 md:pt-0">
            <div className="w-full md:w-1/3 flex flex-col space-y-6">
                <h1 className="text-3xl font-bold text-white font-orbitron">Image Editor</h1>
                <p className="text-gray-400">Upload an image and describe the changes you'd like to make.</p>

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
                        <span>{originalImage ? 'Change Image' : 'Upload Image'}</span>
                    </button>
                    {originalImage && <p className="text-xs text-center text-gray-400 truncate">Selected: {originalImage.file.name}</p>}
                </div>
                
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Add a retro filter, remove the person in the background"
                    className="w-full h-32 p-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    disabled={!originalImage}
                />

                <button
                    onClick={handleEdit}
                    disabled={isLoading || !originalImage || !prompt}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                    <span>{isLoading ? 'Editing...' : 'Edit Image'}</span>
                </button>
                {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center p-4">
                    {originalImage ? (
                         <img src={originalImage.url} alt="Original" className="max-h-full max-w-full object-contain rounded-md" />
                    ) : (
                        <div className="text-center text-gray-500">
                             <ImageIcon size={64} className="mx-auto" />
                             <p className="mt-2">Upload an image to start</p>
                        </div>
                    )}
                </div>
                 <div className="bg-gray-900/50 rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center p-4">
                    {isLoading && <Loader2 size={48} className="animate-spin text-indigo-500" />}
                    {!isLoading && !editedImage && (
                        <div className="text-center text-gray-500">
                             <Sparkles size={64} className="mx-auto" />
                             <p className="mt-2">Your edited image will appear here</p>
                        </div>
                    )}
                    {editedImage && (
                        <img src={editedImage} alt="Edited" className="max-h-full max-w-full object-contain rounded-md" />
                    )}
                </div>
            </div>
        </div>
    );
};

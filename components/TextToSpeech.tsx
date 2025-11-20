
import React, { useState, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import { Loader2, Speech, Play, Pause, Volume2, Download } from 'lucide-react';
import { decode, decodeAudioData } from '../utils/audioUtils';

const VOICES = [
    { name: 'Puck', gender: 'Male', style: 'Natural' },
    { name: 'Charon', gender: 'Male', style: 'Deep' },
    { name: 'Kore', gender: 'Female', style: 'Clear' },
    { name: 'Fenrir', gender: 'Male', style: 'Resonant' },
    { name: 'Zephyr', gender: 'Female', style: 'Soft' },
];

export const TextToSpeech: React.FC = () => {
    const [text, setText] = useState('');
    const [voice, setVoice] = useState('Puck');
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioBase64, setAudioBase64] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);

    const handleGenerate = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setError(null);
        setAudioBase64(null);
        stopAudio();

        try {
            const result = await generateSpeech(text, voice);
            setAudioBase64(result);
        } catch (err) {
            console.error(err);
            setError("Failed to generate speech.");
        } finally {
            setIsLoading(false);
        }
    };

    const playAudio = async () => {
        if (!audioBase64) return;
        
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        try {
            const buffer = await decodeAudioData(decode(audioBase64), audioContextRef.current, 24000, 1);
            
            // If already playing, stop old source
            if (sourceRef.current) {
                sourceRef.current.stop();
            }

            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsPlaying(false);
            
            source.start(0);
            sourceRef.current = source;
            setIsPlaying(true);
        } catch (err) {
            console.error("Playback error", err);
            setError("Could not play audio.");
        }
    };

    const stopAudio = () => {
        if (sourceRef.current) {
            sourceRef.current.stop();
            sourceRef.current = null;
        }
        setIsPlaying(false);
    };

    const handleDownload = () => {
        if (!audioBase64) return;
        
        // Convert base64 to blob for download
        const byteCharacters = atob(audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/pcm' }); // Note: It is raw PCM, might need container for some players
        
        // Since it's raw PCM, user might need to import as raw data in Audacity, or we stick to browser playing.
        // However, standard requirement usually implies usable file. 
        // Gemini API returns raw PCM. We can't easily wrap in WAV header in client-side JS without a lib, 
        // but for this demo we will offer the raw data download or just disable if too complex.
        // Let's actually create a simple WAV header for better UX.
        
        const wavBlob = createWavBlob(byteArray, 24000);
        const url = URL.createObjectURL(wavBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `speech-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to add WAV header
    const createWavBlob = (pcmData: Uint8Array, sampleRate: number) => {
        const buffer = new ArrayBuffer(44 + pcmData.length);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + pcmData.length, true);
        writeString(view, 8, 'WAVE');
        // fmt sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        // data sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, pcmData.length, true);

        // write pcm data
        const pcmView = new Uint8Array(buffer, 44);
        pcmView.set(pcmData);

        return new Blob([buffer], { type: 'audio/wav' });
    };

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    return (
        <div className="h-full flex flex-col pt-20 md:pt-4 p-4 max-w-6xl mx-auto gap-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-orbitron mb-2">Sonic Forge</h1>
                <p className="text-gray-500 dark:text-gray-400">Synthesize human-like speech from pure text.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 h-[600px] md:h-auto flex-1 min-h-0">
                {/* Input Panel */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="bg-white dark:bg-[#1a1a20] rounded-2xl border border-gray-200 dark:border-white/10 p-1 shadow-lg flex-1 flex flex-col relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl opacity-20 group-focus-within:opacity-40 transition duration-500 blur"></div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter text to synthesize..."
                            className="relative flex-1 w-full bg-white dark:bg-[#1a1a20] rounded-xl p-6 border-none focus:ring-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none text-lg leading-relaxed"
                        />
                        <div className="relative flex justify-between items-center p-4 bg-gray-50 dark:bg-black/20 rounded-b-xl">
                            <div className="flex gap-2">
                                {VOICES.map(v => (
                                    <button
                                        key={v.name}
                                        onClick={() => setVoice(v.name)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            voice === v.name 
                                            ? 'bg-teal-600 text-white shadow-md' 
                                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {v.name}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-gray-400 font-mono">{text.length} chars</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !text}
                        className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Speech size={20} />}
                        <span>Generate Audio</span>
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>

                {/* Output Panel */}
                <div className="w-full md:w-1/3 bg-gray-100 dark:bg-[#0f0f12] rounded-2xl border border-gray-200 dark:border-white/5 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    {!audioBase64 && !isLoading && (
                        <div className="text-center opacity-40">
                            <Volume2 size={64} className="mx-auto mb-4 text-gray-400" />
                            <p className="font-orbitron tracking-widest text-gray-500">NO AUDIO</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="text-center">
                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-teal-500 font-bold animate-pulse">Synthesizing...</p>
                        </div>
                    )}

                    {audioBase64 && (
                        <div className="w-full flex flex-col items-center gap-8 animate-fade-in-up">
                            {/* Visual Representation */}
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 shadow-[0_0_40px_rgba(20,184,166,0.4)] flex items-center justify-center relative group">
                                <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping opacity-20"></div>
                                {isPlaying ? (
                                    <div className="flex gap-1 h-8 items-end">
                                        <div className="w-1 bg-white animate-[music_0.8s_ease-in-out_infinite]"></div>
                                        <div className="w-1 bg-white animate-[music_1.1s_ease-in-out_infinite]"></div>
                                        <div className="w-1 bg-white animate-[music_0.5s_ease-in-out_infinite]"></div>
                                        <div className="w-1 bg-white animate-[music_0.9s_ease-in-out_infinite]"></div>
                                    </div>
                                ) : (
                                    <Volume2 size={40} className="text-white" />
                                )}
                            </div>

                            <div className="flex gap-4 w-full">
                                <button 
                                    onClick={isPlaying ? stopAudio : playAudio}
                                    className="flex-1 py-3 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                    {isPlaying ? 'Stop' : 'Play'}
                                </button>
                                <button 
                                    onClick={handleDownload}
                                    className="p-3 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors"
                                    title="Download WAV"
                                >
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
             <style>{`
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes music {
                    0%, 100% { height: 20%; }
                    50% { height: 100%; }
                }
            `}</style>
        </div>
    );
};

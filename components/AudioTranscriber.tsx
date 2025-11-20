
import React, { useState, useRef, useEffect } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { Mic, Square, Loader2, FileText, Copy, Check } from 'lucide-react';
import { encode } from '../utils/audioUtils';

export const AudioTranscriber: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number>();

    const cleanupAudio = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (sourceRef.current) sourceRef.current.disconnect();
        if (analyserRef.current) analyserRef.current.disconnect();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };

    useEffect(() => {
        return cleanupAudio;
    }, []);

    const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!analyserRef.current) return;
            animationFrameRef.current = requestAnimationFrame(draw);
            analyserRef.current.getByteFrequencyData(dataArray);

            ctx.fillStyle = '#000000'; // Clear transparently if needed, but here simpler
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                ctx.fillStyle = `rgb(${barHeight + 100}, 99, 241)`; // Indigo tint
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        draw();
    };

    const startRecording = async () => {
        setError(null);
        setTranscription(null);
        chunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Visualizer setup
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.fftSize = 256;
            drawVisualizer();

            mediaRecorderRef.current = new MediaRecorder(stream);
            
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                cleanupAudio();
                stream.getTracks().forEach(track => track.stop());
                
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Default to webm
                await handleTranscription(blob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error(err);
            setError("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTranscription = async (blob: Blob) => {
        setIsTranscribing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                const mimeType = blob.type || 'audio/webm';
                const text = await transcribeAudio(base64data, mimeType);
                setTranscription(text);
                setIsTranscribing(false);
            };
        } catch (err) {
            console.error(err);
            setError("Failed to transcribe audio.");
            setIsTranscribing(false);
        }
    };

    const copyToClipboard = () => {
        if (transcription) {
            navigator.clipboard.writeText(transcription);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="h-full flex flex-col pt-20 md:pt-4 p-4 max-w-5xl mx-auto gap-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-orbitron mb-2">Audio Scribe</h1>
                <p className="text-gray-500 dark:text-gray-400">Transmute speech into text with crystalline accuracy.</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-8 min-h-[400px]">
                
                {/* Recording Area */}
                <div className="relative w-full max-w-md aspect-video bg-gray-100 dark:bg-[#1a1a20] rounded-3xl border border-gray-200 dark:border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
                    {isRecording && (
                        <canvas 
                            ref={canvasRef} 
                            className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" 
                            width={600} 
                            height={300}
                        />
                    )}
                    
                    <div className="z-10 flex flex-col items-center gap-4">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing}
                            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                                isRecording 
                                ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-110' 
                                : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105'
                            } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isRecording ? <Square size={32} className="text-white fill-current" /> : <Mic size={40} className="text-white" />}
                        </button>
                        
                        <div className="h-6">
                            {isRecording && <span className="text-red-500 font-bold animate-pulse tracking-widest uppercase text-sm">Recording Live</span>}
                            {isTranscribing && (
                                <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>TRANSCRIBING...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Result Area */}
                {transcription && (
                    <div className="w-full max-w-3xl animate-fade-in-up">
                        <div className="bg-white dark:bg-[#1a1a20] rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg p-6 md:p-8 relative group">
                            <div className="absolute top-4 right-4">
                                <button 
                                    onClick={copyToClipboard}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                                </button>
                            </div>
                            
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                    <FileText size={24} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1 pt-1">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Transcription</h3>
                                    <p className="text-gray-900 dark:text-gray-100 leading-relaxed text-lg whitespace-pre-wrap">
                                        {transcription}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50">
                        {error}
                    </div>
                )}
            </div>
             <style>{`
                .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

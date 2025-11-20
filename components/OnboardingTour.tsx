
import React, { useState } from 'react';
import { X, ArrowRight, Image as ImageIcon, Video, MessageSquare, Sparkles, ChevronLeft } from 'lucide-react';
import { Logo } from './icons/Logo';

interface OnboardingTourProps {
    onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const steps = [
        {
            title: "Welcome to DreamForge",
            description: "Your all-in-one AI creative suite. Unleash your imagination with our powerful generation tools.",
            icon: <Logo width={64} height={64} className="animate-float" />,
            color: "from-indigo-500 to-purple-600"
        },
        {
            title: "Generate Images",
            description: "Turn text into stunning visuals. Use the Image Generator to create art, concepts, and photorealistic scenes in seconds.",
            icon: <ImageIcon size={64} className="text-indigo-400" />,
            color: "from-blue-500 to-indigo-600"
        },
        {
            title: "Create Videos",
            description: "Bring static ideas to life. Use our Video Generator to produce cinematic clips from simple text prompts.",
            icon: <Video size={64} className="text-purple-400" />,
            color: "from-purple-500 to-pink-600"
        },
        {
            title: "AI Chatbot & Pro Mode",
            description: "Need help or complex reasoning? Chat with our advanced AI assistant. Enable 'Pro Mode' for deep thinking tasks.",
            icon: <MessageSquare size={64} className="text-teal-400" />,
            color: "from-teal-500 to-emerald-600"
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        setIsExiting(true);
        setTimeout(onComplete, 300); // Wait for exit animation
    };

    const currentData = steps[currentStep];

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-white dark:bg-[#1a1a20] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-all duration-300 transform ${isExiting ? 'scale-95' : 'scale-100'}`}>
                
                {/* Header Image/Icon Area */}
                <div className={`h-48 bg-gradient-to-br ${currentData.color} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-4 right-4 z-10">
                        <button 
                            onClick={handleFinish}
                            className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/80 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="relative z-10 transform transition-all duration-500 ease-out key={currentStep} animate-scale-in">
                        {currentData.icon}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8 flex-1 flex flex-col text-center">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold font-orbitron text-gray-900 dark:text-white mb-3 transition-all duration-300">
                            {currentData.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {currentData.description}
                        </p>
                    </div>

                    {/* Indicators */}
                    <div className="flex justify-center gap-2 my-8">
                        {steps.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-indigo-600 dark:bg-indigo-500' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`}
                            />
                        ))}
                    </div>

                    {/* Footer / Buttons */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={handleBack}
                            className={`flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors ${currentStep === 0 ? 'invisible' : ''}`}
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>

                        {currentStep === steps.length - 1 ? (
                            <button
                                onClick={handleFinish}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 active:scale-95"
                            >
                                <Sparkles size={16} />
                                Get Started
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all transform hover:scale-105 active:scale-95"
                            >
                                Next
                                <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.8) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-scale-in { animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .animate-float { animation: float 6s ease-in-out infinite; }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
};

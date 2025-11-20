import React, { useState } from 'react';
import { ArrowLeft, Send, AlertCircle, Bug, CheckCircle, MessageSquare } from 'lucide-react';
import { LogoWhite } from './icons/LogoWhite';

interface SupportPageProps {
    onBack: () => void;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onBack }) => {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', issue: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate API call
        setTimeout(() => {
            setSubmitted(true);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200 flex flex-col font-poppins relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none"></div>
            
            <div className="container mx-auto px-6 py-8 flex-1 flex flex-col max-w-4xl z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Home</span>
                    </button>
                    <div className="flex items-center gap-3 opacity-80">
                        <LogoWhite width={32} height={32} />
                        <span className="font-orbitron font-bold text-lg">Support</span>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-start">
                    {/* Info Section */}
                    <div className="space-y-6">
                        <h1 className="text-4xl font-bold text-white font-orbitron leading-tight">
                            How can we help you <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Forge</span> better?
                        </h1>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            Encountered a glitch in the matrix? Have a suggestion for a new dimension? We appreciate your feedback to help us improve the DreamForge experience.
                        </p>
                        
                        <div className="pt-8 space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <Bug className="text-indigo-400 shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-semibold text-white">Report a Bug</h3>
                                    <p className="text-sm text-gray-400">Help us squash bugs and improve stability.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <MessageSquare className="text-purple-400 shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-semibold text-white">General Feedback</h3>
                                    <p className="text-sm text-gray-400">Share your thoughts and feature requests.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="bg-[#121212] border border-gray-800 p-8 rounded-2xl shadow-2xl shadow-purple-900/10">
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                        placeholder="Traveler Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                    <textarea 
                                        required
                                        value={formData.issue}
                                        onChange={e => setFormData({...formData, issue: e.target.value})}
                                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none min-h-[150px]"
                                        placeholder="Describe the issue or feedback..."
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-bold text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Send size={18} />
                                    Submit Report
                                </button>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-fade-in">
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle size={32} className="text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Message Received</h3>
                                <p className="text-gray-400 mb-8">Thank you for helping us make DreamForge better. We'll investigate your report shortly.</p>
                                <button 
                                    onClick={() => setSubmitted(false)}
                                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                                >
                                    Send another report
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="text-center py-6 text-gray-600 text-xs border-t border-gray-900">
                &copy; {new Date().getFullYear()} DreamForge AI. All systems operational.
            </div>
        </div>
    );
};

import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, Loader2, BrainCircuit } from 'lucide-react';

export const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isProMode, setIsProMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }));
            
            const response = await getChatResponse(input, history, isProMode);
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { role: 'model', text: "Sorry, I encountered an error. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="h-full flex flex-col pt-16 md:pt-0 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-white font-orbitron">AI Chatbot</h1>
                <div className="flex items-center space-x-2">
                    <BrainCircuit size={20} className={isProMode ? "text-indigo-400" : "text-gray-500"} />
                    <span className={`text-sm font-medium ${isProMode ? "text-indigo-400" : "text-gray-400"}`}>Pro Mode</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isProMode} onChange={() => setIsProMode(!isProMode)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-900/50 rounded-lg mb-4 border border-gray-700/50">
                <div className="space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 pt-10">
                        <p>Ask me anything!</p>
                        <p className="text-xs mt-2">Enable Pro Mode for more complex questions.</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-lg p-3 rounded-lg bg-gray-700 text-gray-200">
                           <Loader2 className="animate-spin" size={20} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your message..."
                    className="flex-1 p-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

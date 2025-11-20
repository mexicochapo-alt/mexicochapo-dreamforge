import React, { useState } from 'react';
import { Logo } from './icons/Logo';
import { PAGES, PageKey } from '../constants';
import { Menu, X, Sun, Moon, ArrowLeft, LogOut } from 'lucide-react';

type Theme = 'light' | 'dark';

interface SidebarProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onBackToHome: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, theme, setTheme, onBackToHome }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const navContent = (
    <nav className="flex flex-col space-y-2 p-3">
      {PAGES.map((page) => {
        const isActive = currentPage === page.key;
        return (
          <button
            key={page.key}
            onClick={() => {
              onPageChange(page.key);
              setIsMobileMenuOpen(false);
            }}
            className={`relative group flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 ease-out overflow-hidden ${
              isActive
                ? 'text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            {/* Active Background Gradient */}
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-100"></div>
            )}
            {/* Hover Glow (Inactive) */}
            {!isActive && (
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            )}
            
            <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {page.icon}
            </span>
            <span className={`relative z-10 text-sm font-medium tracking-wide`}>
                {page.name}
            </span>
            
            {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            )}
          </button>
        );
      })}
    </nav>
  );
  
  const bottomActions = (
     <div className="mt-auto p-3 border-t border-gray-200 dark:border-white/5 space-y-2">
        <button
            onClick={onBackToHome}
            className="w-full group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
        >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Exit to Hub</span>
        </button>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors duration-200 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300"
          aria-label="Toggle theme"
        >
          <span className="text-sm font-medium">
            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
          </span>
          <div className="relative w-10 h-5 bg-gray-300 dark:bg-gray-700 rounded-full p-0.5 transition-colors">
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}>
                  {theme === 'light' ? <Sun size={10} className="text-amber-500"/> : <Moon size={10} className="text-indigo-500"/>}
              </div>
          </div>
        </button>
      </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-lg border-b border-gray-200 dark:border-white/5 w-full fixed top-0 left-0 z-30">
        <div className="flex items-center space-x-3">
            <button 
                onClick={onBackToHome} 
                className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Back to Home"
            >
                <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
                <Logo width={28} height={28} />
                <h1 className="font-orbitron text-lg font-bold text-gray-900 dark:text-white tracking-wide">DreamForge</h1>
            </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 dark:text-gray-300 p-2 active:scale-95 transition-transform">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl z-20 pt-24 flex flex-col animate-scale-in">
           {navContent}
           {bottomActions}
        </div>
      )}
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-gray-50 dark:bg-[#0f0f12] border-r border-gray-200 dark:border-white/5 shrink-0 relative overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
        
        <div className="flex items-center space-x-3 p-6 mb-2">
          <div className="animate-float">
            <Logo width={36} height={36} />
          </div>
          <h1 className="font-orbitron text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-widest">
              DREAMFORGE
          </h1>
        </div>
        
        {navContent}
        {bottomActions}
      </aside>
    </>
  );
};
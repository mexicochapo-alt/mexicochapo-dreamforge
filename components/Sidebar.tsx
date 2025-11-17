
import React, { useState } from 'react';
import { Logo } from './icons/Logo';
import { PAGES, PageKey } from '../constants';
import { Menu, X } from 'lucide-react';

interface SidebarProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navContent = (
    <nav className="flex flex-col space-y-2 p-2">
      {PAGES.map((page) => (
        <button
          key={page.key}
          onClick={() => {
            onPageChange(page.key);
            setIsMobileMenuOpen(false);
          }}
          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
            currentPage === page.key
              ? 'bg-white/10 text-white shadow-lg'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          {page.icon}
          <span>{page.name}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-gray-700/50 w-full fixed top-0 left-0 z-20">
        <div className="flex items-center space-x-2">
            <Logo width={28} height={28} />
            <h1 className="font-orbitron text-lg font-bold text-white">DreamForge</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-300">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#121212] z-10 pt-20">
           {navContent}
        </div>
      )}
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1a1a1a] border-r border-gray-700/50 p-4 shrink-0">
        <div className="flex items-center space-x-3 mb-8 px-2">
          <Logo width={32} height={32} />
          <h1 className="font-orbitron text-xl font-bold text-white">DreamForge</h1>
        </div>
        {navContent}
      </aside>
    </>
  );
};

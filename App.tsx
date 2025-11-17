
import React, { useState, useEffect, useCallback } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { Sidebar } from './components/Sidebar';
import { PAGES, PageKey } from './constants';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageKey>('image-gen');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handlePageChange = useCallback((page: PageKey) => {
    setCurrentPage(page);
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  const CurrentPageComponent = PAGES.find(p => p.key === currentPage)?.component;

  return (
    <div className="flex h-screen bg-[#121212] text-gray-200 overflow-hidden">
      <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {CurrentPageComponent && <CurrentPageComponent />}
      </main>
    </div>
  );
};

export default App;

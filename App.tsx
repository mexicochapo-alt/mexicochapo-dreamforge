
import React, { useState, useEffect, useCallback } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './components/HomeScreen';
import { SupportPage } from './components/SupportPage';
import { Sidebar } from './components/Sidebar';
import { GamesPage } from './components/GamesPage';
import { OnboardingTour } from './components/OnboardingTour';
import { PAGES, PageKey } from './constants';

type Theme = 'light' | 'dark';
type AppView = 'splash' | 'home' | 'app' | 'support' | 'games';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('splash');
  const [currentPage, setCurrentPage] = useState<PageKey>('image-gen');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    return savedTheme || 'dark';
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setView('home');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handlePageChange = useCallback((page: PageKey) => {
    setCurrentPage(page);
  }, []);
  
  const handleEnterApp = () => {
      setView('app');
      const hasSeenOnboarding = localStorage.getItem('dreamforge_onboarding_seen');
      if (!hasSeenOnboarding) {
          setShowOnboarding(true);
      }
  };

  const handleCompleteOnboarding = () => {
      localStorage.setItem('dreamforge_onboarding_seen', 'true');
      setShowOnboarding(false);
  };

  const CurrentPageComponent = PAGES.find(p => p.key === currentPage)?.component;

  if (view === 'splash') {
    return <SplashScreen />;
  }

  if (view === 'home') {
    return (
      <HomeScreen 
        onEnterApp={handleEnterApp} 
        onEnterSupport={() => setView('support')}
        onEnterGames={() => setView('games')} 
      />
    );
  }

  if (view === 'support') {
    return <SupportPage onBack={() => setView('home')} />;
  }

  if (view === 'games') {
    return <GamesPage onBack={() => setView('home')} />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#121212] text-gray-800 dark:text-gray-200 overflow-hidden relative">
      {showOnboarding && <OnboardingTour onComplete={handleCompleteOnboarding} />}
      <Sidebar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        theme={theme}
        setTheme={setTheme}
        onBackToHome={() => setView('home')}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {CurrentPageComponent && <CurrentPageComponent />}
      </main>
    </div>
  );
};

export default App;

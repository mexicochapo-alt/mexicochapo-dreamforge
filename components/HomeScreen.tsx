
import React from 'react';
import { LogoWhite } from './icons/LogoWhite';
import { LifeBuoy, ArrowRight, Gamepad2, Settings } from 'lucide-react';

interface HomeScreenProps {
  onEnterApp: () => void;
  onEnterSupport: () => void;
  onEnterGames: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onEnterApp, onEnterSupport, onEnterGames }) => {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black flex flex-col items-center justify-center text-white">
      {/* Cosmic Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Deep Space Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a103c_0%,_#000000_100%)] opacity-80"></div>
        
        {/* Stars */}
        <div className="stars absolute inset-0 opacity-70"></div>
        
        {/* The Black Hole */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
           {/* Accretion Disk (Outer Glow) */}
           <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-3xl animate-pulse-slow"></div>
           
           {/* Accretion Disk (Spinning Ring) */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-[2px] border-transparent border-t-indigo-400 border-r-purple-400 blur-sm animate-spin-slow shadow-[0_0_50px_rgba(139,92,246,0.5)]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border-[4px] border-transparent border-b-pink-400 border-l-indigo-400 opacity-60 animate-spin-reverse-slow"></div>

           {/* Event Horizon (The Black Void) */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] bg-black rounded-full shadow-[0_0_60px_rgba(0,0,0,1)] z-10"></div>
        </div>
      </div>

      {/* Content Layer */}
      <div className="z-20 flex flex-col items-center space-y-10 animate-fade-in-up px-4">
         <div className="animate-float drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
            <LogoWhite width={100} height={100} />
         </div>
         
         <div className="text-center space-y-2">
             <h1 className="text-5xl md:text-7xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-200 to-purple-400 drop-shadow-lg tracking-wider">
                DREAMFORGE
             </h1>
             <p className="text-indigo-200/70 font-light text-lg tracking-[0.2em] uppercase">Universe of Creation</p>
         </div>
         
         <div className="flex flex-col gap-4 w-full max-w-lg pt-8">
            <div className="flex gap-4 w-full">
                <button 
                    onClick={onEnterApp} 
                    className="group relative flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/15 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all duration-300 text-white font-semibold overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <LogoWhite width={24} height={24} className="group-hover:rotate-12 transition-transform duration-300" />
                  <span>Launch Dream</span>
                  <ArrowRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" size={16} />
                </button>
                
                 <button 
                    onClick={onEnterSupport} 
                    className="group relative flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-transparent border border-white/10 rounded-xl hover:bg-white/5 hover:text-indigo-300 transition-all duration-300 text-gray-400 font-medium overflow-hidden"
                >
                   {/* Background Gear Design */}
                   <div className="absolute -right-6 -bottom-6 text-white/5 group-hover:text-white/10 transition-all duration-700 group-hover:rotate-90">
                       <Settings size={80} />
                   </div>

                   <div className="relative z-10 flex items-center gap-3">
                       <LifeBuoy size={20} /> 
                       <span>Support</span>
                   </div>
                </button>
            </div>

            <button 
                onClick={onEnterGames} 
                className="relative w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl transition-all duration-300 font-bold text-white overflow-hidden hover:scale-[1.02] active:scale-[0.98] shadow-xl group border border-white/20"
                style={{
                    // Blue Earth Sky background
                    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                }}
            >
               {/* Multiple Black Holes Effect using Radial Gradients */}
               <div className="absolute inset-0 pointer-events-none" style={{
                   background: `
                       radial-gradient(circle at 20% 30%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 25%),
                       radial-gradient(circle at 80% 70%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 20%),
                       radial-gradient(circle at 50% 50%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 30%)
                   `
               }}></div>
               
               {/* Shine Effect */}
               <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 opacity-50"></div>
               <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-40 group-hover:animate-shine" />

               <Gamepad2 size={24} className="relative z-10 drop-shadow-md" />
               <span className="relative z-10 font-orbitron tracking-widest text-lg drop-shadow-md">ENTER ARCADE</span>
            </button>
         </div>
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes spin-slow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
         @keyframes spin-reverse-slow {
          0% { transform: translate(-50%, -50%) rotate(360deg); }
          100% { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes pulse-slow {
           0%, 100% { transform: scale(1); opacity: 0.2; }
           50% { transform: scale(1.1); opacity: 0.3; }
        }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
        .animate-spin-reverse-slow { animation: spin-reverse-slow 20s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 1.2s ease-out forwards; }
        
        /* Simple CSS Stars */
        .stars {
            background-image: 
                radial-gradient(1px 1px at 10% 10%, white 100%, transparent),
                radial-gradient(1px 1px at 20% 80%, white 100%, transparent),
                radial-gradient(2px 2px at 30% 40%, white 100%, transparent),
                radial-gradient(1px 1px at 40% 90%, white 100%, transparent),
                radial-gradient(1px 1px at 50% 20%, white 100%, transparent),
                radial-gradient(2px 2px at 60% 70%, white 100%, transparent),
                radial-gradient(1px 1px at 70% 15%, white 100%, transparent),
                radial-gradient(1px 1px at 80% 50%, white 100%, transparent),
                radial-gradient(2px 2px at 90% 85%, white 100%, transparent);
            background-size: 200px 200px;
        }
      `}</style>
    </div>
  );
};

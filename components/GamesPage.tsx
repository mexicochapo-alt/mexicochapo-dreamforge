
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Grip, RotateCcw, Trophy, Circle, X as XIcon, HelpCircle, Info, Cpu, User, BrainCircuit } from 'lucide-react';
import { LogoWhite } from './icons/LogoWhite';

interface GamesPageProps {
    onBack: () => void;
}

type GameType = 'hub' | 'tictactoe';
type Player = 'X' | 'O';
type GameMode = 'PvP' | 'PvE';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

export const GamesPage: React.FC<GamesPageProps> = ({ onBack }) => {
    const [activeView, setActiveView] = useState<GameType>('hub');
    const [showRules, setShowRules] = useState(false);
    
    // Game State
    const [board, setBoard] = useState<(Player | null)[]>(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [winner, setWinner] = useState<Player | 'Draw' | null>(null);
    
    // AI State
    const [gameMode, setGameMode] = useState<GameMode>('PvE');
    const [difficulty, setDifficulty] = useState<Difficulty>('Hard');
    const [isAiThinking, setIsAiThinking] = useState(false);

    const calculateWinner = (squares: (Player | null)[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    // Minimax Algorithm for 'Hard' difficulty
    const minimax = (squares: (Player | null)[], depth: number, isMaximizing: boolean): number => {
        const result = calculateWinner(squares);
        if (result === 'O') return 10 - depth; // AI wins (maximize)
        if (result === 'X') return depth - 10; // Human wins (minimize)
        if (!squares.includes(null)) return 0; // Draw

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (squares[i] === null) {
                    squares[i] = 'O';
                    const score = minimax(squares, depth + 1, false);
                    squares[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (squares[i] === null) {
                    squares[i] = 'X';
                    const score = minimax(squares, depth + 1, true);
                    squares[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    };

    const getBestMove = useCallback((squares: (Player | null)[], level: Difficulty): number => {
        const availableMoves = squares.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        
        if (availableMoves.length === 0) return -1;

        // Easy: Purely Random
        if (level === 'Easy') {
            const randomIndex = Math.floor(Math.random() * availableMoves.length);
            return availableMoves[randomIndex];
        }

        // Medium: Block immediate threats or take immediate wins, otherwise random
        if (level === 'Medium') {
            // 1. Take winning move
            for (let move of availableMoves) {
                const copy = [...squares];
                copy[move] = 'O';
                if (calculateWinner(copy) === 'O') return move;
            }
            // 2. Block opponent winning move
            for (let move of availableMoves) {
                const copy = [...squares];
                copy[move] = 'X';
                if (calculateWinner(copy) === 'X') return move;
            }
            // 3. Random
            const randomIndex = Math.floor(Math.random() * availableMoves.length);
            return availableMoves[randomIndex];
        }

        // Hard: Minimax (Impossible)
        let bestScore = -Infinity;
        let move = -1;
        
        // Optimization: If start of game and center is open, take it (saves recursion depth)
        if (availableMoves.length >= 8 && squares[4] === null) return 4;

        for (let i = 0; i < 9; i++) {
            if (squares[i] === null) {
                squares[i] = 'O';
                const score = minimax(squares, 0, false);
                squares[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }, []);

    const handleAiTurn = useCallback(() => {
        if (winner || isXNext) return; 

        setIsAiThinking(true);
        
        // Artificial delay for realism
        const delay = 600 + Math.random() * 400; 

        setTimeout(() => {
            const move = getBestMove([...board], difficulty);
            if (move !== -1) {
                const newBoard = [...board];
                newBoard[move] = 'O';
                setBoard(newBoard);
                
                const win = calculateWinner(newBoard);
                if (win) {
                    setWinner(win);
                } else if (!newBoard.includes(null)) {
                    setWinner('Draw');
                } else {
                    setIsXNext(true);
                }
            }
            setIsAiThinking(false);
        }, delay);
    }, [board, difficulty, isXNext, winner, getBestMove]);

    useEffect(() => {
        if (gameMode === 'PvE' && !isXNext && !winner) {
            handleAiTurn();
        }
    }, [isXNext, gameMode, winner, handleAiTurn]);

    const handleClick = (i: number) => {
        if (winner || board[i] || isAiThinking) return;
        if (gameMode === 'PvE' && !isXNext) return;

        const newBoard = [...board];
        newBoard[i] = isXNext ? 'X' : 'O';
        setBoard(newBoard);
        const win = calculateWinner(newBoard);
        if (win) {
            setWinner(win);
        } else if (!newBoard.includes(null)) {
            setWinner('Draw');
        } else {
            setIsXNext(!isXNext);
        }
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
        setIsAiThinking(false);
    };

    const renderSquare = (i: number) => {
        return (
            <button
                className={`h-24 w-24 sm:h-32 sm:w-32 border-2 border-white/10 rounded-xl flex items-center justify-center text-4xl sm:text-6xl transition-all duration-200 hover:bg-white/5 ${
                    board[i] || (gameMode === 'PvE' && !isXNext) ? 'cursor-default' : 'cursor-pointer'
                } ${board[i] === 'X' ? 'text-indigo-400' : 'text-purple-400'}`}
                onClick={() => handleClick(i)}
                disabled={isAiThinking}
            >
                {board[i] === 'X' && <XIcon size={64} strokeWidth={2.5} />}
                {board[i] === 'O' && <Circle size={56} strokeWidth={3} />}
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-[#0b0b0f] text-gray-200 flex flex-col font-poppins relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_#1e1b4b_0%,_#000000_100%)] z-0"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0"></div>
            
            {/* Header */}
            <div className="relative z-10 w-full p-6 flex justify-between items-center border-b border-white/10 bg-black/20 backdrop-blur-sm">
                 <button 
                    onClick={activeView === 'hub' ? onBack : () => setActiveView('hub')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>{activeView === 'hub' ? 'Back to Home' : 'Back to Arcade'}</span>
                </button>
                
                <div className="flex items-center gap-4">
                     {activeView !== 'hub' && (
                        <button 
                            onClick={() => setShowRules(true)}
                            className="p-2 text-gray-400 hover:text-indigo-400 transition-colors rounded-full hover:bg-white/5"
                            title="How to Play"
                        >
                            <HelpCircle size={24} />
                        </button>
                     )}
                     <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                         <LogoWhite width={32} height={32} />
                         <h1 className="font-orbitron font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                             ARCADE
                         </h1>
                     </div>
                </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
                {activeView === 'hub' ? (
                    <div className="max-w-4xl w-full animate-fade-in">
                        <div className="text-center mb-12">
                             <h2 className="text-4xl font-bold text-white font-orbitron mb-4">Select Your Game</h2>
                             <p className="text-gray-400">Classic board games reimagined for the digital age.</p>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Tic Tac Toe Card */}
                            <button 
                                onClick={() => setActiveView('tictactoe')}
                                className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-300 text-left"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <Grip size={100} />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-4 text-indigo-400">
                                        <Grip size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 font-orbitron">Tic-Tac-Toe</h3>
                                    <p className="text-sm text-gray-400">The classic game of X's and O's. Play against AI or a friend.</p>
                                </div>
                            </button>

                            {/* Chess Placeholder */}
                            <div className="relative overflow-hidden bg-black/40 border border-white/5 rounded-2xl p-8 opacity-60 cursor-not-allowed">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Trophy size={100} />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-gray-700/20 rounded-lg flex items-center justify-center mb-4 text-gray-500">
                                        <Trophy size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-400 mb-2 font-orbitron">Chess</h3>
                                    <p className="text-sm text-gray-500">Coming soon. Master strategy on the 64 squares.</p>
                                </div>
                            </div>

                            {/* Checkers Placeholder */}
                            <div className="relative overflow-hidden bg-black/40 border border-white/5 rounded-2xl p-8 opacity-60 cursor-not-allowed">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Circle size={100} />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-gray-700/20 rounded-lg flex items-center justify-center mb-4 text-gray-500">
                                        <Circle size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-400 mb-2 font-orbitron">Checkers</h3>
                                    <p className="text-sm text-gray-500">Coming soon. Jump your way to victory.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in flex flex-col items-center w-full max-w-lg">
                        <div className="mb-8 text-center w-full">
                            <div className="flex justify-between items-center mb-6 w-full bg-white/5 p-2 rounded-xl border border-white/10">
                                <div className="flex p-1 bg-black/40 rounded-lg">
                                    <button 
                                        onClick={() => { setGameMode('PvE'); resetGame(); }}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${gameMode === 'PvE' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Vs AI
                                    </button>
                                    <button 
                                        onClick={() => { setGameMode('PvP'); resetGame(); }}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${gameMode === 'PvP' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Vs Friend
                                    </button>
                                </div>

                                {gameMode === 'PvE' && (
                                    <div className="flex items-center gap-2">
                                        <BrainCircuit size={16} className="text-purple-400" />
                                        <select 
                                            value={difficulty} 
                                            onChange={(e) => { setDifficulty(e.target.value as Difficulty); resetGame(); }}
                                            className="bg-black/40 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5"
                                        >
                                            <option value="Easy">Easy</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Hard">Impossible</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <h2 className="text-3xl font-orbitron font-bold text-white mb-4 tracking-widest">Tic-Tac-Toe</h2>
                            
                            <div className="flex items-center justify-center gap-6 text-sm">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isXNext && !winner ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-gray-500 opacity-50'}`}>
                                    <User size={16} />
                                    <span className="font-bold">Player X</span>
                                </div>
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${!isXNext && !winner ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-gray-500 opacity-50'}`}>
                                    {gameMode === 'PvE' ? <Cpu size={16} /> : <User size={16} />}
                                    <span className="font-bold">
                                        {isAiThinking ? 'Thinking...' : (gameMode === 'PvE' ? 'AI Opponent' : 'Player O')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-2xl mb-8 relative">
                             {/* Board Overlay when AI Thinking */}
                             {isAiThinking && (
                                <div className="absolute inset-0 z-10 bg-black/10 cursor-wait rounded-2xl"></div>
                             )}
                             
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                {board.map((_, i) => renderSquare(i))}
                            </div>
                        </div>

                        {winner && (
                             <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                                <div className="bg-[#1a1a20] p-8 rounded-2xl border border-white/10 text-center shadow-[0_0_50px_rgba(79,70,229,0.3)] transform scale-110 max-w-sm mx-4">
                                    <Trophy size={48} className="mx-auto text-yellow-400 mb-4 animate-bounce" />
                                    <h3 className="text-3xl font-bold text-white mb-2 font-orbitron">
                                        {winner === 'Draw' ? 'Game Drawn!' : 
                                         (gameMode === 'PvE' && winner === 'O') ? 'AI Dominates!' :
                                         (gameMode === 'PvE' && winner === 'X') ? 'You Won!' :
                                         `${winner} Wins!`}
                                    </h3>
                                    <p className="text-gray-400 mb-6">
                                        {gameMode === 'PvE' && winner === 'O' && difficulty === 'Hard' ? 'The algorithm is inevitable.' : 'Good game!'}
                                    </p>
                                    <button 
                                        onClick={resetGame}
                                        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        <RotateCcw size={18} />
                                        Play Again
                                    </button>
                                </div>
                             </div>
                        )}

                        {!winner && (
                             <button 
                                onClick={resetGame}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <RotateCcw size={16} />
                                Reset Board
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Rules Modal */}
            {showRules && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#1a1a20] max-w-md w-full p-6 rounded-2xl border border-white/10 shadow-2xl relative animate-scale-up">
                        <button 
                            onClick={() => setShowRules(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <XIcon size={24} />
                        </button>
                        
                        <h3 className="text-2xl font-bold text-white mb-6 font-orbitron flex items-center gap-3">
                            <Info size={28} className="text-indigo-500"/> 
                            <span>How to Play</span>
                        </h3>
                        
                        {activeView === 'tictactoe' && (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Objective</h4>
                                    <p className="text-gray-300 leading-relaxed">
                                        Align three of your symbols (<span className="text-indigo-400 font-bold">X</span> or <span className="text-purple-400 font-bold">O</span>) in a row—horizontally, vertically, or diagonally—before your opponent does.
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Modes</h4>
                                        <p className="text-sm text-gray-300">Choose <span className="text-white font-bold">Vs AI</span> to challenge the computer or <span className="text-white font-bold">Vs Friend</span> for local play.</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Difficulty</h4>
                                        <p className="text-sm text-gray-300">Can you beat the <span className="text-red-400 font-bold">Impossible</span> AI? It uses advanced logic to never lose.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center border-t border-white/5 pt-4">
                                    <Trophy size={14} />
                                    <span>Win, lose, or draw!</span>
                                </div>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => setShowRules(false)}
                            className="w-full mt-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold tracking-wide transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-900/20"
                        >
                            LET'S PLAY
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

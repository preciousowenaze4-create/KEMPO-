import React from 'react';

interface KempoAiOrbProps {
  onClick: () => void;
}

export const KempoAiOrb: React.FC<KempoAiOrbProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label="Kempo AI Assistant"
      title="Ask Kempo AI"
      className="fixed right-5 bottom-[90px] z-30 group cursor-pointer active:scale-95 transition-transform"
    >
      <div className="relative w-13 h-13 rounded-full flex items-center justify-center p-0.5 shadow-2xl shadow-red-950/70 bg-[#161619] border border-neutral-700/60 hover:border-red-500/80 transition-all">
        {/* Iridescent swirling gradient flower orb icon */}
        <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
          <svg
            className="w-full h-full animate-orb-spin"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="swirlGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="swirlGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            {/* Petals / spiral ring */}
            <circle cx="50" cy="50" r="44" stroke="url(#swirlGrad1)" strokeWidth="8" strokeDasharray="16 8" strokeLinecap="round" />
            <circle cx="50" cy="50" r="32" stroke="url(#swirlGrad2)" strokeWidth="7" strokeDasharray="14 7" strokeLinecap="round" opacity="0.9" />
            <circle cx="50" cy="50" r="20" fill="url(#swirlGrad1)" opacity="0.8" />
            <circle cx="50" cy="50" r="10" fill="#ffffff" opacity="0.95" />
          </svg>
        </div>

        {/* Ambient glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-600/20 via-purple-600/20 to-blue-600/20 blur-md pointer-events-none group-hover:opacity-100 opacity-60 transition" />
      </div>
    </button>
  );
};

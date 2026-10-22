import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface FlowerIntroScreenProps {
  onContinue: () => void;
}

export const FlowerIntroScreen: React.FC<FlowerIntroScreenProps> = ({ onContinue }) => {
  return (
    <div className="w-full h-full min-h-screen bg-black text-white flex flex-col justify-between items-center p-6 pt-[max(env(safe-area-inset-top),28px)] pb-[max(env(safe-area-inset-bottom),28px)] select-none overflow-y-auto">
      {/* Top Header Branding */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center font-black text-sm text-white shadow-lg shadow-red-950/80">
            K
          </div>
          <span className="font-black text-base tracking-tight text-white">
            KEMPO <span className="text-red-500">PRO</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs font-semibold text-red-400">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span>New Experience</span>
        </div>
      </div>

      {/* Centerpiece: Beautiful Kempo Red Botanical Flower Artwork */}
      <div className="w-full max-w-sm my-auto flex flex-col items-center text-center py-6">
        {/* Flower Artwork Container with Ambient Red Glow */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-6">
          {/* Ambient Multi-Layer Radial Glow */}
          <div className="absolute inset-0 bg-red-600/25 rounded-full blur-3xl pointer-events-none animate-pulse duration-1000" />
          <div className="absolute inset-10 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* SVG Blooming Flower Illustration */}
          <svg
            className="w-full h-full drop-shadow-[0_20px_35px_rgba(220,38,38,0.4)] animate-in zoom-in-95 duration-700"
            viewBox="0 0 300 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Petal Gradients */}
              <linearGradient id="petalRedDark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="60%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
              <linearGradient id="petalRedLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="petalWhiteRed" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#ffe4e6" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#14532d" />
              </linearGradient>
              <radialGradient id="flowerCenter" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#fef08a" />
                <stop offset="70%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#991b1b" />
              </radialGradient>
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Halo Ring */}
            <circle
              cx="150"
              cy="150"
              r="132"
              stroke="#27272a"
              strokeWidth="2"
              strokeDasharray="4 6"
              opacity="0.6"
            />
            <circle
              cx="150"
              cy="150"
              r="115"
              fill="#18181b"
              stroke="#dc2626"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />

            {/* Botanical Leaves Behind */}
            <g opacity="0.9">
              {/* Left Leaf */}
              <path
                d="M150 150 Q100 190 70 230 Q110 235 150 150"
                fill="url(#leafGrad)"
                stroke="#15803d"
                strokeWidth="1.5"
              />
              <path d="M150 150 Q98 200 85 225" stroke="#86efac" strokeWidth="1.2" opacity="0.7" />

              {/* Right Leaf */}
              <path
                d="M150 150 Q200 190 230 230 Q190 235 150 150"
                fill="url(#leafGrad)"
                stroke="#15803d"
                strokeWidth="1.5"
              />
              <path d="M150 150 Q202 200 215 225" stroke="#86efac" strokeWidth="1.2" opacity="0.7" />
            </g>

            {/* Outer Petal Ring (8 Rich Crimson & Ruby Petals) */}
            <g filter="url(#softGlow)">
              {/* 0 deg (Top) */}
              <path
                d="M150 150 C125 100 125 45 150 35 C175 45 175 100 150 150Z"
                fill="url(#petalRedDark)"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
              {/* 45 deg */}
              <path
                d="M150 150 C185 115 225 115 231 141 C221 166 170 170 150 150Z"
                transform="rotate(45 150 150)"
                fill="url(#petalRedDark)"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
              {/* 90 deg (Right) */}
              <path
                d="M150 150 C125 100 125 45 150 35 C175 45 175 100 150 150Z"
                transform="rotate(90 150 150)"
                fill="url(#petalRedDark)"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
              {/* 135 deg */}
              <path
                d="M150 150 C125 100 125 45 150 35 C175 45 175 100 150 150Z"
                transform="rotate(135 150 150)"
                fill="url(#petalRedDark)"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
              {/* 180 deg (Bottom) */}
              <path
                d="M150 150 C125 100 125 45 150 35 C175 45 175 100 150 150Z"
                transform="rotate(180 150 150)"
                fill="url(#petalRedDark)"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
              {/* 225 deg */}
              <path
                d="M150 150 C125 100 125 45 150 35 C175 45 175 100 150 150Z"
                transform="rotate(225 150 150)"
                fill="url(#petalRedDark)"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
              {/* 270 deg (Left) */}
              <path
                d="M150 150 C125 100 125 45 150 35 C175 45 175 100 150 150Z"
                transform="rotate(270 150 150)"
                fill="url(#petalRedDark)"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
              {/* 315 deg */}
              <path
                d="M150 150 C125 100 125 45 150 35 C175 45 175 100 150 150Z"
                transform="rotate(315 150 150)"
                fill="url(#petalRedDark)"
                stroke="#fca5a5"
                strokeWidth="1.5"
              />
            </g>

            {/* Inner Petal Ring (Offset 8 Petals with White & Crimson Highlights) */}
            <g>
              {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle, idx) => (
                <path
                  key={idx}
                  d="M150 150 C132 110 132 68 150 60 C168 68 168 110 150 150Z"
                  transform={`rotate(${angle} 150 150)`}
                  fill={idx % 2 === 0 ? 'url(#petalWhiteRed)' : 'url(#petalRedLight)'}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  opacity="0.95"
                />
              ))}
            </g>

            {/* Innermost Delicate Floral Core */}
            <circle cx="150" cy="150" r="32" fill="url(#flowerCenter)" stroke="#ffffff" strokeWidth="2.5" />

            {/* Floral Stamen & Pistils */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <g key={`stamen-${i}`} transform={`rotate(${angle} 150 150)`}>
                <line x1="150" y1="150" x2="150" y2="130" stroke="#fef08a" strokeWidth="1.8" />
                <circle cx="150" cy="128" r="3" fill="#ffffff" stroke="#ef4444" strokeWidth="1" />
              </g>
            ))}

            {/* Center Golden 'K' Medallion */}
            <circle cx="150" cy="150" r="14" fill="#ffffff" />
            <text
              x="150"
              y="155.5"
              fill="#dc2626"
              fontSize="16"
              fontWeight="900"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              K
            </text>

            {/* Floating Sparkles & Little Blossom Petals */}
            <circle cx="68" cy="74" r="3.5" fill="#fecdd3" opacity="0.8" />
            <circle cx="236" cy="80" r="4.5" fill="#fecdd3" opacity="0.9" />
            <circle cx="242" cy="192" r="3" fill="#ffffff" opacity="0.85" />
            <circle cx="56" cy="180" r="4" fill="#ffffff" opacity="0.75" />

            {/* Twinkles */}
            <path
              d="M72 110L74 116L80 118L74 120L72 126L70 120L64 118L70 116L72 110Z"
              fill="#ef4444"
            />
            <path
              d="M230 115L231.5 119.5L236 121L231.5 122.5L230 127L228.5 122.5L224 121L228.5 119.5L230 115Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          Welcome to <span className="text-white">Kempo </span>
          <span className="text-red-500">Pro</span>
        </h1>

        {/* Aesthetic Subtitle */}
        <p className="text-sm font-semibold text-neutral-300 mt-2.5 max-w-xs leading-snug">
          Where pure elegance meets instant, secure messaging.
        </p>

        {/* Description */}
        <p className="text-xs text-neutral-400 mt-2 max-w-xs leading-relaxed">
          Connect with friends, developers, gamers, and communities worldwide with crisp speed and red-carpet privacy.
        </p>
      </div>

      {/* Bottom Action Area: Continue Button */}
      <div className="w-full max-w-sm flex flex-col items-center space-y-3 pb-2">
        <button
          type="button"
          onClick={onContinue}
          className="w-full h-14 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 active:scale-[0.98] text-white font-extrabold text-base shadow-xl shadow-red-950/80 flex items-center justify-center gap-3 transition cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        <p className="text-[11px] text-neutral-500 font-medium">
          Step 1 of your journey • Tap Continue to begin
        </p>
      </div>
    </div>
  );
};

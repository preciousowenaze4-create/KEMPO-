import React, { useState } from 'react';
import {
  ChevronLeft,
  Palette,
  Check,
  Moon,
  Sun,
  Eye,
  Sparkles,
} from 'lucide-react';

interface AppearanceSettingsScreenProps {
  onBack: () => void;
}

export const AppearanceSettingsScreen: React.FC<AppearanceSettingsScreenProps> = ({ onBack }) => {
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kempo_app_theme') || 'crimson';
    }
    return 'crimson';
  });

  const [contrastMode, setContrastMode] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const themes = [
    {
      id: 'crimson',
      name: 'KEMPO Crimson Red (Signature)',
      desc: 'Deep dark tech background with high-contrast crimson neon accents',
      color: '#ef4444',
      badge: 'Default',
    },
    {
      id: 'scarlet',
      name: 'Scarlet Blaze',
      desc: 'Hot scarlet buttons, energetic red badges, and warm undertones',
      color: '#dc2626',
      badge: 'Vibrant',
    },
    {
      id: 'amoled',
      name: 'AMOLED Pitch Black',
      desc: 'Pure #000000 black background optimized for OLED battery saving',
      color: '#e11d48',
      badge: 'OLED',
    },
    {
      id: 'cyber',
      name: 'Cyberpunk Purple & Red',
      desc: 'Futuristic hybrid with magenta neon glows and dark slate styling',
      color: '#a855f7',
      badge: 'Futuristic',
    },
  ];

  const handleSelectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kempo_app_theme', themeId);
    }
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d12] text-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur-md sticky top-0 z-10 pt-[max(env(safe-area-inset-top),14px)]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-red-400 hover:text-red-300 active:scale-95 transition cursor-pointer font-medium text-sm"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Settings</span>
        </button>
        <h2 className="text-base font-bold text-white tracking-tight">Appearance</h2>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Color Palettes */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Accent Theme & Palette
          </h4>
          <div className="space-y-2">
            {themes.map((t) => (
              <div
                key={t.id}
                onClick={() => handleSelectTheme(t.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  selectedTheme === t.id
                    ? 'bg-red-950/30 border-red-500 shadow-md shadow-red-950/40'
                    : 'bg-[#15151e] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center shadow"
                    style={{ backgroundColor: t.color }}
                  >
                    {selectedTheme === t.id && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-semibold text-white">{t.name}</h5>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-neutral-300 border border-white/10">
                        {t.badge}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">{t.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Display Preferences
          </h4>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white">High Contrast Text</span>
                <p className="text-xs text-neutral-400 mt-0.5">Enhance text sharpness against cover backgrounds</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={contrastMode}
                  onChange={(e) => setContrastMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <Sparkles className="w-4 h-4" />
          <span>Appearance theme applied!</span>
        </div>
      )}
    </div>
  );
};

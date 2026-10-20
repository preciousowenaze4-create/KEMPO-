import React, { useState } from 'react';
import { X, Check, Palette, Sparkles } from 'lucide-react';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedRed, setSelectedRed] = useState<'crimson' | 'scarlet' | 'ruby'>('crimson');

  if (!isOpen) return null;

  const redVariants = [
    {
      id: 'crimson',
      name: 'KEMPO Crimson Red',
      desc: 'Official WhatsApp Dark Mode Red with neon glow',
      color: '#ef4444',
      badge: 'Default',
    },
    {
      id: 'scarlet',
      name: 'Scarlet Fire',
      desc: 'Vibrant hot red styling for badges and buttons',
      color: '#dc2626',
      badge: 'Vibrant',
    },
    {
      id: 'ruby',
      name: 'Royal Ruby',
      desc: 'Deep crimson wine tones with luxury finish',
      color: '#b91c1c',
      badge: 'Deep',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-sm rounded-3xl bg-[#18181c] border border-neutral-700/80 p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">App Color & Theme</h3>
            <p className="text-xs text-neutral-400">Customized in vibrant red palette</p>
          </div>
        </div>

        <div className="space-y-2.5 my-4">
          {redVariants.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedRed(v.id as any)}
              className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                selectedRed === v.id
                  ? 'bg-red-950/40 border-red-500'
                  : 'bg-[#121215] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center shadow"
                  style={{ backgroundColor: v.color }}
                >
                  {selectedRed === v.id && <Check className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">{v.name}</h4>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                      {v.badge}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-neutral-400 leading-tight mt-0.5">{v.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition"
        >
          Apply Theme
        </button>
      </div>
    </div>
  );
};

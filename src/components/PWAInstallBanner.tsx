import React, { useState } from 'react';
import { Smartphone, X, Download, Share2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  onOpenGuide: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onOpenGuide }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // If already installed in standalone mode, or dismissed, hide
  if (isInstalled || dismissed) return null;

  return (
    <div className="mx-4 mb-2 p-2.5 rounded-2xl bg-gradient-to-r from-red-950/80 via-[#221012] to-[#17171a] border border-red-700/50 shadow-lg flex items-center justify-between gap-3 animate-in fade-in select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-bold text-white truncate">
            Add KEMPO PRo to Home Screen
          </p>
          <p className="text-[11px] text-neutral-300 truncate">
            Runs as fullscreen mobile app with custom red icon
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isInstallable ? (
          <button
            onClick={install}
            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shadow transition cursor-pointer"
          >
            Install
          </button>
        ) : (
          <button
            onClick={onOpenGuide}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Share2 className="w-3 h-3 text-red-400" />
            Guide
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full text-neutral-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

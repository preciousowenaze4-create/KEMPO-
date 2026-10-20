import React from 'react';
import { X, Smartphone, Share, PlusSquare, Download, CheckCircle2 } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  onInstall: () => void;
  isInstalled: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  onInstall,
  isInstalled,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-[#18181c] border border-neutral-700/80 p-5 shadow-2xl relative select-none">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Icon */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl p-0.5 shadow-xl shadow-red-950/70 flex items-center justify-center overflow-hidden">
              <img src="/apple-touch-icon.png" alt="KEMPO PRo" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5 text-red-500" />
            </div>
          </div>

          <h3 className="text-xl font-extrabold text-white">Add KEMPO PRo</h3>
          <p className="text-[13px] text-neutral-300 mt-1 max-w-[270px]">
            Install directly to your home screen to look and feel exactly like a native mobile app!
          </p>
        </div>

        {/* Direct Install Button if supported by Chromium/Android */}
        {isInstallable && (
          <div className="mb-4">
            <button
              onClick={() => {
                onInstall();
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-950 transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              1-Tap Install App Now
            </button>
          </div>
        )}

        {isInstalled ? (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center gap-3 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>KEMPO PRo is already installed in Standalone Mode on your device!</span>
          </div>
        ) : (
          /* Step-by-step instructions for iOS Safari */
          <div className="space-y-3 bg-[#111114] p-3.5 rounded-2xl border border-neutral-800/80">
            <div className="flex items-start gap-3 text-[13px] text-neutral-300">
              <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <p>
                In <strong>Safari</strong> on your iPhone, tap the <span className="inline-flex items-center gap-1 font-semibold text-white bg-neutral-800 px-1.5 py-0.5 rounded text-xs"><Share className="w-3.5 h-3.5 text-blue-400 inline" /> Share</span> button in the bottom toolbar.
              </p>
            </div>

            <div className="flex items-start gap-3 text-[13px] text-neutral-300">
              <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <p>
                Scroll down and select <span className="inline-flex items-center gap-1 font-semibold text-white bg-neutral-800 px-1.5 py-0.5 rounded text-xs"><PlusSquare className="w-3.5 h-3.5 text-white inline" /> Add to Home Screen</span>.
              </p>
            </div>

            <div className="flex items-start gap-3 text-[13px] text-neutral-300">
              <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <p>
                Tap <strong>Add</strong> at top right. The app will launch fullscreen with zero browser address bar and the custom red icon!
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

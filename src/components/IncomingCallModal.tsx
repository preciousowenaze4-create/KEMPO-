import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, ShieldCheck, User } from 'lucide-react';
import { Chat } from '../types';
import { ringtoneManager } from '../lib/callSounds';

interface IncomingCallModalProps {
  caller: {
    id: string;
    name: string;
    avatarUrl?: string;
    kempoId?: string;
    isVideo: boolean;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    // Start authentic WhatsApp incoming call ringtone
    ringtoneManager.startIncomingRingtone();

    return () => {
      ringtoneManager.stop();
    };
  }, []);

  const handleAccept = () => {
    ringtoneManager.stop();
    onAccept();
  };

  const handleDecline = () => {
    ringtoneManager.playEndCallTone();
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] flex flex-col justify-between p-6 select-none animate-in fade-in overflow-hidden">
      {/* Background Animated Glow */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-30 animate-pulse" />

      {/* Top Header */}
      <div className="relative z-10 pt-[max(env(safe-area-inset-top),25px)] flex flex-col items-center text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-300 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>WhatsApp End-to-End Encrypted</span>
        </div>

        <span className="text-xs uppercase tracking-wider text-red-400 font-bold mt-2">
          INCOMING {caller.isVideo ? 'VIDEO' : 'VOICE'} CALL
        </span>

        <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
          {caller.name}
        </h2>

        {caller.kempoId && (
          <p className="text-xs font-mono text-neutral-400">
            {caller.kempoId}
          </p>
        )}
      </div>

      {/* Center Pulsing Avatar */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-6">
        <div className="relative flex items-center justify-center">
          {/* Animated WhatsApp Ringing Waves */}
          <div className="absolute w-52 h-52 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
          <div className="absolute w-44 h-44 rounded-full bg-emerald-500/30 animate-pulse" />

          <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-emerald-500 shadow-2xl shadow-emerald-950/80 z-20 bg-neutral-900 flex items-center justify-center">
            {caller.avatarUrl ? (
              <img src={caller.avatarUrl} alt={caller.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-black text-5xl bg-neutral-800">
                {caller.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm font-semibold text-neutral-300 mt-6 animate-pulse">
          Ringing on your phone...
        </p>
      </div>

      {/* Bottom Action Controls: Decline (Red) and Accept (Green) */}
      <div className="relative z-10 pb-[max(env(safe-area-inset-bottom),35px)] px-6">
        <div className="w-full max-w-sm mx-auto flex items-center justify-around">
          {/* Decline Button (Red) */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleDecline}
              aria-label="Decline call"
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-950 transition active:scale-90 cursor-pointer"
            >
              <PhoneOff className="w-7 h-7 stroke-[2.4]" />
            </button>
            <span className="text-xs font-semibold text-neutral-400">Decline</span>
          </div>

          {/* Accept Button (Green) */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAccept}
              aria-label="Accept call"
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-950 transition active:scale-90 animate-bounce cursor-pointer"
            >
              {caller.isVideo ? (
                <Video className="w-7 h-7 stroke-[2.4]" />
              ) : (
                <Phone className="w-7 h-7 stroke-[2.4]" />
              )}
            </button>
            <span className="text-xs font-semibold text-emerald-400">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

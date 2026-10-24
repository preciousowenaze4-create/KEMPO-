import React, { useState } from 'react';
import {
  ChevronLeft,
  Smartphone,
  Laptop,
  Monitor,
  QrCode,
  Shield,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface LinkedDevicesScreenProps {
  onBack: () => void;
}

interface DeviceSession {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const LinkedDevicesScreen: React.FC<LinkedDevicesScreenProps> = ({ onBack }) => {
  const [sessions, setSessions] = useState<DeviceSession[]>([
    {
      id: 'session-curr',
      name: 'Current Browser / PWA',
      type: 'mobile',
      browser: 'Web Applet (Active)',
      location: 'Primary Device',
      lastActive: 'Active Now',
      isCurrent: true,
    },
    {
      id: 'session-2',
      name: 'Chrome on macOS',
      type: 'desktop',
      browser: 'Chrome 124.0',
      location: 'Linked Web Client',
      lastActive: 'Today at 08:30 AM',
      isCurrent: false,
    },
  ]);

  const [showPairModal, setShowPairModal] = useState(false);
  const [pairingCode, setPairingCode] = useState('KEMPO-8924-PRO');

  const handleUnlink = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleGenerateCode = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    setPairingCode(`KEMPO-${random}-PRO`);
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
        <h2 className="text-base font-bold text-white tracking-tight">Linked Devices</h2>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Device Hero Graphic */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-white/10 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Use Kempo Pro on Web & Desktop</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Your personal messages and calls are end-to-end encrypted across every connected device simultaneously.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPairModal(true)}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Link a New Device</span>
          </button>
        </div>

        {/* Device Status */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Device Status
          </h4>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300">
                    {session.type === 'desktop' ? (
                      <Laptop className="w-5 h-5 text-sky-400" />
                    ) : (
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{session.name}</span>
                      {session.isCurrent && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          This Device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {session.browser} • {session.lastActive}
                    </p>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleUnlink(session.id)}
                    className="p-2 rounded-lg text-neutral-400 hover:text-red-400 active:scale-95 transition"
                    title="Log out device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Security Info */}
        <div className="p-4 rounded-2xl bg-[#15151e] border border-white/10 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-400 leading-relaxed">
            Your personal messages are end-to-end encrypted. They never get stored unencrypted on any server.
          </p>
        </div>
      </div>

      {/* QR Code / Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#181822] border border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <h3 className="text-base font-bold text-white">Scan QR to Link Device</h3>
            <p className="text-xs text-neutral-300">
              Open Kempo Pro on your other phone or computer and scan this sync code.
            </p>

            {/* Simulated Clean QR Code Graphic */}
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-xl">
              <div className="w-44 h-44 bg-neutral-900 rounded-xl flex flex-col items-center justify-center p-2 text-white relative overflow-hidden">
                <QrCode className="w-36 h-36 text-white" />
                <div className="absolute inset-0 bg-red-600/10 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400">Pairing Key</span>
              <div className="font-mono text-base font-black text-emerald-400 tracking-wider">
                {pairingCode}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleGenerateCode}
                className="py-2.5 px-3 bg-white/10 hover:bg-white/15 active:scale-95 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Refresh code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Code</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-red-950/70 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

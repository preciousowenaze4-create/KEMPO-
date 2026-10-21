import React, { useState } from 'react';
import {
  Phone,
  Video,
  Link as LinkIcon,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneCall,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { CallLog } from '../types';

interface CallsTabProps {
  calls: CallLog[];
  currentKempoId?: string;
  onStartCall: (name: string, isVideo: boolean) => void;
  onStartCallById: (kempoId: string, isVideo: boolean) => void;
}

export const CallsTab: React.FC<CallsTabProps> = ({
  calls,
  currentKempoId,
  onStartCall,
  onStartCallById,
}) => {
  const [targetId, setTargetId] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCallUser = (isVideo: boolean) => {
    const cleanId = targetId.trim().toUpperCase();
    if (!cleanId) return;

    // Prevent calling yourself
    if (currentKempoId && cleanId === currentKempoId.toUpperCase()) {
      setErrorMessage('You cannot call yourself. Enter another person’s KEMPO ID to ring their device.');
      return;
    }

    setErrorMessage(null);
    setIsCalling(true);
    onStartCallById(cleanId, isVideo);

    setTimeout(() => {
      setIsCalling(false);
      setTargetId('');
    }, 600);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),10px)] select-none space-y-4 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Calls</h1>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Calls</span>
        </div>
      </div>

      {/* Real WhatsApp-style Call by User ID */}
      <div className="p-4 rounded-3xl bg-[#161619] shadow-xl space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center font-bold">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Call Contact by User ID</h3>
            <p className="text-[11px] text-neutral-400">Rings the recipient's phone in real time</p>
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value.toUpperCase());
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Enter User ID (e.g. KEMPO-XXXXXX)"
            maxLength={18}
            className="w-full h-11 px-3.5 rounded-xl bg-[#0e0e11] text-white placeholder-neutral-500 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-red-500 uppercase transition"
          />

          {errorMessage && (
            <div className="p-2 rounded-xl bg-red-950/70 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isCalling || !targetId.trim()}
              onClick={() => handleCallUser(false)}
              className="flex-1 h-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Voice Call</span>
            </button>

            <button
              type="button"
              disabled={isCalling || !targetId.trim()}
              onClick={() => handleCallUser(true)}
              className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-950 disabled:opacity-40 cursor-pointer"
            >
              {isCalling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Video Call</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Share Encrypted Call Link Card */}
      <div
        onClick={() => {
          navigator.clipboard?.writeText(window.location.origin);
          alert('Call Link copied to clipboard! Share it with anyone to connect on KEMPO PRo.');
        }}
        className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#161619] hover:bg-[#1a1a1e] transition cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
          <LinkIcon className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-white">Create call link</h3>
          <p className="text-[12px] text-neutral-400">Share a link for your encrypted call</p>
        </div>
      </div>

      {/* Recent Calls Log */}
      <div>
        <h2 className="text-base font-bold text-white mb-2 pt-1">Recent Calls</h2>

        {calls.length > 0 ? (
          <div className="bg-[#141417] rounded-3xl overflow-hidden divide-y divide-neutral-900">
            {calls.map((call) => (
              <div
                key={call.id}
                className="p-3.5 flex items-center justify-between hover:bg-[#1c1c20] transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center text-white font-bold shrink-0">
                    {call.avatarUrl ? (
                      <img src={call.avatarUrl} alt={call.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{call.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4
                      className={`text-[15px] font-semibold truncate ${
                        call.type === 'missed' ? 'text-red-400 font-bold' : 'text-white'
                      }`}
                    >
                      {call.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[12px] text-neutral-400 mt-0.5">
                      {call.type === 'incoming' && (
                        <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {call.type === 'outgoing' && (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                      {call.type === 'missed' && (
                        <PhoneMissed className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span>
                        {call.type === 'missed'
                          ? 'Missed call'
                          : call.type === 'incoming'
                          ? 'Incoming'
                          : 'Outgoing'}{' '}
                        &bull; {call.timestamp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call Back Button */}
                <button
                  type="button"
                  onClick={() => onStartCall(call.name, call.isVideo)}
                  aria-label="Call contact back"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:bg-neutral-800/80 transition active:scale-95 cursor-pointer shrink-0"
                >
                  {call.isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-3xl bg-[#141417]">
            <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-2">
              <Phone className="w-5 h-5" />
            </div>
            <p className="font-bold text-white text-sm mb-1">No call history</p>
            <p className="text-neutral-400 text-xs">
              Enter a User ID above or tap the phone icon in any chat to place a call.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Phone, Video, Link as LinkIcon, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall } from 'lucide-react';
import { CallLog } from '../types';

interface CallsTabProps {
  calls: CallLog[];
  onStartCall: (name: string, isVideo: boolean) => void;
  onSimulateIncomingCall?: (isVideo: boolean) => void;
}

export const CallsTab: React.FC<CallsTabProps> = ({ calls, onStartCall, onSimulateIncomingCall }) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),10px)] select-none space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Calls</h1>
        <button
          onClick={() => onStartCall('New Contact', false)}
          aria-label="New call"
          className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center active:scale-95 transition shadow-lg shadow-red-950 cursor-pointer"
        >
          <PhoneCall className="w-5 h-5" />
        </button>
      </div>

      {/* Test Real Incoming Call Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#141d17] to-[#121415] border border-emerald-800/60 shadow-md flex items-center justify-between">
        <div>
          <h3 className="text-[14.5px] font-bold text-white flex items-center gap-1.5">
            Test Real Incoming Call
          </h3>
          <p className="text-[11.5px] text-neutral-400 mt-0.5">
            Hear your phone ring with the WhatsApp ringtone and answer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSimulateIncomingCall?.(false)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 active:scale-95 transition cursor-pointer flex items-center gap-1"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Voice</span>
          </button>
          <button
            onClick={() => onSimulateIncomingCall?.(true)}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950 active:scale-95 transition cursor-pointer flex items-center gap-1"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video</span>
          </button>
        </div>
      </div>

      {/* Create Call Link Card */}
      <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#161619] border border-neutral-800/80 hover:bg-[#1a1a1e] transition cursor-pointer">
        <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center">
          <LinkIcon className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-white">Create call link</h3>
          <p className="text-[13px] text-neutral-400">Share a link for your Kempo call</p>
        </div>
      </div>

      {/* Recent Calls */}
      <div>
        <h2 className="text-lg font-bold text-white mb-2">Recent</h2>

        {calls.length > 0 ? (
          <div className="divide-y divide-neutral-900/60">
            {calls.map((call) => (
              <div
                key={call.id}
                className="py-3 flex items-center justify-between hover:bg-[#151518] px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center text-white font-bold">
                    {call.avatarUrl ? (
                      <img src={call.avatarUrl} alt={call.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{call.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className={`text-[15.5px] font-semibold ${call.type === 'missed' ? 'text-red-500' : 'text-white'}`}>
                      {call.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[12.5px] text-neutral-400 mt-0.5">
                      {call.type === 'incoming' && <PhoneIncoming className="w-3.5 h-3.5 text-neutral-400" />}
                      {call.type === 'outgoing' && <PhoneOutgoing className="w-3.5 h-3.5 text-neutral-400" />}
                      {call.type === 'missed' && <PhoneMissed className="w-3.5 h-3.5 text-red-500" />}
                      <span>{call.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Action: Phone or Video */}
                <button
                  onClick={() => onStartCall(call.name, call.isVideo)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:bg-neutral-800/60 transition active:scale-95 cursor-pointer"
                >
                  {call.isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-neutral-500 text-xs rounded-2xl bg-[#161619] border border-neutral-800/60 mt-2">
            <p className="font-semibold text-neutral-300 text-sm mb-1">No recent calls</p>
            <p className="text-neutral-500">To start a call, tap the phone icon above or start from a chat.</p>
          </div>
        )}
      </div>
    </div>
  );
};

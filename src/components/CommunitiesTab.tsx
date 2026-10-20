import React from 'react';
import { Users, Plus } from 'lucide-react';

interface CommunitiesTabProps {
  onOpenCommunity: (name: string) => void;
}

export const CommunitiesTab: React.FC<CommunitiesTabProps> = ({ onOpenCommunity }) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),10px)] select-none space-y-5 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Communities</h1>
      </div>

      {/* New Community Card */}
      <div
        onClick={() => alert("New Community: Name your community and add topic groups.")}
        className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#161619] border border-neutral-800/80 hover:bg-[#1a1a1e] transition cursor-pointer"
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
            <Users className="w-6 h-6 text-neutral-300" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center ring-2 ring-black">
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-white">New Community</h3>
          <p className="text-[13px] text-neutral-400">Bring members together into topic groups</p>
        </div>
      </div>

      {/* Clean Empty State */}
      <div className="p-8 rounded-3xl bg-[#161619] border border-neutral-800/80 text-center flex flex-col items-center justify-center my-6">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-500 flex items-center justify-center mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">No communities yet</h3>
        <p className="text-xs text-neutral-400 max-w-xs mb-5 leading-relaxed">
          Communities allow you to organize related groups and send announcements to all members at once.
        </p>
        <button
          onClick={() => alert("New Community: Name your community and add topic groups.")}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-950 active:scale-95 transition cursor-pointer"
        >
          Start a Community
        </button>
      </div>
    </div>
  );
};

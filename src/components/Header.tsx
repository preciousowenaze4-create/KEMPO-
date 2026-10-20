import React from 'react';
import { Camera, Plus, MoreHorizontal } from 'lucide-react';

interface HeaderProps {
  onOpenMenu: () => void;
  onOpenNewChat: () => void;
  onOpenCamera: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMenu,
  onOpenNewChat,
  onOpenCamera,
}) => {
  return (
    <div className="px-4 pt-[max(env(safe-area-inset-top),10px)] pb-1.5 flex flex-col gap-1 select-none shrink-0">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        {/* Left '...' more button */}
        <button
          onClick={onOpenMenu}
          aria-label="More options"
          className="w-10 h-10 rounded-full bg-[#1c1c1e] text-neutral-200 hover:text-white hover:bg-neutral-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
        >
          <MoreHorizontal className="w-5 h-5 text-neutral-300" />
        </button>

        {/* Right actions: Camera + Red '+' button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCamera}
            aria-label="Camera"
            className="w-10 h-10 rounded-full bg-[#1c1c1e] text-neutral-200 hover:text-white hover:bg-neutral-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
          >
            <Camera className="w-5 h-5 text-neutral-200" />
          </button>

          {/* Red '+' New Chat button */}
          <button
            onClick={onOpenNewChat}
            aria-label="New chat"
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 flex items-center justify-center transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Large Title: "Chats" shifted up with balanced spacing */}
      <div className="pt-0.5">
        <h1 className="text-[32px] font-extrabold tracking-tight text-white leading-tight">
          Chats
        </h1>
      </div>
    </div>
  );
};

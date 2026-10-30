import React from 'react';
import { X, MessageCircle, Phone, Video, Info } from 'lucide-react';
import { Chat } from '../types';

interface ProfilePhotoModalProps {
  chat: Chat | null;
  onClose: () => void;
  onOpenChat?: (chat: Chat) => void;
  onStartCall?: (chat: Chat, isVideo: boolean) => void;
  onViewInfo?: (chat: Chat) => void;
}

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  chat,
  onClose,
  onOpenChat,
  onStartCall,
  onViewInfo,
}) => {
  if (!chat) return null;

  const isOwner =
    (chat.email && chat.email.toLowerCase() === 'preciousowenaze4@gmail.com') ||
    chat.id === 'kempo-owner-account';

  const avatar = chat.avatarUrl || '';
  const initial = (chat.name || 'K').trim().charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs sm:max-w-sm rounded-2xl overflow-hidden bg-[#18181c] border border-neutral-800 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with name and close */}
        <div className="h-12 px-4 bg-[#121215] flex items-center justify-between border-b border-neutral-800/80">
          <h3 className="text-[16px] font-bold text-white truncate">{chat.name}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Large Profile Picture (WhatsApp square style) */}
        <div className="relative w-full aspect-square bg-[#0d0d10] flex items-center justify-center overflow-hidden">
          {avatar ? (
            <img
              src={avatar}
              alt={chat.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-900 flex items-center justify-center text-white font-extrabold text-7xl select-none">
              {initial}
            </div>
          )}

          {/* Online indicator badge */}
          {chat.online && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-emerald-500/50 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </div>
          )}
        </div>

        {/* WhatsApp-Style Action Bottom Bar */}
        <div className="h-13 bg-[#16161a] border-t border-neutral-800 flex items-center justify-around px-2 text-red-500">
          <button
            onClick={() => {
              onClose();
              onOpenChat?.(chat);
            }}
            title="Message"
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800/50 active:scale-95 transition cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            onClick={() => {
              onClose();
              onStartCall?.(chat, false);
            }}
            title="Voice Call"
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800/50 active:scale-95 transition cursor-pointer"
          >
            <Phone className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            onClick={() => {
              onClose();
              onStartCall?.(chat, true);
            }}
            title="Video Call"
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800/50 active:scale-95 transition cursor-pointer"
          >
            <Video className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            onClick={() => {
              onClose();
              onViewInfo?.(chat);
            }}
            title="Contact Info"
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-neutral-800/50 active:scale-95 transition cursor-pointer"
          >
            <Info className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </div>
  );
};

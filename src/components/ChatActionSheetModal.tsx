import React from 'react';
import {
  X,
  BellOff,
  Bell,
  Info,
  Lock,
  Heart,
  FolderPlus,
  XCircle,
  Ban,
  Trash2,
  Check,
} from 'lucide-react';
import { Chat } from '../types';

interface ChatActionSheetModalProps {
  chat: Chat | null;
  isOpen: boolean;
  onClose: () => void;
  onMuteToggle?: (chatId: string) => void;
  onContactInfo?: (chat: Chat) => void;
  onLockToggle?: (chatId: string) => void;
  onFavoriteToggle?: (chatId: string) => void;
  onAddToList?: (chat: Chat) => void;
  onClearChat?: (chatId: string) => void;
  onBlockContact?: (chat: Chat) => void;
  onDeleteChat?: (chatId: string) => void;
}

export const ChatActionSheetModal: React.FC<ChatActionSheetModalProps> = ({
  chat,
  isOpen,
  onClose,
  onMuteToggle,
  onContactInfo,
  onLockToggle,
  onFavoriteToggle,
  onAddToList,
  onClearChat,
  onBlockContact,
  onDeleteChat,
}) => {
  if (!isOpen || !chat) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-end justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#16161e] border border-white/15 rounded-3xl p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Header: Avatar, Name, Close Button */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-red-950/40 border border-red-500/30 overflow-hidden flex items-center justify-center font-bold text-white shrink-0">
              {chat.avatarUrl ? (
                <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" />
              ) : (
                chat.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-bold text-white truncate">{chat.name}</h4>
              <p className="text-xs text-neutral-400 truncate">{chat.kempoId || 'Kempo Pro Contact'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Group 1: General Actions */}
        <div className="rounded-2xl bg-[#1e1e28] border border-white/10 divide-y divide-white/10 overflow-hidden">
          {/* Mute */}
          <button
            onClick={() => {
              onMuteToggle?.(chat.id);
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-neutral-200 hover:bg-white/5 active:bg-white/10 transition cursor-pointer text-left"
          >
            <span className="text-sm font-medium">Mute notifications</span>
            <BellOff className="w-4.5 h-4.5 text-neutral-400" />
          </button>

          {/* Contact info */}
          <button
            onClick={() => {
              onContactInfo?.(chat);
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-neutral-200 hover:bg-white/5 active:bg-white/10 transition cursor-pointer text-left"
          >
            <span className="text-sm font-medium">Contact info</span>
            <Info className="w-4.5 h-4.5 text-neutral-400" />
          </button>

          {/* Lock chat */}
          <button
            onClick={() => {
              onLockToggle?.(chat.id);
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-neutral-200 hover:bg-white/5 active:bg-white/10 transition cursor-pointer text-left"
          >
            <span className="text-sm font-medium">Lock chat</span>
            <Lock className="w-4.5 h-4.5 text-neutral-400" />
          </button>

          {/* Add to Favourites */}
          <button
            onClick={() => {
              onFavoriteToggle?.(chat.id);
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-neutral-200 hover:bg-white/5 active:bg-white/10 transition cursor-pointer text-left"
          >
            <span className="text-sm font-medium">
              {chat.isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
            </span>
            <Heart
              className={`w-4.5 h-4.5 ${
                chat.isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-400'
              }`}
            />
          </button>

          {/* Add to list */}
          <button
            onClick={() => {
              onAddToList?.(chat);
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-neutral-200 hover:bg-white/5 active:bg-white/10 transition cursor-pointer text-left"
          >
            <span className="text-sm font-medium">Add to list</span>
            <FolderPlus className="w-4.5 h-4.5 text-neutral-400" />
          </button>

          {/* Clear chat */}
          <button
            onClick={() => {
              onClearChat?.(chat.id);
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-neutral-200 hover:bg-white/5 active:bg-white/10 transition cursor-pointer text-left"
          >
            <span className="text-sm font-medium">Clear chat</span>
            <XCircle className="w-4.5 h-4.5 text-neutral-400" />
          </button>
        </div>

        {/* Group 2: Destructive Actions */}
        <div className="rounded-2xl bg-[#1e1e28] border border-white/10 divide-y divide-white/10 overflow-hidden">
          {/* Block */}
          <button
            onClick={() => {
              onBlockContact?.(chat);
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-red-400 hover:bg-red-950/20 active:bg-red-900/30 transition cursor-pointer text-left font-medium"
          >
            <span className="text-sm">Block {chat.name}</span>
            <Ban className="w-4.5 h-4.5 text-red-400" />
          </button>

          {/* Delete chat */}
          <button
            onClick={() => {
              onDeleteChat?.(chat.id);
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-red-400 hover:bg-red-950/20 active:bg-red-900/30 transition cursor-pointer text-left font-medium"
          >
            <span className="text-sm">Delete chat</span>
            <Trash2 className="w-4.5 h-4.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Check, CheckCheck, Sticker, User } from 'lucide-react';
import { Chat } from '../types';

interface ChatListItemProps {
  chat: Chat;
  onClick: () => void;
  onAvatarClick?: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  onClick,
  onAvatarClick,
}) => {
  const isUnread = (chat.unreadCount || 0) > 0;

  return (
    <div
      onClick={onClick}
      className="w-full px-4 py-2.5 flex items-center gap-3.5 hover:bg-[#151518] active:bg-[#1c1c1f] transition cursor-pointer select-none border-b border-neutral-900/40"
    >
      {/* Avatar Container with Status Ring if any */}
      <div
        className="relative shrink-0"
        onClick={(e) => {
          if (chat.hasStatusStory && onAvatarClick) {
            e.stopPropagation();
            onAvatarClick();
          }
        }}
      >
        <div
          className={`w-[54px] h-[54px] rounded-full flex items-center justify-center p-[2px] ${
            chat.hasStatusStory
              ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-black'
              : chat.accentRing === 'purple'
              ? 'ring-1.5 ring-purple-500/70'
              : ''
          }`}
        >
          {chat.avatarType === 'photo' && chat.avatarUrl ? (
            <img
              src={chat.avatarUrl}
              alt={chat.name}
              className="w-full h-full rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-bold text-white text-base select-none"
              style={{ backgroundColor: chat.avatarBg || '#1c1c1e' }}
            >
              {chat.name ? (
                <span>{chat.name.trim().charAt(0).toUpperCase()}</span>
              ) : (
                <User className="w-6 h-6 text-neutral-300" />
              )}
            </div>
          )}
        </div>

        {/* Small active online dot if applicable */}
        {chat.online && !chat.hasStatusStory && (
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-red-500 ring-2 ring-black" />
        )}
      </div>

      {/* Main Content: Name, Last Message, Time, Badges */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Top row: Name & Timestamp */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h2 className="text-[16.5px] font-semibold text-white truncate tracking-tight">
            {chat.name}
          </h2>
          <span
            className={`text-[12.5px] font-medium shrink-0 ${
              isUnread ? 'text-red-500 font-semibold' : 'text-neutral-400'
            }`}
          >
            {chat.timestamp}
          </span>
        </div>

        {/* Bottom row: Message preview with checkmarks/reactions & Unread badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 text-[14.5px] text-neutral-400 truncate">
            {/* Checkmark Status Icons */}
            {chat.lastMessageStatus === 'single_tick' && (
              <Check className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2.2]" />
            )}
            {chat.lastMessageStatus === 'double_tick_grey' && (
              <CheckCheck className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
            )}
            {chat.lastMessageStatus === 'double_tick_blue' && (
              <CheckCheck className="w-4 h-4 text-[#38bdf8] shrink-0 stroke-[2]" />
            )}

            {/* Sticker icon prefix */}
            {chat.lastMessagePrefix === 'sticker' && (
              <div className="flex items-center gap-1 shrink-0 text-neutral-300">
                <Sticker className="w-4 h-4 text-neutral-400" />
              </div>
            )}

            {/* Reaction prefix */}
            {chat.lastMessagePrefix === 'reaction' && (
              <span className="truncate">{chat.lastMessage}</span>
            )}

            {/* Standard text preview */}
            {chat.lastMessagePrefix !== 'reaction' && (
              <span className="truncate">{chat.lastMessage}</span>
            )}
          </div>

          {/* Red unread badge matching user's requested red theme */}
          {isUnread && (
            <div className="w-[20px] h-[20px] rounded-full bg-red-600 text-white text-[11.5px] font-bold flex items-center justify-center shrink-0 shadow-sm shadow-red-900/60">
              {chat.unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

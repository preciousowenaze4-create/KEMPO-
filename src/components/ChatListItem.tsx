import React, { useState, useRef } from 'react';
import {
  Check,
  CheckCheck,
  Sticker,
  User,
  Clock,
  MoreHorizontal,
  Archive,
} from 'lucide-react';
import { Chat } from '../types';
import { isOwnerIdFormat } from '../lib/accountRules';

interface ChatListItemProps {
  chat: Chat;
  onClick: () => void;
  onAvatarClick?: () => void;
  onMore?: (chat: Chat) => void;
  onArchive?: (chatId: string) => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  onClick,
  onAvatarClick,
  onMore,
  onArchive,
}) => {
  const isUnread = (chat.unreadCount || 0) > 0;
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Check if contact is official owner
  const isOwner =
    isOwnerIdFormat(chat.kempoId) ||
    (chat.kempoId && chat.kempoId.toLowerCase() === 'kempo pro owner') ||
    chat.id === 'kempo-owner-account';

  // Format real registered display name (avoid showing raw ID strings as title)
  const rawName = chat.name || '';
  const isNameAnId =
    rawName.toLowerCase().startsWith('kempo pro +') ||
    rawName.toLowerCase().startsWith('kempo pro') ||
    rawName.includes('+234');
  const displayTitle =
    !isNameAnId && rawName.trim()
      ? rawName.trim()
      : isOwner
      ? 'Precious Ddkid'
      : 'Kempo Contact';

  const initialLetter = (displayTitle || 'K').charAt(0).toUpperCase();

  // Touch Swipe handlers matching iOS WhatsApp behavior (IMG_4777)
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);

    // Long press to open More menu
    longPressTimer.current = setTimeout(() => {
      onMore?.(chat);
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Only allow swiping left (negative diff) up to -140px
    if (diff < 0) {
      setTranslateX(Math.max(diff, -140));
    } else if (translateX < 0) {
      setTranslateX(Math.min(0, translateX + diff));
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setIsSwiping(false);
    if (translateX < -50) {
      setTranslateX(-130); // Snap open actions
    } else {
      setTranslateX(0); // Snap closed
    }
  };

  const handleRowClick = () => {
    if (translateX !== 0) {
      setTranslateX(0);
      return;
    }
    onClick();
  };

  return (
    <div className="relative overflow-hidden w-full select-none border-b border-neutral-900/40 bg-black">
      {/* Background Swipe Actions matching IMG_4777 (More in Gray, Archive in Green) */}
      <div className="absolute inset-y-0 right-0 flex items-stretch z-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTranslateX(0);
            onMore?.(chat);
          }}
          className="w-16 bg-[#545458] hover:bg-[#636366] text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer active:brightness-110"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[11px] font-medium">More</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTranslateX(0);
            onArchive?.(chat.id);
          }}
          className="w-16 bg-[#168755] hover:bg-[#1a9a62] text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer active:brightness-110"
        >
          <Archive className="w-5 h-5" />
          <span className="text-[11px] font-medium">Archive</span>
        </button>
      </div>

      {/* Main Foreground Item */}
      <div
        onClick={handleRowClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          onMore?.(chat);
        }}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.22s ease-out',
        }}
        className="relative z-10 w-full px-4 py-2.5 flex items-center gap-3.5 bg-black hover:bg-[#121215] active:bg-[#18181c] cursor-pointer"
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
            {chat.avatarUrl ? (
              <img
                src={chat.avatarUrl}
                alt={displayTitle}
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            ) : isOwner ? (
              <img
                src="/pwa-512x512.png"
                alt="Owner"
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-red-600 via-red-800 to-red-950 flex items-center justify-center text-white font-bold text-base select-none shadow-inner">
                {initialLetter}
              </div>
            )}
          </div>

          {/* Active online dot if applicable */}
          {chat.online && !chat.hasStatusStory && (
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-red-500 ring-2 ring-black" />
          )}
        </div>

        {/* Main Content: Name, Last Message, Time, Badges */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Top row: Name & Timestamp */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h2 className="text-[16.5px] font-semibold text-white truncate tracking-tight">
              {displayTitle}
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
              {chat.lastMessageStatus === 'pending_clock' && (
                <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0 animate-pulse" />
              )}
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

              {/* Standard text preview */}
              <span className="truncate">{chat.lastMessage}</span>
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
    </div>
  );
};

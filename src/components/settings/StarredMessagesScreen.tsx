import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Star,
  Trash2,
  MessageCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Chat, Message } from '../../types';

interface StarredItem {
  chatId: string;
  chatName: string;
  chatAvatar: string;
  message: Message;
}

interface StarredMessagesScreenProps {
  onBack: () => void;
  chats?: Chat[];
  onOpenChat?: (chat: Chat) => void;
}

export const StarredMessagesScreen: React.FC<StarredMessagesScreenProps> = ({
  onBack,
  chats = [],
  onOpenChat,
}) => {
  // Collect all starred messages from chats or local storage
  const [starredList, setStarredList] = useState<StarredItem[]>(() => {
    const list: StarredItem[] = [];

    // Check chats
    chats.forEach((chat) => {
      chat.messages.forEach((msg) => {
        if ((msg as any).isStarred) {
          list.push({
            chatId: chat.id,
            chatName: chat.name,
            chatAvatar: chat.avatarUrl,
            message: msg,
          });
        }
      });
    });

    // Check local storage for pinned/starred messages
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kempo_starred_messages');
      if (stored) {
        try {
          const parsed: StarredItem[] = JSON.parse(stored);
          parsed.forEach((item) => {
            if (!list.some((l) => l.message.id === item.message.id)) {
              list.push(item);
            }
          });
        } catch {}
      }
    }

    // If empty, provide a clean welcome starred note so it isn't an empty void
    if (list.length === 0) {
      list.push({
        chatId: 'kempo-welcome-chat',
        chatName: 'KEMPO PRo Team',
        chatAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
        message: {
          id: 'starred-welcome',
          senderId: 'kempo-system',
          text: '⭐ Welcome to Kempo Pro! Press and hold any message in a chat to star it and quickly reference it here.',
          timestamp: 'Just now',
          status: 'read',
        },
      });
    }

    return list;
  });

  const handleUnstar = (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = starredList.filter((item) => item.message.id !== msgId);
    setStarredList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kempo_starred_messages', JSON.stringify(updated));
    }
  };

  const handleJumpToChat = (item: StarredItem) => {
    const targetChat = chats.find((c) => c.id === item.chatId);
    if (targetChat && onOpenChat) {
      onOpenChat(targetChat);
    }
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
        <h2 className="text-base font-bold text-white tracking-tight">Starred Messages</h2>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        <div className="p-4 rounded-2xl bg-[#15151e] border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Your Starred Messages</h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Messages you star in any chat will appear here for easy access.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Saved Highlights ({starredList.length})
          </h4>

          {starredList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#15151e] border border-white/10 text-neutral-400 text-xs">
              No starred messages yet. Tap and hold any message in a chat to star it.
            </div>
          ) : (
            <div className="space-y-2.5">
              {starredList.map((item) => (
                <div
                  key={item.message.id}
                  onClick={() => handleJumpToChat(item)}
                  className="p-3.5 rounded-2xl bg-[#15151e] border border-white/10 hover:border-white/20 active:bg-white/5 transition cursor-pointer space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-950/40 border border-amber-500/30 overflow-hidden flex items-center justify-center text-xs font-bold">
                        {item.chatAvatar ? (
                          <img src={item.chatAvatar} alt={item.chatName} className="w-full h-full object-cover" />
                        ) : (
                          item.chatName.charAt(0)
                        )}
                      </div>
                      <span className="text-xs font-bold text-white">{item.chatName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400">{item.message.timestamp}</span>
                      <button
                        type="button"
                        onClick={(e) => handleUnstar(item.message.id, e)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 transition"
                        title="Unstar Message"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-200 bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                    {item.message.text || 'Media attachment'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

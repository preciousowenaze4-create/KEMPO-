import React, { useState } from 'react';
import {
  ChevronLeft,
  Radio,
  Send,
  Check,
  Users,
  Search,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Chat } from '../../types';

interface BroadcastScreenProps {
  onBack: () => void;
  chats?: Chat[];
  onSendMessage?: (chatId: string, text: string) => void;
}

export const BroadcastScreen: React.FC<BroadcastScreenProps> = ({
  onBack,
  chats = [],
  onSendMessage,
}) => {
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentToast, setSentToast] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.kempoId && c.kempoId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleChat = (id: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedChatIds.length === chats.length) {
      setSelectedChatIds([]);
    } else {
      setSelectedChatIds(chats.map((c) => c.id));
    }
  };

  const handleSendBroadcast = () => {
    if (!messageText.trim() || selectedChatIds.length === 0) return;

    selectedChatIds.forEach((chatId) => {
      onSendMessage?.(chatId, `📢 [Broadcast]: ${messageText.trim()}`);
    });

    setSentCount(selectedChatIds.length);
    setSentToast(true);
    setMessageText('');
    setSelectedChatIds([]);
    setTimeout(() => setSentToast(false), 3000);
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
        <div className="text-center">
          <h2 className="text-base font-bold text-white tracking-tight">New Broadcast</h2>
          <span className="text-[11px] text-neutral-400">
            {selectedChatIds.length} of {chats.length} selected
          </span>
        </div>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28">
        {/* Info Banner */}
        <div className="p-4 rounded-2xl bg-[#15151e] border border-white/10 space-y-1.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Broadcast Announcements</h3>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Only contacts who have your permanent Kempo ID saved will receive your broadcast message in their direct chat.
          </p>
        </div>

        {/* Message Input Box */}
        <div className="p-4 rounded-2xl bg-[#15151e] border border-white/10 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
            Compose Announcement
          </label>
          <textarea
            rows={3}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type message to broadcast to all selected contacts..."
            className="w-full p-3 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
          />
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span>{messageText.length} characters</span>
            <button
              type="button"
              onClick={handleSendBroadcast}
              disabled={!messageText.trim() || selectedChatIds.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-950/70 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Broadcast ({selectedChatIds.length})</span>
            </button>
          </div>
        </div>

        {/* Recipient Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Select Recipients
            </h4>
            {chats.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-red-400 hover:text-red-300 transition cursor-pointer"
              >
                {selectedChatIds.length === chats.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {/* Search bar */}
          {chats.length > 3 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#15151e] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>
          )}

          {chats.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-[#15151e] border border-white/10 text-neutral-400 text-xs">
              No contacts available to broadcast to. Add contacts using their unique Kempo ID.
            </div>
          ) : (
            <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
              {filteredChats.map((chat) => {
                const isSelected = selectedChatIds.includes(chat.id);
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleToggleChat(chat.id)}
                    className="p-3.5 flex items-center justify-between hover:bg-white/5 active:bg-white/10 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-950/40 border border-purple-500/30 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                        {chat.avatarUrl ? (
                          <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" />
                        ) : (
                          chat.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white">{chat.name}</span>
                        <p className="text-xs text-neutral-400">{chat.kempoId || 'Kempo Contact'}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected ? 'bg-red-600 border-red-500 text-white' : 'border-white/30'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {sentToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 to-purple-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <Sparkles className="w-4 h-4" />
          <span>Broadcast dispatched to {sentCount} recipients!</span>
        </div>
      )}
    </div>
  );
};

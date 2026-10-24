import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  List as ListIcon,
  Plus,
  Trash2,
  Users,
  Check,
  Star,
  Tag,
  Search,
} from 'lucide-react';
import { Chat } from '../../types';

interface ListsScreenProps {
  onBack: () => void;
  chats?: Chat[];
  onOpenChat?: (chat: Chat) => void;
}

interface ContactList {
  id: string;
  name: string;
  description: string;
  color: string;
  memberIds: string[];
}

const DEFAULT_LISTS: ContactList[] = [
  {
    id: 'list-vip',
    name: 'VIP Inner Circle',
    description: 'Favorite contacts and priority direct messages',
    color: '#ef4444',
    memberIds: [],
  },
  {
    id: 'list-family',
    name: 'Family & Close Friends',
    description: 'Personal circle and immediate family',
    color: '#3b82f6',
    memberIds: [],
  },
  {
    id: 'list-work',
    name: 'Work & Projects',
    description: 'Colleagues, clients, and technical collaborations',
    color: '#10b981',
    memberIds: [],
  },
  {
    id: 'list-gaming',
    name: 'Gaming & Devs Squad',
    description: 'Gaming tournaments and software engineering channels',
    color: '#8b5cf6',
    memberIds: [],
  },
];

export const ListsScreen: React.FC<ListsScreenProps> = ({ onBack, chats = [], onOpenChat }) => {
  const [lists, setLists] = useState<ContactList[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kempo_contact_lists');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return DEFAULT_LISTS;
  });

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#ef4444');
  const [newListDesc, setNewListDesc] = useState('');

  const saveLists = (updated: ContactList[]) => {
    setLists(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kempo_contact_lists', JSON.stringify(updated));
    }
  };

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    const newList: ContactList = {
      id: `list-${Date.now()}`,
      name: newListName.trim(),
      description: newListDesc.trim() || 'Custom contact list',
      color: newListColor,
      memberIds: [],
    };
    saveLists([...lists, newList]);
    setNewListName('');
    setNewListDesc('');
    setShowNewModal(false);
  };

  const handleDeleteList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveLists(lists.filter((l) => l.id !== id));
    if (activeListId === id) setActiveListId(null);
  };

  const handleToggleMember = (listId: string, chatId: string) => {
    const updated = lists.map((l) => {
      if (l.id !== listId) return l;
      const exists = l.memberIds.includes(chatId);
      return {
        ...l,
        memberIds: exists ? l.memberIds.filter((id) => id !== chatId) : [...l.memberIds, chatId],
      };
    });
    saveLists(updated);
  };

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d12] text-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur-md sticky top-0 z-10 pt-[max(env(safe-area-inset-top),14px)]">
        <button
          onClick={activeListId ? () => setActiveListId(null) : onBack}
          className="flex items-center gap-1.5 text-red-400 hover:text-red-300 active:scale-95 transition cursor-pointer font-medium text-sm"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>{activeListId ? 'All Lists' : 'Settings'}</span>
        </button>
        <h2 className="text-base font-bold text-white tracking-tight">
          {activeList ? activeList.name : 'Lists'}
        </h2>
        {!activeListId ? (
          <button
            onClick={() => setShowNewModal(true)}
            className="w-8 h-8 rounded-full bg-red-600/30 border border-red-500/40 text-red-400 flex items-center justify-center hover:bg-red-600/50 active:scale-95 transition cursor-pointer"
            title="Create New List"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {!activeListId ? (
          <>
            <div className="p-4 rounded-2xl bg-[#15151e] border border-white/10 space-y-1.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListIcon className="w-4 h-4 text-sky-400" />
                <span>Custom Contact Lists</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Use lists to quickly organize your contacts and filter your chat feed into dedicated categories.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
                Your Lists ({lists.length})
              </h4>
              <div className="space-y-2">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => setActiveListId(list.id)}
                    className="p-3.5 rounded-2xl bg-[#15151e] border border-white/10 hover:border-white/20 active:bg-white/5 transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                        style={{ backgroundColor: `${list.color}33`, borderColor: `${list.color}66`, borderWidth: 1 }}
                      >
                        <Tag className="w-5 h-5" style={{ color: list.color }} />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">{list.name}</h5>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {list.memberIds.length === 1
                            ? '1 contact'
                            : `${list.memberIds.length} contacts`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className="p-2 rounded-lg text-neutral-400 hover:text-red-400 active:scale-95 transition"
                        title="Delete List"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Active List Member Management */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#15151e] border border-white/10 space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeList?.color }}></span>
                <span>{activeList?.name}</span>
              </h3>
              <p className="text-xs text-neutral-400">{activeList?.description}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
                Select Contacts in this List
              </h4>

              {chats.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-[#15151e] border border-white/10 text-neutral-400 text-xs">
                  No contacts found in your chats yet. Connect with users to add them to this list.
                </div>
              ) : (
                <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
                  {chats.map((chat) => {
                    const isMember = activeList?.memberIds.includes(chat.id);
                    return (
                      <div
                        key={chat.id}
                        onClick={() => handleToggleMember(activeList!.id, chat.id)}
                        className="p-3.5 flex items-center justify-between hover:bg-white/5 active:bg-white/10 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-950/40 border border-red-500/30 overflow-hidden flex items-center justify-center text-xs font-bold">
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
                            isMember ? 'bg-red-600 border-red-500 text-white' : 'border-white/30'
                          }`}
                        >
                          {isMember && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#181822] border border-white/15 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create New List</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">List Name</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Clients, Crypto Team..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short note about this list"
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Tag Color</label>
                <div className="flex items-center gap-2">
                  {['#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewListColor(c)}
                      className={`w-7 h-7 rounded-full transition cursor-pointer ${
                        newListColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-red-950/70 cursor-pointer disabled:opacity-40"
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

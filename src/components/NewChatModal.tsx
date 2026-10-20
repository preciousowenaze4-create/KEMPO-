import React, { useState } from 'react';
import { X, Search, Users, UserPlus, UsersRound, Key, Loader2, Check, AlertCircle } from 'lucide-react';
import { Chat } from '../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Chat[];
  onSelectContact: (chat: Chat) => void;
  onAddNewContact: (name: string, phone: string) => void;
  onAddContactById?: (kempoId: string) => Promise<Chat | null>;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onSelectContact,
  onAddNewContact,
  onAddContactById,
}) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showIdForm, setShowIdForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [targetId, setTargetId] = useState('');
  const [isSearchingId, setIsSearchingId] = useState(false);
  const [idFeedback, setIdFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddNewContact(newName.trim(), newPhone.trim() || '+1 (555) 000-0000');
    setNewName('');
    setNewPhone('');
    setShowAddForm(false);
    onClose();
  };

  const handleConnectById = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim() || !onAddContactById) return;

    setIsSearchingId(true);
    setIdFeedback(null);

    try {
      const foundChat = await onAddContactById(targetId.trim());
      if (foundChat) {
        onSelectContact(foundChat);
        onClose();
      } else {
        setIdFeedback(`User ID "${targetId.trim().toUpperCase()}" not found.`);
      }
    } catch (err: any) {
      setIdFeedback(err.message || 'Lookup failed.');
    } finally {
      setIsSearchingId(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md select-none animate-in fade-in">
      {/* Top Header */}
      <div className="h-14 px-4 bg-[#161619] border-b border-neutral-800 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-bold text-white">New Chat</h2>
        <button
          onClick={onClose}
          className="text-red-500 font-semibold text-sm hover:text-red-400 p-1 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-[#111114] border-b border-neutral-850">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1c1c1f] text-neutral-300">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or ID"
            className="w-full bg-transparent text-sm text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-900">
        {/* Quick Actions */}
        <div className="py-2 space-y-1">
          {/* Action 1: Add by User ID */}
          <button
            onClick={() => {
              setShowIdForm(!showIdForm);
              setShowAddForm(false);
            }}
            className="w-full px-3 py-2.5 flex items-center gap-3.5 rounded-xl hover:bg-[#18181c] transition text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-white">Connect by KEMPO User ID</h4>
              <p className="text-[12px] text-neutral-400">Add friends directly via their unique ID</p>
            </div>
          </button>

          {/* Form: Add by ID */}
          {showIdForm && (
            <form onSubmit={handleConnectById} className="p-3 bg-[#18181c] rounded-xl my-2 space-y-2 border border-red-900/50">
              <input
                type="text"
                placeholder="Enter KEMPO-XXXXXX"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 rounded-lg bg-[#222228] text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-red-500 uppercase"
              />
              {idFeedback && (
                <div className="text-xs text-red-400 flex items-center gap-1.5 py-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{idFeedback}</span>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowIdForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSearchingId || !targetId.trim()}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {isSearchingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Connect & Message</span>}
                </button>
              </div>
            </form>
          )}

          {/* Action 2: New Contact with Phone */}
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowIdForm(false);
            }}
            className="w-full px-3 py-2.5 flex items-center gap-3.5 rounded-xl hover:bg-[#18181c] transition text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-white">New Contact</h4>
              <p className="text-[12px] text-neutral-400">Save by custom name and phone</p>
            </div>
          </button>

          {showAddForm && (
            <form onSubmit={handleCreateContact} className="p-3 bg-[#18181c] rounded-xl my-2 space-y-2 border border-neutral-750">
              <input
                type="text"
                placeholder="Full Name (e.g. David King)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-[#222228] text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <input
                type="tel"
                placeholder="Phone Number (e.g. +1 555-123-4567)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#222228] text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 cursor-pointer"
                >
                  Save & Message
                </button>
              </div>
            </form>
          )}

          <button
            onClick={() => alert("New Group feature: Select members to create group")}
            className="w-full px-3 py-2.5 flex items-center gap-3.5 rounded-xl hover:bg-[#18181c] transition text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-white">New Group</h4>
              <p className="text-[12px] text-neutral-400">Chat with multiple friends</p>
            </div>
          </button>
        </div>

        {/* Contacts section */}
        <div className="py-2">
          <span className="text-[12px] font-semibold uppercase text-neutral-400 px-3 tracking-wider">
            Contacts on KEMPO PRo
          </span>
          <div className="mt-2 space-y-1">
            {filtered.length > 0 ? (
              filtered.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => {
                    onSelectContact(contact);
                    onClose();
                  }}
                  className="px-3 py-2.5 flex items-center gap-3.5 rounded-xl hover:bg-[#18181c] cursor-pointer transition"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0">
                    {contact.avatarUrl ? (
                      <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-base text-white bg-neutral-700">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-semibold text-white truncate">{contact.name}</h4>
                    <p className="text-[12px] text-neutral-400 truncate">{contact.phoneNumber || contact.lastMessage}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-neutral-500">
                No contacts found. Tap "Connect by KEMPO User ID" or "New Contact" to start chatting!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

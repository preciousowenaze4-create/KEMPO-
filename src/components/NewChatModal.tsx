import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Users,
  UserPlus,
  UsersRound,
  Megaphone,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Chat, UserProfileData } from '../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Chat[];
  onSelectContact: (chat: Chat) => void;
  onOpenNewContact: () => void;
  currentUserProfile?: UserProfileData | null;
  onOpenSelfChat?: () => void;
  onAddContactById?: (kempoId: string, customName?: string) => Promise<Chat | null>;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onSelectContact,
  onOpenNewContact,
  currentUserProfile,
  onOpenSelfChat,
}) => {
  const [search, setSearch] = useState('');

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    const valid = contacts.filter((c) => {
      if (!c.id || (c.id === 'kempo-owner-account' && !c.messages?.length)) return false;
      return true;
    });

    if (!search.trim()) return valid;

    const q = search.toLowerCase().trim();
    return valid.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phoneNumber || '').toLowerCase();
      const id = (c.kempoId || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || id.includes(q) || email.includes(q);
    });
  }, [contacts, search]);

  // Frequently contacted (top contacts with recent messages)
  const frequentlyContacted = useMemo(() => {
    return filteredContacts.slice(0, 5);
  }, [filteredContacts]);

  // Group contacts alphabetically
  const groupedContacts = useMemo(() => {
    const groups: Record<string, Chat[]> = {};
    filteredContacts.forEach((contact) => {
      const name = contact.name || 'Contact';
      const firstChar = name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(contact);
    });
    return groups;
  }, [filteredContacts]);

  if (!isOpen) return null;

  const currentUserName = currentUserProfile?.displayName || 'You';
  const currentUserAvatar = currentUserProfile?.avatarUrl || '';

  const scrollToLetter = (letter: string) => {
    const el = document.getElementById(`section-letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200">
      {/* Red-themed iOS WhatsApp Sheet Container */}
      <div className="w-full h-[94vh] max-h-[890px] bg-[#0c0c0e] rounded-t-[24px] flex flex-col overflow-hidden shadow-2xl border-t border-red-900/40 animate-in slide-in-from-bottom duration-250 relative">
        
        {/* Top Header Bar */}
        <div className="h-14 px-4 bg-[#141417] border-b border-red-950/50 flex items-center justify-between shrink-0 relative">
          <div className="w-8" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              New chat
            </h2>
          </div>
          {/* Circular close button with red hover */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new chat"
            className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-red-600 text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Search Bar with red focus glow */}
        <div className="px-4 py-2.5 bg-[#0c0c0e] shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181b] border border-neutral-800 focus-within:border-red-600/70 focus-within:ring-1 focus-within:ring-red-600/30 text-white transition">
            <Search className="w-4 h-4 text-red-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, number, @username"
              className="w-full bg-transparent text-[15px] text-white placeholder:text-neutral-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="w-4 h-4 rounded-full bg-neutral-700 hover:bg-red-600 text-white flex items-center justify-center text-[10px]"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Body with A-Z strip */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4 relative">
          
          {/* Group 1: REDESIGNED "NEW CONTACT" RED SECTION */}
          <div className="rounded-2xl overflow-hidden shadow-xl border border-neutral-800 bg-[#161619] divide-y divide-neutral-800/80">
            
            {/* 1. New contact: RED COLOR & SPECIAL HIGHLIGHT AS REQUESTED */}
            <button
              type="button"
              onClick={onOpenNewContact}
              className="w-full px-4 py-3.5 flex items-center justify-between bg-gradient-to-r from-red-950/80 via-red-900/30 to-[#18181b] hover:from-red-900/90 hover:via-red-800/40 hover:to-[#20181b] border-b border-red-700/50 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-950/80 group-hover:scale-105 transition">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[16.5px] font-bold text-white tracking-tight">
                      New contact
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm shadow-red-900/60">
                      Red Color
                    </span>
                  </div>
                  <p className="text-[12.5px] text-red-300 font-medium truncate flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-red-400" />
                    <span>Search, verify &amp; connect by Kempo Pro ID</span>
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400 shrink-0 group-hover:translate-x-0.5 transition" />
            </button>

            {/* 2. New group */}
            <button
              type="button"
              onClick={() => {
                alert('New group: Select members to create a group chat.');
              }}
              className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-neutral-800/60 transition text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0">
                <Users className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <span className="text-[16px] font-semibold text-white tracking-tight">
                New group
              </span>
            </button>

            {/* 3. New community */}
            <button
              type="button"
              onClick={() => {
                alert('New community: Bring members together in topic-based channels.');
              }}
              className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-neutral-800/60 transition text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0">
                <UsersRound className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <span className="text-[16px] font-semibold text-white tracking-tight">
                New community
              </span>
            </button>

            {/* 4. New broadcast */}
            <button
              type="button"
              onClick={() => {
                alert('New broadcast: Send broadcast messages to multiple contacts.');
              }}
              className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-neutral-800/60 transition text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0">
                <Megaphone className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <span className="text-[16px] font-semibold text-white tracking-tight">
                New broadcast
              </span>
            </button>
          </div>

          {/* Section: Frequently contacted (Only if real contacts exist) */}
          {frequentlyContacted.length > 0 && !search && (
            <div>
              <h3 className="text-[13.5px] font-bold text-red-400 px-1 py-1.5 tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Frequently contacted</span>
              </h3>
              <div className="bg-[#161619] rounded-2xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/80">
                {frequentlyContacted.map((c) => {
                  const savedName =
                    (typeof window !== 'undefined'
                      ? localStorage.getItem(`kempo_contact_name_${c.kempoId}`) ||
                        localStorage.getItem(`kempo_contact_name_${c.id}`)
                      : '') || c.name;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectContact(c);
                        onClose();
                      }}
                      className="px-4 py-2.5 flex items-center gap-3.5 hover:bg-neutral-800/60 transition cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 ring-1 ring-red-900/50 flex items-center justify-center shrink-0">
                        {c.avatarUrl ? (
                          <img
                            src={c.avatarUrl}
                            alt={savedName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-red-400">
                            {savedName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[15.5px] font-semibold text-white truncate">
                          {savedName}
                        </h4>
                        <p className="text-[12px] text-neutral-400 truncate">
                          {c.about || c.phoneNumber || 'Kempo Pro'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Contacts on Kempo Pro */}
          <div>
            <h3 className="text-[13.5px] font-bold text-neutral-400 px-1 py-1.5 tracking-tight">
              Contacts on Kempo Pro
            </h3>
            
            <div className="bg-[#161619] rounded-2xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/80">
              
              {/* Message Yourself Row */}
              <div
                onClick={() => {
                  if (onOpenSelfChat) {
                    onOpenSelfChat();
                  } else {
                    const selfChat: Chat = {
                      id: `self-${currentUserProfile?.id || 'me'}`,
                      name: `${currentUserName} (You)`,
                      avatarUrl: currentUserAvatar,
                      avatarBg: '#1e293b',
                      avatarType: currentUserAvatar ? 'photo' : 'initials',
                      timestamp: 'Just now',
                      lastMessage: 'Message yourself',
                      lastMessageStatus: 'none',
                      unreadCount: 0,
                      online: true,
                      about: 'Message yourself / Personal notes',
                      messages: [],
                    };
                    onSelectContact(selfChat);
                  }
                  onClose();
                }}
                className="px-4 py-2.5 flex items-center gap-3.5 hover:bg-neutral-800/60 transition cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0 ring-1.5 ring-red-600/50">
                  {currentUserAvatar ? (
                    <img
                      src={currentUserAvatar}
                      alt={currentUserName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-bold text-red-400">
                      {currentUserName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[16px] font-bold text-white truncate">
                    {currentUserName} (You)
                  </h4>
                  <p className="text-[13px] text-neutral-400 truncate">
                    Message yourself
                  </p>
                </div>
              </div>

              {/* Real Contacts List (Grouped Alphabetically, No fake people!) */}
              {Object.keys(groupedContacts).length > 0 ? (
                Object.keys(groupedContacts)
                  .sort()
                  .map((letter) => (
                    <div key={letter} id={`section-letter-${letter}`}>
                      <div className="bg-[#121215] px-4 py-1 text-[12.5px] font-bold text-red-400 border-t border-b border-neutral-800">
                        {letter}
                      </div>
                      <div className="divide-y divide-neutral-800/80">
                        {groupedContacts[letter].map((c) => {
                          const savedName =
                            (typeof window !== 'undefined'
                              ? localStorage.getItem(`kempo_contact_name_${c.kempoId}`) ||
                                localStorage.getItem(`kempo_contact_name_${c.id}`)
                              : '') || c.name;
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                onSelectContact(c);
                                onClose();
                              }}
                              className="px-4 py-2.5 flex items-center gap-3.5 hover:bg-neutral-800/60 transition cursor-pointer"
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0 ring-1 ring-neutral-700">
                                {c.avatarUrl ? (
                                  <img
                                    src={c.avatarUrl}
                                    alt={savedName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-neutral-300">
                                    {savedName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[15.5px] font-semibold text-white truncate">
                                  {savedName}
                                </h4>
                                <p className="text-[12.5px] text-neutral-400 truncate">
                                  {c.about || c.phoneNumber || 'Kempo Pro'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="p-6 text-center text-[13.5px] text-neutral-400">
                  <p className="font-semibold text-white mb-1">No contacts yet</p>
                  <p className="text-xs text-neutral-500">
                    Tap the red &ldquo;New contact&rdquo; button above to verify &amp; connect friends by their Kempo Pro ID!
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Alphabet Jump Strip on the right margin with red active letters */}
        <div className="absolute right-1 top-24 bottom-6 flex flex-col justify-center items-center gap-[2px] z-10 pointer-events-auto">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => scrollToLetter(letter)}
              className="text-[10px] font-semibold text-neutral-500 hover:text-red-500 active:text-red-400 px-1 py-[1px] leading-none cursor-pointer transition"
            >
              {letter}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

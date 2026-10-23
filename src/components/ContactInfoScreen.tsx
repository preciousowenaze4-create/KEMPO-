import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Video,
  Search,
  Image as ImageIcon,
  Star,
  Bell,
  Palette,
  Download,
  Clock,
  Shield,
  ShieldAlert,
  Lock,
  Plus,
  UserPlus,
  Share2,
  Heart,
  List,
  Trash2,
  Ban,
  Flag,
  Check,
} from 'lucide-react';
import { Chat } from '../types';

interface ContactInfoScreenProps {
  chat: Chat;
  onBack: () => void;
  onStartCall?: (chat: Chat, isVideo: boolean) => void;
  onSearchChat?: () => void;
  onClearChat?: (chatId: string) => void;
  onBlockContact?: (chatId: string) => void;
  onReportContact?: (chatId: string) => void;
}

export const ContactInfoScreen: React.FC<ContactInfoScreenProps> = ({
  chat,
  onBack,
  onStartCall,
  onSearchChat,
  onClearChat,
  onBlockContact,
  onReportContact,
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(Boolean(chat.isFavorite));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);

  // Derive permanent Kempo Pro Shareable ID
  const shareableKempoId =
    chat.kempoId ||
    (chat.about?.startsWith('KEMPO ID: ')
      ? chat.about.replace('KEMPO ID: ', '').trim()
      : '') ||
    (chat.phoneNumber ? `Kempo Pro ${chat.phoneNumber}` : `Kempo Pro +234A5738`);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleShareContact = () => {
    const text = `Contact: ${chat.name}\nKempo Pro ID: ${shareableKempoId}`;
    if (navigator.share) {
      navigator.share({
        title: chat.name,
        text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      showToast('Contact info copied to clipboard');
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    showToast(!isFavorite ? `Added ${chat.name} to Favourites` : `Removed ${chat.name} from Favourites`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e] text-white flex flex-col select-none overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2 rounded-2xl bg-[#1e1e24] border border-red-500/50 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-red-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-20 bg-[#161619]/95 backdrop-blur-md border-b border-neutral-800/80 px-4 pt-[max(env(safe-area-inset-top),10px)] pb-2 flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-red-500 hover:text-red-400 py-1 pr-2 active:opacity-70 transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          <span className="text-sm font-semibold hidden sm:inline">Back</span>
        </button>

        <h1 className="text-base font-bold text-white tracking-tight">Contact info</h1>

        <div className="w-12 flex justify-end">
          <button
            onClick={() => showToast('Contact is synced via Kempo Pro')}
            className="text-red-500 hover:text-red-400 text-sm font-semibold cursor-pointer"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4 pb-20">
        {/* 1. Top Profile Section & Quick Actions */}
        <div className="flex flex-col items-center text-center pt-2">
          {/* Centered Circular Avatar with Signature Red Ring */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-red-600/90 shadow-2xl shadow-red-950/50 bg-[#161619] flex items-center justify-center relative">
            {chat.avatarType === 'photo' && chat.avatarUrl ? (
              <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-black text-4xl"
                style={{ backgroundColor: chat.avatarBg || '#1e1e24' }}
              >
                {chat.name.charAt(0).toUpperCase()}
              </div>
            )}
            {chat.online && (
              <span className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-black" />
            )}
          </div>

          {/* Contact Display Name */}
          <h2 className="text-2xl font-black text-white tracking-tight mt-3">
            {chat.name}
          </h2>

          {/* Permanent Kempo Pro ID */}
          <p className="text-sm font-mono font-bold text-neutral-400 mt-1">
            {shareableKempoId}
          </p>

          {/* Online status tag */}
          <div className="mt-1">
            {chat.online ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                online
              </span>
            ) : (
              <span className="text-xs text-neutral-400">
                last seen {chat.timestamp}
              </span>
            )}
          </div>

          {/* Quick Action Buttons: Voice, Video, Search (Matching Image 2) */}
          <div className="grid grid-cols-3 gap-3 w-full mt-5">
            {/* Action 1: Voice Call */}
            <button
              onClick={() => {
                onBack();
                onStartCall?.(chat, false);
              }}
              className="py-3 px-2 rounded-2xl bg-[#18181c] hover:bg-[#202026] border border-neutral-800/80 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-lg group"
            >
              <Phone className="w-5 h-5 text-red-500 group-hover:scale-110 transition stroke-[2.2]" />
              <span className="text-xs font-bold text-white">Voice</span>
            </button>

            {/* Action 2: Video Call */}
            <button
              onClick={() => {
                onBack();
                onStartCall?.(chat, true);
              }}
              className="py-3 px-2 rounded-2xl bg-[#18181c] hover:bg-[#202026] border border-neutral-800/80 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-lg group"
            >
              <Video className="w-5 h-5 text-red-500 group-hover:scale-110 transition stroke-[2.2]" />
              <span className="text-xs font-bold text-white">Video</span>
            </button>

            {/* Action 3: In-Chat Search */}
            <button
              onClick={() => {
                onBack();
                onSearchChat?.();
              }}
              className="py-3 px-2 rounded-2xl bg-[#18181c] hover:bg-[#202026] border border-neutral-800/80 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-lg group"
            >
              <Search className="w-5 h-5 text-red-500 group-hover:scale-110 transition stroke-[2.2]" />
              <span className="text-xs font-bold text-white">Search</span>
            </button>
          </div>
        </div>

        {/* 2. Media, Links, Docs & Starred Messages Card */}
        <div className="bg-[#18181c] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-xl divide-y divide-neutral-800/80">
          <div
            onClick={() => showToast('Media browser: No shared media yet')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-white">Media, links and docs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">None</span>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>

          <div
            onClick={() => showToast('Starred messages: None')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-white">Starred</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">None</span>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>
        </div>

        {/* 3. Notifications & Chat Theme Card */}
        <div className="bg-[#18181c] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-xl divide-y divide-neutral-800/80">
          <div
            onClick={() => {
              setIsMuted(!isMuted);
              showToast(!isMuted ? 'Notifications muted for 8 hours' : 'Notifications unmuted');
            }}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-neutral-300" />
              <span className="text-sm font-semibold text-white">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">{isMuted ? 'Muted' : 'Default'}</span>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>

          <div
            onClick={() => showToast('Theme: Dark Kempo Pro Crimson Wallpaper')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-neutral-300" />
              <span className="text-sm font-semibold text-white">Chat theme</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">Kempo Dark</span>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>

          <div
            onClick={() => showToast('Save to Photos: Default')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-neutral-300" />
              <span className="text-sm font-semibold text-white">Save to Photos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">Default</span>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>
        </div>

        {/* 4. Security & Privacy Controls */}
        <div className="bg-[#18181c] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-xl divide-y divide-neutral-800/80">
          <div
            onClick={() => showToast('Disappearing messages: Off')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-neutral-300" />
              <span className="text-sm font-semibold text-white">Disappearing messages</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">Off</span>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>

          {/* Lock Chat Switch */}
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-neutral-300" />
              <div>
                <span className="text-sm font-semibold text-white block">Lock chat</span>
                <span className="text-[11px] text-neutral-400">Lock and hide this chat on this device</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLocked(!isLocked);
                showToast(!isLocked ? 'Chat locked with device passcode' : 'Chat unlocked');
              }}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                isLocked ? 'bg-red-600 justify-end' : 'bg-neutral-700 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-md block" />
            </button>
          </div>

          <div
            onClick={() => showToast('Restricted chat: Off')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-neutral-300" />
              <span className="text-sm font-semibold text-white">Restricted chat</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">Off</span>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </div>
          </div>

          {/* Encryption Info */}
          <div
            onClick={() => setShowEncryptionModal(true)}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <Lock className="w-5 h-5 text-red-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-semibold text-white block">Encryption</span>
                <span className="text-[11px] text-neutral-400 truncate block">
                  Messages and calls are end-to-end encrypted. Tap to verify.
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
          </div>
        </div>

        {/* 5. Groups in Common */}
        <div>
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-2 mb-2">
            No groups in common
          </h3>
          <div className="bg-[#18181c] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-xl divide-y divide-neutral-800/80">
            <button
              onClick={() => showToast(`Create group with ${chat.name}`)}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-neutral-800/40 active:bg-neutral-800/70 transition text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-sm font-semibold text-white">
                Create group with {chat.name}
              </span>
            </button>

            <button
              onClick={() => showToast(`Add ${chat.name} to existing group`)}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-neutral-800/40 active:bg-neutral-800/70 transition text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-sm font-semibold text-white">Add to group</span>
            </button>
          </div>
        </div>

        {/* 6. Standard Management Options Card (in signature red) */}
        <div className="bg-[#18181c] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-xl divide-y divide-neutral-800/80">
          <button
            onClick={handleShareContact}
            className="w-full px-4 py-3.5 flex items-center justify-between text-red-500 hover:text-red-400 hover:bg-neutral-800/40 active:bg-neutral-800/70 transition text-sm font-semibold cursor-pointer"
          >
            <span>Share contact</span>
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleFavorite}
            className="w-full px-4 py-3.5 flex items-center justify-between text-red-500 hover:text-red-400 hover:bg-neutral-800/40 active:bg-neutral-800/70 transition text-sm font-semibold cursor-pointer"
          >
            <span>{isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}</span>
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
          </button>

          <button
            onClick={() => showToast('Added to custom list')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-red-500 hover:text-red-400 hover:bg-neutral-800/40 active:bg-neutral-800/70 transition text-sm font-semibold cursor-pointer"
          >
            <span>Add to list</span>
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={() => showToast('Exporting encrypted chat history...')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-red-500 hover:text-red-400 hover:bg-neutral-800/40 active:bg-neutral-800/70 transition text-sm font-semibold cursor-pointer"
          >
            <span>Export chat</span>
            <Download className="w-4 h-4" />
          </button>

          {/* Clear Chat in bold red */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-red-500 hover:text-red-400 hover:bg-red-950/20 active:bg-red-950/40 transition text-sm font-bold cursor-pointer"
          >
            <span>Clear chat</span>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* 7. Bottom Safety Actions (Bold Red in dedicated card) */}
        <div className="bg-[#18181c] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-xl divide-y divide-neutral-800/80">
          <button
            onClick={() => setShowBlockConfirm(true)}
            className="w-full px-4 py-3.5 text-center text-red-500 hover:text-red-400 hover:bg-red-950/20 active:bg-red-950/40 transition text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
          >
            <Ban className="w-4 h-4" />
            <span>{isBlocked ? `Unblock ${chat.name}` : `Block ${chat.name}`}</span>
          </button>

          <button
            onClick={() => setShowReportConfirm(true)}
            className="w-full px-4 py-3.5 text-center text-red-500 hover:text-red-400 hover:bg-red-950/20 active:bg-red-950/40 transition text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
          >
            <Flag className="w-4 h-4" />
            <span>Report {chat.name}</span>
          </button>
        </div>
      </div>

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Clear this chat?</h3>
            <p className="text-xs text-neutral-400 mb-5">
              Messages will be permanently removed from this device for this conversation.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearChat?.(chat.id);
                  showToast('Chat history cleared');
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {showBlockConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowBlockConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-3">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {isBlocked ? `Unblock ${chat.name}?` : `Block ${chat.name}?`}
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              {isBlocked
                ? `${chat.name} will be able to send you messages and call you again.`
                : `Blocked contacts will no longer be able to call you or send you messages on Kempo Pro.`}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBlockConfirm(false);
                  setIsBlocked(!isBlocked);
                  onBlockContact?.(chat.id);
                  showToast(!isBlocked ? `Blocked ${chat.name}` : `Unblocked ${chat.name}`);
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition"
              >
                {isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Confirmation Modal */}
      {showReportConfirm && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowReportConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-3">
              <Flag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Report {chat.name}?</h3>
            <p className="text-xs text-neutral-400 mb-5">
              The last 5 messages from this contact will be forwarded to Kempo Pro Security. This contact will not be notified.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowReportConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowReportConfirm(false);
                  onReportContact?.(chat.id);
                  showToast(`Report submitted for ${chat.name}`);
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition"
              >
                Report Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encryption Details Modal */}
      {showEncryptionModal && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowEncryptionModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white mb-1">End-to-End Encrypted</h3>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Messages and calls with <span className="text-white font-bold">{chat.name}</span> are secured with 256-bit Kempo Pro end-to-end encryption. Only you and this person can read or listen to them.
            </p>
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-[11px] font-mono text-neutral-300 break-all mb-4 select-all">
              Security Code: 4920 1849 5830 2948 1049 8592
            </div>
            <button
              onClick={() => setShowEncryptionModal(false)}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

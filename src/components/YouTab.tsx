import React, { useState } from 'react';
import {
  QrCode,
  Key,
  Lock,
  MessageCircle,
  Bell,
  Smartphone,
  ChevronRight,
  Download,
  Share2,
  ShieldCheck,
  Palette,
  LogOut,
  Copy,
  Check,
  UserPlus,
  Volume2,
  Gamepad2,
  Moon,
  Sun,
  Loader2,
  Briefcase,
  Radio,
  Shield,
} from 'lucide-react';
import { UserProfileData, Chat, AppPreferences } from '../types';

interface YouTabProps {
  onOpenPwaGuide: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstallPwa: () => void;
  onOpenThemeSettings: () => void;
  onSignOut: () => void;
  currentUserEmail?: string;
  currentUserName?: string;
  userProfile?: UserProfileData | null;
  onUpdatePreferences?: (prefs: AppPreferences) => void;
  onAddContactById: (kempoId: string) => Promise<Chat | null>;
  onOpenChat: (chat: Chat) => void;
}

export const YouTab: React.FC<YouTabProps> = ({
  onOpenPwaGuide,
  isInstallable,
  isInstalled,
  onInstallPwa,
  onOpenThemeSettings,
  onSignOut,
  currentUserEmail,
  currentUserName,
  userProfile,
  onUpdatePreferences,
  onAddContactById,
  onOpenChat,
}) => {
  const displayName = userProfile?.displayName || currentUserName || 'Kempo User';
  const displayEmail = userProfile?.email || currentUserEmail || 'user@example.com';
  const displayAvatar = userProfile?.avatarUrl || '';
  const kempoId = userProfile?.kempoId || 'KEMPO-PRO';
  const accountType = userProfile?.accountType || 'personal';

  // Copy ID state
  const [copiedId, setCopiedId] = useState(false);

  // Add Contact by ID state
  const [targetId, setTargetId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Copy User ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(kempoId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Share User ID
  const handleShareId = async () => {
    const shareText = `Connect with me on KEMPO PRo! My User ID is: ${kempoId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My KEMPO PRo ID',
          text: shareText,
          url: window.location.href,
        });
      } catch (e) {
        handleCopyId();
      }
    } else {
      handleCopyId();
      alert(`Copied share link to clipboard:\n"${shareText}"`);
    }
  };

  // Handle Add Contact by ID
  const handleAddById = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) return;

    if (targetId.trim().toUpperCase() === kempoId.toUpperCase()) {
      setSearchFeedback({ type: 'error', msg: 'You cannot add your own User ID.' });
      return;
    }

    setIsSearching(true);
    setSearchFeedback(null);

    try {
      const newChat = await onAddContactById(targetId.trim());
      if (newChat) {
        setSearchFeedback({ type: 'success', msg: `Connected with ${newChat.name}! Opening chat...` });
        setTargetId('');
        setTimeout(() => {
          onOpenChat(newChat);
        }, 600);
      } else {
        setSearchFeedback({ type: 'error', msg: `User ID "${targetId.trim().toUpperCase()}" not found. Verify the ID and try again.` });
      }
    } catch (err: any) {
      setSearchFeedback({ type: 'error', msg: err?.message || 'Failed to search for user.' });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),10px)] select-none space-y-4 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
        <button
          onClick={handleShareId}
          className="w-10 h-10 rounded-full bg-[#1c1c1e] text-neutral-200 hover:text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
          title="Share My ID"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile Card */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#161619] border border-neutral-800/80 shadow-md">
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-red-500 ring-offset-2 ring-offset-black bg-neutral-800 flex items-center justify-center">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl text-neutral-200 font-bold">
                {displayName.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-red-600 ring-2 ring-black flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[17.5px] font-bold text-white truncate">
              {displayName}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950/80 text-red-300 border border-red-700/60">
              {accountType === 'personal' && 'Personal'}
              {accountType === 'business' && 'Business'}
              {accountType === 'creator' && 'Creator'}
              {accountType === 'developer_gamer' && 'Developer'}
            </span>
          </div>
          <p className="text-[12px] text-neutral-400 mt-0.5 truncate">{displayEmail}</p>
        </div>
      </div>

      {/* Shareable User ID Banner (Requirement 5) */}
      <div className="p-4 rounded-2xl bg-[#141417] border border-red-800/70 shadow-lg shadow-red-950/30 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              Your Shareable User ID
            </span>
            <div className="text-xl font-black text-white font-mono tracking-wider mt-0.5 text-red-400">
              {kempoId}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyId}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
            </button>
            <button
              onClick={handleShareId}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-950 transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
        <p className="text-[11.5px] text-neutral-400 leading-snug">
          Give this ID to other people to connect and start messaging instantly in real-time.
        </p>
      </div>

      {/* Add Contact by ID Card (Requirement 5) */}
      <div className="p-4 rounded-2xl bg-[#161619] border border-neutral-800 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-white">Add Contact by ID</h3>
        </div>
        <p className="text-xs text-neutral-400 mb-3">
          Enter another user's KEMPO ID to connect your accounts and chat.
        </p>

        <form onSubmit={handleAddById} className="flex gap-2">
          <input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value.toUpperCase())}
            placeholder="e.g. KEMPO-XXXXXX"
            maxLength={18}
            className="flex-1 h-11 px-3.5 rounded-xl bg-[#0e0e11] border border-neutral-700/80 text-white placeholder-neutral-500 text-xs font-mono font-semibold focus:outline-none focus:border-red-500 uppercase transition"
          />
          <button
            type="submit"
            disabled={isSearching || !targetId.trim()}
            className="px-4 h-11 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-950 transition active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Add Contact</span>}
          </button>
        </form>

        {searchFeedback && (
          <div
            className={`mt-2.5 p-2 rounded-xl text-xs flex items-center gap-2 ${
              searchFeedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/60 border border-red-800/60 text-red-300'
            }`}
          >
            {searchFeedback.type === 'success' ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            ) : (
              <Shield className="w-3.5 h-3.5 shrink-0 text-red-400" />
            )}
            <span>{searchFeedback.msg}</span>
          </div>
        )}
      </div>

      {/* Home Screen / PWA Callout Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/70 via-[#1c1214] to-[#121215] border border-red-800/60 shadow-lg shadow-red-950/30">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md shadow-red-900/60 border border-red-800/40">
            <img src="/apple-touch-icon.png" alt="KEMPO PRo" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[15.5px] font-bold text-white">Mobile Home Screen App</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-600/30 text-red-300 border border-red-600/40">
                PWA
              </span>
            </div>
            <p className="text-[12.5px] text-neutral-300 mt-1 leading-snug">
              Add <strong>KEMPO PRo</strong> to your home screen for fullscreen standalone mobile experience, real red app logo, and fast launch.
            </p>

            <div className="mt-3 flex items-center gap-2">
              {isInstallable ? (
                <button
                  onClick={onInstallPwa}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-red-950 active:scale-95 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Install App Now
                </button>
              ) : isInstalled ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/40">
                  <ShieldCheck className="w-4 h-4" />
                  Running in Home Screen Mode
                </div>
              ) : null}

              <button
                onClick={onOpenPwaGuide}
                className="px-3.5 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                iOS Safari Guide
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* App Preferences & Settings Navigation List */}
      <div className="space-y-4">
        {/* Section 1: Themes & Appearance */}
        <div className="bg-[#161619] rounded-2xl border border-neutral-800/80 divide-y divide-neutral-850 overflow-hidden">
          <div
            onClick={onOpenThemeSettings}
            className="p-3.5 flex items-center justify-between hover:bg-[#1c1c20] cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[15px] font-medium text-white">App Color & Theme</h4>
                <p className="text-[12px] text-neutral-400">Crimson Red (Active)</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>

          <div
            onClick={onOpenPwaGuide}
            className="p-3.5 flex items-center justify-between hover:bg-[#1c1c20] cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="text-[15px] font-medium text-white">Home Screen & PWA</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>
        </div>

        {/* Section 2: Account & Privacy */}
        <div className="bg-[#161619] rounded-2xl border border-neutral-800/80 divide-y divide-neutral-850 overflow-hidden">
          <div className="p-3.5 flex items-center justify-between hover:bg-[#1c1c20] cursor-pointer">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <h4 className="text-[15px] font-medium text-white">Account Security</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>

          <div className="p-3.5 flex items-center justify-between hover:bg-[#1c1c20] cursor-pointer">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-[15px] font-medium text-white">Privacy & Blocking</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>

          <div className="p-3.5 flex items-center justify-between hover:bg-[#1c1c20] cursor-pointer">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h4 className="text-[15px] font-medium text-white">Chats & Wallpaper</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>

          <div className="p-3.5 flex items-center justify-between hover:bg-[#1c1c20] cursor-pointer">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h4 className="text-[15px] font-medium text-white">Notifications</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>
        </div>

        {/* Section 3: Sign Out */}
        <div className="bg-[#161619] rounded-2xl border border-neutral-800/80 overflow-hidden">
          <button
            onClick={onSignOut}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-red-950/30 transition cursor-pointer text-red-500"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold">Log Out</h4>
                <p className="text-[11.5px] text-neutral-400">Sign out of this session</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          </button>
        </div>

        {/* App Info Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-[13px] font-semibold text-neutral-400">
            KEMPO PRo
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Version 2.4.0 (Red Edition) &bull; End-to-end Encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

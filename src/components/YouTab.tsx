import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Key,
  MessageCircle,
  Bell,
  ChevronRight,
  Download,
  Share2,
  Palette,
  LogOut,
  Copy,
  Check,
  UserPlus,
  Loader2,
  Camera,
  Shield,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { UserProfileData, Chat, AppPreferences } from '../types';
import { uploadAvatarToSupabase, saveFullUserProfile } from '../lib/supabase';

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
  onUpdateProfile?: (profile: UserProfileData) => void;
  onAddContactById: (kempoId: string) => Promise<Chat | null>;
  onOpenChat: (chat: Chat) => void;
}

// Preset stylish avatars for quick selection
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&auto=format&fit=crop&q=80',
];

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
  onUpdateProfile,
  onAddContactById,
  onOpenChat,
}) => {
  const displayName = userProfile?.displayName || currentUserName || 'Precious Ddkid';
  const displayEmail = userProfile?.email || currentUserEmail || 'preciousddkid@gmail.com';
  const kempoId = userProfile?.kempoId || 'KEMPO-PRO';
  const accountType = userProfile?.accountType || 'creator';

  // Offline-resilient avatar state (loaded from cache instantly)
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        userProfile?.avatarUrl ||
        localStorage.getItem('kempo_user_avatar') ||
        ''
      );
    }
    return userProfile?.avatarUrl || '';
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync avatar if userProfile changes
  useEffect(() => {
    if (userProfile?.avatarUrl) {
      setAvatarUrl(userProfile.avatarUrl);
    }
  }, [userProfile?.avatarUrl]);

  // Copy ID state
  const [copiedId, setCopiedId] = useState(false);

  // Add Contact by ID state
  const [targetId, setTargetId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Check if running on home screen as standalone app
  const isRunningOnHomeScreen =
    isInstalled ||
    (typeof window !== 'undefined' &&
      ((window.navigator as any).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        localStorage.getItem('kempo_pwa_installed') === 'true'));

  // Save avatar both offline (localStorage) and cloud (Supabase)
  const saveAndSyncAvatar = async (urlOrDataUrl: string, fileBlob?: File | Blob) => {
    setAvatarUrl(urlOrDataUrl);

    // 1. Save locally for 100% offline resilience
    if (typeof window !== 'undefined') {
      localStorage.setItem('kempo_user_avatar', urlOrDataUrl);
      const cached = localStorage.getItem('kempo_user_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.avatarUrl = urlOrDataUrl;
          localStorage.setItem('kempo_user_profile', JSON.stringify(parsed));
        } catch {}
      }
    }

    if (userProfile) {
      const updatedProfile: UserProfileData = {
        ...userProfile,
        avatarUrl: urlOrDataUrl,
      };
      onUpdateProfile?.(updatedProfile);
    }

    // 2. Upload to Supabase if file exists and network is online
    if (fileBlob) {
      setIsUploadingAvatar(true);
      try {
        const publicUrl = await uploadAvatarToSupabase(fileBlob, userProfile?.id || 'user');
        if (publicUrl) {
          setAvatarUrl(publicUrl);
          if (typeof window !== 'undefined') {
            localStorage.setItem('kempo_user_avatar', publicUrl);
          }
          if (userProfile) {
            const finalProfile = { ...userProfile, avatarUrl: publicUrl };
            await saveFullUserProfile(finalProfile);
            onUpdateProfile?.(finalProfile);
          }
        }
      } catch (err) {
        console.warn('Avatar saved offline; will sync to Supabase when reconnected:', err);
      } finally {
        setIsUploadingAvatar(false);
      }
    } else if (userProfile) {
      // Preset chosen
      try {
        await saveFullUserProfile({ ...userProfile, avatarUrl: urlOrDataUrl });
      } catch (err) {
        console.warn('Saved profile locally:', err);
      }
    }
  };

  // Handle changing profile picture from local file/camera
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAvatarPicker(false);

    // Read as Base64 Data URL so it saves & displays offline instantly!
    const reader = new FileReader();
    reader.onload = async () => {
      const localDataUrl = reader.result as string;
      await saveAndSyncAvatar(localDataUrl, file);
    };
    reader.readAsDataURL(file);
  };

  // Handle picking a stylish preset avatar
  const handleSelectPresetAvatar = (url: string) => {
    setShowAvatarPicker(false);
    saveAndSyncAvatar(url);
  };

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
          title: 'KEMPO PRo User ID',
          text: shareText,
        });
      } catch {}
    } else {
      handleCopyId();
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
        }, 500);
      } else {
        setSearchFeedback({
          type: 'error',
          msg: `User ID "${targetId.trim().toUpperCase()}" not found. Verify the ID and try again.`,
        });
      }
    } catch (err: any) {
      setSearchFeedback({ type: 'error', msg: err?.message || 'Failed to search for user.' });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),10px)] select-none space-y-4 pb-24">
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

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

      {/* Upgraded Centered User Profile Card */}
      <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-[#141417] shadow-xl relative overflow-hidden">
        {/* Soft atmospheric ambient red glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-red-600/15 blur-3xl pointer-events-none rounded-full" />

        {/* Centered Circular Avatar with Camera Uploader */}
        <div
          className="relative mb-3.5 group cursor-pointer"
          onClick={() => setShowAvatarPicker(true)}
        >
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-red-600/70 hover:ring-red-500 bg-[#1e1e24] flex items-center justify-center shadow-xl shadow-red-950/40 transition">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-neutral-200 font-black">
                {displayName.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>

          {/* Camera Edit Badge */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAvatarPicker(true);
            }}
            aria-label="Change profile photo"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-950 ring-2 ring-black active:scale-90 transition cursor-pointer"
          >
            {isUploadingAvatar ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Centered Display Name (Chosen Name / Name from Profile) */}
        <h2 className="text-xl font-black text-white tracking-tight">
          {displayName}
        </h2>

        {/* Centered Account Type Badge */}
        <div className="mt-1.5 flex items-center justify-center">
          <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-950/80 text-red-300 border border-red-700/60 shadow-xs">
            {accountType === 'personal' && 'Personal Account'}
            {accountType === 'business' && 'Business Account'}
            {accountType === 'creator' && 'Creator Profile'}
            {accountType === 'developer_gamer' && 'Developer / Gamer'}
          </span>
        </div>

        {/* Change Profile Picture Action Button */}
        <button
          type="button"
          onClick={() => setShowAvatarPicker(true)}
          className="mt-3 px-3.5 py-1 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[12px] font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-red-400" />
          <span>Change Profile Picture</span>
        </button>

        <p className="text-[11px] text-neutral-500 mt-2 font-medium">
          Saved offline and synced to cloud
        </p>
      </div>

      {/* Shareable User ID Banner */}
      <div className="p-4 rounded-3xl bg-[#141417] shadow-lg flex flex-col gap-3">
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

      {/* Add Contact by ID Card */}
      <div className="p-4 rounded-3xl bg-[#161619] shadow-md">
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
            className="flex-1 h-11 px-3.5 rounded-xl bg-[#0e0e11] text-white placeholder-neutral-500 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 uppercase transition"
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
                ? 'bg-emerald-950/60 text-emerald-300'
                : 'bg-red-950/60 text-red-300'
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

      {/* Clean Straight Settings List (No white divider lines, no clutter) */}
      <div className="space-y-2 pt-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1 mb-2">
          Preferences & Security
        </h3>

        {/* 1. Privacy & Security (Email is placed here as requested) */}
        <div
          onClick={() => {
            alert(
              `Privacy & Account Security:\n\nEmail: ${displayEmail}\nUser ID: ${kempoId}\nEnd-to-End Encryption: Enabled\nStatus: Secure & Active`
            );
          }}
          className="p-3.5 rounded-2xl bg-[#161619] hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-99"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[15px] font-semibold text-white">Privacy & Security</h4>
              <p className="text-[12px] text-neutral-400 truncate">{displayEmail}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 2. App Color & Theme */}
        <div
          onClick={onOpenThemeSettings}
          className="p-3.5 rounded-2xl bg-[#161619] hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-99"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[15px] font-semibold text-white">App Color & Theme</h4>
              <p className="text-[12px] text-neutral-400">Crimson Red (Active)</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 3. Chats & Wallpaper */}
        <div
          onClick={() => {
            alert('Chats & Wallpaper settings: WhatsApp dark doodle wallpaper is active.');
          }}
          className="p-3.5 rounded-2xl bg-[#161619] hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-99"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[15px] font-semibold text-white">Chats & Wallpaper</h4>
              <p className="text-[12px] text-neutral-400">Custom wallpapers, backup & chat history</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 4. Notifications & Sounds */}
        <div
          onClick={() => {
            const nextPref = !userProfile?.preferences?.inAppSounds;
            if (onUpdatePreferences && userProfile) {
              onUpdatePreferences({
                ...userProfile.preferences,
                inAppSounds: nextPref,
                messageTones: nextPref,
              });
            }
          }}
          className="p-3.5 rounded-2xl bg-[#161619] hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-99"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[15px] font-semibold text-white">Notifications & Sounds</h4>
              <p className="text-[12px] text-neutral-400">
                {userProfile?.preferences?.messageTones !== false ? 'In-app sounds enabled' : 'Muted'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 5. Add to Home Screen (Clean Row ONLY shown in browser when NOT yet on Home Screen) */}
        {!isRunningOnHomeScreen && isInstallable && (
          <div
            onClick={onInstallPwa}
            className="p-3.5 rounded-2xl bg-[#161619] hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-99"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold text-white">Add to Home Screen</h4>
                <p className="text-[12px] text-neutral-400">Install for full-screen standalone experience</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
          </div>
        )}

        {/* 6. Log Out (Arranged straight, clean red accent) */}
        <div
          onClick={onSignOut}
          className="p-3.5 rounded-2xl bg-[#161619] hover:bg-red-950/30 flex items-center justify-between cursor-pointer transition active:scale-99"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[15px] font-bold text-red-400">Log Out</h4>
              <p className="text-[12px] text-neutral-400">Sign out of this session</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
        </div>
      </div>

      {/* App Info Footer */}
      <div className="text-center pt-3 pb-6">
        <p className="text-[13px] font-bold text-neutral-400">
          KEMPO <span className="text-red-500">PRo</span>
        </p>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Version 2.5.0 &bull; Real-Time Encrypted Calls & Chats
        </p>
      </div>

      {/* Avatar Selection Sheet / Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#161619] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Change Profile Picture</h3>
                <p className="text-xs text-neutral-400">Choose a stylish avatar or upload from your device</p>
              </div>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Photo Upload Button */}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition active:scale-98 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Upload Photo from Device / Camera</span>
            </button>

            {/* Preset Avatars Grid */}
            <div>
              <p className="text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                Or select a preset avatar
              </p>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_AVATARS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectPresetAvatar(preset)}
                    className="relative aspect-square rounded-2xl overflow-hidden ring-2 ring-neutral-800 hover:ring-red-500 transition active:scale-95 cursor-pointer group"
                  >
                    <img
                      src={preset}
                      alt={`Avatar preset ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

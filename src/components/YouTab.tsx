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
  Edit3,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { UserProfileData, Chat, AppPreferences } from '../types';
import { uploadAvatarToSupabase, saveFullUserProfile } from '../lib/supabase';
import {
  isOwnerEmail,
  OWNER_FIXED_ID,
  validateAndFormatUserId,
  getBackendPrivacyStatus,
  generateStandardUserKempoId,
} from '../lib/accountRules';
import { AdminConsoleModal } from './AdminConsoleModal';

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
  // Determine if this account is the recognized application owner
  const rawEmail = userProfile?.email || currentUserEmail || '';
  const isOwner =
    isOwnerEmail(rawEmail) ||
    userProfile?.kempoId?.toLowerCase() === OWNER_FIXED_ID.toLowerCase();

  // For owner, fixed ID is always 'kempo pro'
  // For standard users: Always start with app name 'KEMPO-' followed by numbers/letters!
  const kempoId = isOwner
    ? OWNER_FIXED_ID
    : userProfile?.kempoId && userProfile.kempoId.toUpperCase().startsWith('KEMPO-')
    ? userProfile.kempoId
    : 'KEMPO-749219';

  const displayName =
    userProfile?.displayName ||
    currentUserName ||
    (isOwner ? 'Precious Ddkid' : 'Kempo User');
  const accountType = isOwner ? 'creator' : userProfile?.accountType || 'personal';

  // Auto-correct any legacy ID (such as ddkidcast-70319) so every regular user has KEMPO-[digits/letters]
  useEffect(() => {
    if (!isOwner && userProfile?.kempoId && !userProfile.kempoId.toUpperCase().startsWith('KEMPO-')) {
      const standardId = generateStandardUserKempoId();
      const updatedProfile = { ...userProfile, kempoId: standardId };
      saveFullUserProfile(updatedProfile);
      onUpdateProfile?.(updatedProfile);
    }
  }, [isOwner, userProfile?.kempoId]);

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

  // Owner & Admin Console state
  const [showAdminConsole, setShowAdminConsole] = useState(false);

  // Edit / Customize ID modal state
  const [showEditIdModal, setShowEditIdModal] = useState(false);
  const [customIdInput, setCustomIdInput] = useState('');
  const [editIdError, setEditIdError] = useState('');
  const [editIdSuccess, setEditIdSuccess] = useState('');

  // Add Contact by ID state
  const [targetId, setTargetId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

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

  // Handle User ID customization attempt (Enforces non-owner restriction on 'kempo pro')
  const handleSaveCustomId = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditIdError('');
    setEditIdSuccess('');

    if (!customIdInput.trim()) {
      setEditIdError('Please enter a desired ID.');
      return;
    }

    const result = validateAndFormatUserId(customIdInput, rawEmail);
    if (!result.valid) {
      setEditIdError(result.error || "Cannot use this User ID.");
      return;
    }

    if (userProfile) {
      const updatedProfile: UserProfileData = {
        ...userProfile,
        kempoId: result.formattedId,
      };
      await saveFullUserProfile(updatedProfile);
      onUpdateProfile?.(updatedProfile);
      setEditIdSuccess(`User ID updated to: ${result.formattedId}`);
      setTimeout(() => {
        setShowEditIdModal(false);
        setEditIdSuccess('');
      }, 1200);
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
        {/* Soft atmospheric ambient glow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 blur-3xl pointer-events-none rounded-full ${isOwner ? 'bg-amber-500/20' : 'bg-red-600/15'}`} />

        {/* Centered Circular Avatar with Camera Uploader */}
        <div
          className="relative mb-3.5 group cursor-pointer"
          onClick={() => setShowAvatarPicker(true)}
        >
          <div className={`w-24 h-24 rounded-full overflow-hidden ring-4 ${isOwner ? 'ring-amber-500/80 shadow-amber-950/50' : 'ring-red-600/70 shadow-red-950/40'} bg-[#1e1e24] flex items-center justify-center shadow-xl transition`}>
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

        {/* Centered Display Name */}
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5 justify-center">
          <span>{displayName}</span>
          {isOwner && <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />}
        </h2>

        {/* Centered Account Distinction Badge */}
        <div className="mt-1.5 flex items-center justify-center">
          {isOwner ? (
            <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-lg shadow-red-950/50 border border-amber-400/40 flex items-center gap-1.5">
              <span>👑</span>
              <span>KEMPO PRO OWNER & ADMIN</span>
            </span>
          ) : (
            <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-950/80 text-red-300 border border-red-700/60 shadow-xs">
              {accountType === 'personal' && 'Personal Account'}
              {accountType === 'business' && 'Business Account'}
              {accountType === 'creator' && 'Creator Profile'}
              {accountType === 'developer_gamer' && 'Developer / Gamer'}
            </span>
          )}
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
          Saved offline &bull; Synced with Supabase
        </p>
      </div>

      {/* Shareable User ID Banner */}
      <div className="p-4 rounded-3xl bg-[#141417] shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 flex items-center gap-1">
              {isOwner ? '👑 Official Owner User ID' : 'Your Shareable User ID'}
            </span>
            <div className={`text-xl font-black font-mono tracking-wider mt-0.5 ${isOwner ? 'text-amber-400' : 'text-red-400'}`}>
              {kempoId}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && (
              <button
                onClick={() => {
                  setCustomIdInput(kempoId);
                  setEditIdError('');
                  setEditIdSuccess('');
                  setShowEditIdModal(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                title="Customize ID"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={handleCopyId}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId ? 'Copied' : 'Copy'}</span>
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
          {isOwner
            ? "Fixed official User ID for the application owner. Non-owners are restricted from using this ID."
            : "Give this ID to other people to connect and start messaging instantly in real-time."}
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
            placeholder="e.g. KEMPO-XXXXXX or kempo pro"
            maxLength={22}
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

        {/* 1. Privacy & Security (Strict backend privacy: email handled strictly on backend, not exposed) */}
        <div
          onClick={() => {
            alert(
              `Privacy & Account Security:\n\nAccount Status: Active & Encrypted\nUser ID: ${kempoId}\nAccount Type: ${isOwner ? '👑 Kempo Pro Owner / Admin' : 'Standard Account'}\n\nBackend Email Privacy: Active\nYour sign-in email is handled strictly by the backend server and is never exposed or visible on the app frontend.\n\nEnd-to-End Encryption: Enabled`
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
              <p className="text-[12px] text-neutral-400 truncate flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />
                <span>{getBackendPrivacyStatus(rawEmail)}</span>
              </p>
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

        {/* 7. Owner & Admin Console Button (Visible ONLY to the owner) */}
        {isOwner && (
          <div
            onClick={() => setShowAdminConsole(true)}
            className="p-4 rounded-2xl bg-gradient-to-r from-red-950 via-[#1f1216] to-[#2a170d] border-2 border-amber-500/70 hover:border-amber-400 flex items-center justify-between cursor-pointer transition active:scale-99 shadow-2xl shadow-red-950/60 mt-2"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-500 to-red-600 text-black flex items-center justify-center font-black shadow-lg shadow-amber-950/60 shrink-0">
                <Crown className="w-5 h-5 text-black fill-black" />
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-black text-white">Owner & Admin Console</h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Admin Only
                  </span>
                </div>
                <p className="text-[12px] text-amber-200/90 font-medium truncate">
                  View signed-in user emails, ban, suspend, verify & restrict accounts
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-300 shrink-0" />
          </div>
        )}
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

      {/* Change Profile Picture Modal (Preset Avatars + File/Camera Upload) */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#161619] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-red-500" />
                Change Profile Picture
              </h3>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload from device / camera */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-950 flex items-center justify-center gap-2 mb-4 active:scale-98 transition cursor-pointer"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span>Upload from Device or Camera</span>
            </button>

            {/* Preset Avatars Header */}
            <p className="text-xs font-semibold text-neutral-400 mb-2.5">
              Or pick an instant avatar:
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {PRESET_AVATARS.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectPresetAvatar(url)}
                  className={`w-full aspect-square rounded-2xl overflow-hidden ring-2 cursor-pointer transition hover:scale-105 active:scale-95 ${
                    avatarUrl === url ? 'ring-red-500' : 'ring-neutral-700/60'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAvatarPicker(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit User ID Modal (Enforcing non-owner restriction on 'kempo pro') */}
      {showEditIdModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#161619] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-red-500" />
                Customize User ID
              </h3>
              <button
                onClick={() => setShowEditIdModal(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
              Standard User IDs always start with the app name <strong className="text-white">"KEMPO-"</strong> followed by numbers or letters. The fixed ID <strong className="text-white">"kempo pro"</strong> is reserved exclusively for the system owner.
            </p>

            <form onSubmit={handleSaveCustomId} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Desired Handle or ID (e.g. KEMPO-728193 or KEMPO-HERO)
                </label>
                <input
                  type="text"
                  value={customIdInput}
                  onChange={(e) => {
                    setCustomIdInput(e.target.value.toUpperCase());
                    setEditIdError('');
                  }}
                  placeholder="e.g. KEMPO-728193 or KEMPO-HERO"
                  maxLength={22}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0e0e11] text-white placeholder-neutral-500 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-red-500 transition uppercase"
                />
              </div>

              {editIdError && (
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{editIdError}</span>
                </div>
              )}

              {editIdSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{editIdSuccess}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditIdModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950 active:scale-95 transition"
                >
                  Save ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owner & Admin Console Modal (Visible ONLY to the owner) */}
      {showAdminConsole && isOwner && (
        <AdminConsoleModal
          onClose={() => setShowAdminConsole(false)}
          currentOwnerEmail={rawEmail || 'Preciousddkid@gmail.com'}
        />
      )}
    </div>
  );
};

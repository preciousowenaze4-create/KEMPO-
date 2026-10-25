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
  Search,
  Star,
  List,
  Radio,
  Sparkles,
  Smartphone,
  ExternalLink,
  Smile,
} from 'lucide-react';
import { UserProfileData, Chat, AppPreferences } from '../types';
import { uploadAvatarToSupabase, saveFullUserProfile, isVideoMediaUrl } from '../lib/supabase';
import { getMediaFromOfflineCache } from '../lib/mediaCache';
import {
  isOwnerEmail,
  isOwnerIdFormat,
  OWNER_FIXED_ID,
  validateAndFormatUserId,
  getBackendPrivacyStatus,
  generateStandardUserKempoId,
} from '../lib/accountRules';
import { AdminConsoleModal } from './AdminConsoleModal';
import { ProfileEditScreen } from './ProfileEditScreen';
import { NotificationSettingsScreen } from './settings/NotificationSettingsScreen';
import { PrivacySettingsScreen } from './settings/PrivacySettingsScreen';
import { AccountSettingsScreen } from './settings/AccountSettingsScreen';
import { SubscriptionsScreen } from './settings/SubscriptionsScreen';
import { ListsScreen } from './settings/ListsScreen';
import { BroadcastScreen } from './settings/BroadcastScreen';
import { StarredMessagesScreen } from './settings/StarredMessagesScreen';
import { LinkedDevicesScreen } from './settings/LinkedDevicesScreen';
import { ChatSettingsScreen } from './settings/ChatSettingsScreen';
import { AppearanceSettingsScreen } from './settings/AppearanceSettingsScreen';

export type SettingsSubScreenType =
  | 'none'
  | 'subscriptions'
  | 'lists'
  | 'broadcast'
  | 'starred'
  | 'linked_devices'
  | 'account'
  | 'privacy'
  | 'chats'
  | 'appearance'
  | 'notifications';

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
  chats?: Chat[];
  onSendMessage?: (chatId: string, text: string) => void;
  onClearChats?: () => void;
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
  chats = [],
  onSendMessage,
  onClearChats,
}) => {
  // Navigation state for dedicated sliding sub-screens
  const [activeSubScreen, setActiveSubScreen] = useState<SettingsSubScreenType>('none');

  // Determine if this account is the recognized application owner
  const rawEmail = userProfile?.email || currentUserEmail || '';
  const isOwner =
    isOwnerEmail(rawEmail) ||
    isOwnerIdFormat(userProfile?.kempoId);

  // Dedicated permanent Kempo Pro ID
  const kempoId = isOwner
    ? OWNER_FIXED_ID
    : (userProfile?.kempoId && !userProfile.kempoId.endsWith('A5738') && !isOwnerIdFormat(userProfile.kempoId))
      ? userProfile.kempoId
      : generateStandardUserKempoId(userProfile?.countryCode, rawEmail);

  const displayName =
    userProfile?.displayName ||
    currentUserName ||
    (isOwner ? 'Precious Ddkid' : 'Kempo User');
  const accountType = isOwner ? 'creator' : userProfile?.category || userProfile?.accountType || 'personal';

  const defaultCover =
    'https://assets.mixkit.co/videos/preview/mixkit-red-smoke-rising-in-the-dark-41586-large.mp4';

  // Ensure user's permanent ID is saved to profile if it was using placeholder
  useEffect(() => {
    if (
      userProfile &&
      ((userProfile.kempoId !== kempoId && kempoId) || (isOwner && userProfile.kempoId !== OWNER_FIXED_ID))
    ) {
      const updatedProfile = { ...userProfile, kempoId };
      saveFullUserProfile(updatedProfile);
    }
  }, [isOwner, kempoId, userProfile?.kempoId]);

  // Offline-resilient avatar state (loaded from cache instantly)
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    if (userProfile?.avatarUrl) return userProfile.avatarUrl;
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('kempo_user_avatar') ||
        ''
      );
    }
    return '';
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

  // Cover photo / video header background state (Supports Images & Videos)
  const [coverUrl, setCoverUrl] = useState<string>(() => {
    if (userProfile?.coverUrl) return userProfile.coverUrl;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kempo_user_cover');
      if (stored) return stored;
    }
    return defaultCover;
  });

  const [coverType, setCoverType] = useState<'image' | 'video'>(() => {
    if (userProfile?.coverType) return userProfile.coverType;
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('kempo_user_cover_type');
      if (cached === 'video' || cached === 'image') return cached;
      const url = localStorage.getItem('kempo_user_cover');
      if (isVideoMediaUrl(url || '')) return 'video';
    }
    return isVideoMediaUrl(userProfile?.coverUrl || defaultCover) ? 'video' : 'image';
  });

  // Sync cover photo/video if userProfile changes
  useEffect(() => {
    if (userProfile?.coverUrl) {
      setCoverUrl(userProfile.coverUrl);
      setCoverType(userProfile.coverType || (isVideoMediaUrl(userProfile.coverUrl) ? 'video' : 'image'));
    }
  }, [userProfile?.coverUrl, userProfile?.coverType]);

  // Load offline cached media on mount
  useEffect(() => {
    let isMounted = true;
    getMediaFromOfflineCache('kempo_user_cover').then((cached) => {
      if (isMounted && cached) {
        setCoverUrl(cached);
      }
    });
    getMediaFromOfflineCache('kempo_user_avatar').then((cached) => {
      if (isMounted && cached) {
        setAvatarUrl(cached);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Copy ID state
  const [copiedId, setCopiedId] = useState(false);

  // WhatsApp-style status / thought state
  const [statusThought, setStatusThought] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kempo_status_thought') || 'Available on Kempo Pro';
    }
    return 'Available on Kempo Pro';
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] = useState('');

  // Owner & Admin Console state
  const [showAdminConsole, setShowAdminConsole] = useState(false);

  // Dedicated Profile Editing Screen state (IMG_4734 & IMG_4733)
  const [showProfileEdit, setShowProfileEdit] = useState(false);

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



  return (
    <div className="relative flex-1 overflow-hidden flex flex-col select-none">
      {/* 1. Full-Height Vertical Stretch for Cover Media (Live Video or Photo) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {coverUrl ? (
          isVideoMediaUrl(coverUrl) || coverType === 'video' ? (
            <video
              src={coverUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={coverUrl}
              alt="Settings Background Cover"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0c0c10] via-[#15151c] to-[#0a0a0d]" />
        )}
        {/* Subtle translucent vignette so the live video remains completely clear and visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      {/* Scrollable Content Overlaid Directly on Top of Full-Bleed Video/Picture */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),12px)] select-none space-y-4 pb-28">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
            Settings
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareId}
              className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center active:scale-95 transition cursor-pointer shadow-lg drop-shadow"
              title="QR Code & Share ID"
            >
              <QrCode className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setShowProfileEdit(true)}
              className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center active:scale-95 transition cursor-pointer shadow-lg drop-shadow"
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <Edit3 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Profile Section (Direct Overlay on Live Video - No Dark Box Container) */}
        <div className="relative flex flex-col items-center text-center pt-1 pb-2">
          {/* Centered Circular Avatar with Camera Uploader */}
          <div
            className="relative group mb-2 cursor-pointer"
            onClick={() => setShowProfileEdit(true)}
          >
            <div
              className={`w-28 h-28 rounded-full overflow-hidden ring-4 ${
                isOwner
                  ? 'ring-amber-500 shadow-amber-950/70'
                  : 'ring-red-600 shadow-red-950/70'
              } bg-black/30 shadow-2xl flex items-center justify-center transition group-hover:scale-102`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-white font-black drop-shadow-md">
                  {displayName.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>

            {/* Camera Edit Badge in Signature Red */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileEdit(true);
              }}
              aria-label="Edit Profile"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-black/90 ring-2 ring-black active:scale-90 transition cursor-pointer"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Thought / Status Bubble */}
          <button
            type="button"
            onClick={() => {
              setStatusInput(statusThought);
              setShowStatusModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 mb-1.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-[11px] text-white shadow-lg transition active:scale-95 cursor-pointer relative drop-shadow"
            title="Tap to update status"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="font-semibold max-w-[200px] truncate drop-shadow-sm">{statusThought}</span>
          </button>

          {/* Centered Display Name with Clean Drop Shadow */}
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2 mt-1 drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
            <span>{displayName}</span>
            {isOwner ? (
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black inline-block shadow-sm" title="Online"></span>
            )}
          </h2>

          {/* Account Badge */}
          <div className="mt-1 flex items-center justify-center">
            {isOwner ? (
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-xl shadow-black/80 border border-amber-400/50 flex items-center gap-1.5 drop-shadow">
                <span>👑</span>
                <span>KEMPO PRO OWNER & ADMIN</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/50 text-red-300 border border-red-700/60 shadow-lg drop-shadow">
                {accountType === 'personal' && 'Personal Account'}
                {accountType === 'business' && 'Business Account'}
                {accountType === 'creator' && 'Creator Profile'}
                {accountType === 'developer_gamer' && 'Developer / Gamer'}
              </span>
            )}
          </div>

          {/* User ID Sizing & Copy Button */}
          <div className="mt-2.5 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 border border-white/20 shadow-xl drop-shadow">
            <span className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider drop-shadow-xs">
              ID:
            </span>
            <span
              className={`text-xs font-mono font-bold tracking-wide select-all drop-shadow-sm ${
                isOwner ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {kempoId}
            </span>
            {/* Small Copy icon/button right next to User ID */}
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-neutral-200 hover:text-white text-[10px] font-semibold transition active:scale-95 cursor-pointer ml-0.5"
              title="Copy User ID"
            >
              {copiedId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-red-400 shrink-0" />
                  <span>Copy</span>
                </>
              )}
            </button>
            {/* Share Button */}
            <button
              type="button"
              onClick={handleShareId}
              className="p-1 rounded-md bg-white/15 hover:bg-white/25 text-neutral-300 hover:text-white transition active:scale-95 cursor-pointer"
              title="Share ID"
            >
              <Share2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* WhatsApp-Style Group 1: Subscriptions, Lists, Broadcasts, Starred, Linked Devices (Direct Overlay, No Dark Box) */}
        <div className="divide-y divide-white/15">
          {/* 1. Subscriptions */}
          <div
            onClick={() => setActiveSubScreen('subscriptions')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-600/35 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Sparkles className="w-4 h-4 text-red-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Subscriptions
                </h4>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>

          {/* 2. Lists */}
          <div
            onClick={() => setActiveSubScreen('lists')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-600/35 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <List className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Lists
                </h4>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>

          {/* 3. Broadcast messages */}
          <div
            onClick={() => setActiveSubScreen('broadcast')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-600/35 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Broadcast messages
                </h4>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>

          {/* 4. Starred */}
          <div
            onClick={() => setActiveSubScreen('starred')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-600/35 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Star className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Starred
                </h4>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>

          {/* 5. Linked devices */}
          <div
            onClick={() => setActiveSubScreen('linked_devices')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/35 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Linked devices
                </h4>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>
        </div>

        {/* WhatsApp-Style Group 2: Account, Privacy, Chats, Appearance, Notifications, Install, Log Out (Direct Overlay, No Dark Box) */}
        <div className="divide-y divide-white/15 pt-2">
          {/* 1. Account */}
          <div
            onClick={() => setActiveSubScreen('account')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-600/35 border border-red-500/40 text-red-500 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Account
                </h4>
                <p className="text-[12px] text-neutral-200 truncate drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  Security, passkeys & ID
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>

          {/* 2. Privacy */}
          <div
            onClick={() => setActiveSubScreen('privacy')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600/35 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Key className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Privacy
                </h4>
                <p className="text-[12px] text-neutral-200 truncate flex items-center gap-1 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  <Shield className="w-3 h-3 text-emerald-400 shrink-0 inline" />
                  <span>{getBackendPrivacyStatus(rawEmail)}</span>
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>

          {/* 3. Chats */}
          <div
            onClick={() => setActiveSubScreen('chats')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-600/35 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Chats
                </h4>
                <p className="text-[12px] text-neutral-200 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  Theme, wallpaper & chat history
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center border border-white/20 shadow-xs drop-shadow">
                1
              </span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          </div>

          {/* 4. Appearance (App Color & Theme) */}
          <div
            onClick={() => setActiveSubScreen('appearance')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-600/35 border border-red-500/40 text-red-500 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Palette className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Appearance
                </h4>
                <p className="text-[12px] text-neutral-200 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  Crimson Red (Active)
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>

          {/* 5. Notifications */}
          <div
            onClick={() => setActiveSubScreen('notifications')}
            className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-600/35 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Notifications
                </h4>
                <p className="text-[12px] text-neutral-200 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  Real device push alerts & sound
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>

          {/* 6. Add to Home Screen (shown when installable and not on home screen) */}
          {!isRunningOnHomeScreen && isInstallable && (
            <div
              onClick={onInstallPwa}
              className="p-3.5 hover:bg-white/10 active:bg-white/20 flex items-center justify-between cursor-pointer transition rounded-xl"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/35 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                    Add to Home Screen
                  </h4>
                  <p className="text-[12px] text-neutral-200 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                    Install for full-screen standalone experience
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          )}

          {/* 7. Log Out */}
          <div
            onClick={onSignOut}
            className="p-3.5 hover:bg-red-950/40 active:bg-red-900/50 flex items-center justify-between cursor-pointer transition rounded-xl"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-600/35 border border-red-500/40 text-red-500 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-red-400 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Log Out
                </h4>
                <p className="text-[12px] text-red-200/90 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  Sign out of this session
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>
        </div>

        {/* 8. Owner & Admin Console Button (Direct Overlay, Visible ONLY to the owner) */}
        {isOwner && (
          <div
            onClick={() => setShowAdminConsole(true)}
            className="p-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400 flex items-center justify-between cursor-pointer transition active:scale-[0.99] shadow-2xl shadow-amber-950/50"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-500 to-red-600 text-black flex items-center justify-center font-black shadow-lg shadow-amber-950/60 shrink-0">
                <Crown className="w-5 h-5 text-black fill-black" />
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                    Owner & Admin Console
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Admin Only
                  </span>
                </div>
                <p className="text-[12px] text-amber-200 font-medium truncate drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  View signed-in user emails, ban, suspend, verify & restrict accounts
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-300 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>
        )}

        {/* App Info Footer */}
        <div className="text-center pt-3 pb-6">
          <p className="text-[13px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
            KEMPO <span className="text-red-500">PRo</span>
          </p>
          <p className="text-[11px] text-white/80 mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
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


      {/* WhatsApp-Style Status / Thought Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#161619] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smile className="w-4 h-4 text-red-500" />
                Update Status / Thought
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                placeholder="I'm feeling..."
                maxLength={40}
                className="w-full h-11 px-3.5 rounded-xl bg-[#0e0e11] text-white placeholder-neutral-500 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-red-500 transition"
              />

              <p className="text-xs font-semibold text-neutral-400">Quick options:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Available on Kempo Pro",
                  "I'm feeling great!",
                  "At work",
                  "Gaming & Streaming",
                  "In a meeting",
                  "Battery low",
                  "Chilling",
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStatusInput(suggestion)}
                    className="px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium transition cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = statusInput.trim() || 'Available on Kempo Pro';
                    setStatusThought(val);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('kempo_status_thought', val);
                    }
                    setShowStatusModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950 active:scale-95 transition cursor-pointer"
                >
                  Save Status
                </button>
              </div>
            </div>
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

      {/* Dedicated Profile Editing Screen (Matching IMG_4734 & IMG_4733) */}
      {showProfileEdit && (
        <ProfileEditScreen
          userProfile={userProfile || null}
          currentUserEmail={currentUserEmail}
          currentUserName={currentUserName}
          onBack={() => setShowProfileEdit(false)}
          onSaveSuccess={(updated) => {
            onUpdateProfile?.(updated);
            if (updated.avatarUrl) {
              setAvatarUrl(updated.avatarUrl);
            }
            if (updated.coverUrl !== undefined) {
              setCoverUrl(updated.coverUrl);
              setCoverType(updated.coverType || (isVideoMediaUrl(updated.coverUrl) ? 'video' : 'image'));
            }
          }}
        />
      )}

      {/* 1. Notifications Sub-Screen */}
      {activeSubScreen === 'notifications' && (
        <NotificationSettingsScreen
          userProfile={userProfile}
          onBack={() => setActiveSubScreen('none')}
          onUpdatePreferences={onUpdatePreferences}
          onUpdateProfile={onUpdateProfile}
        />
      )}

      {/* 2. Privacy Sub-Screen */}
      {activeSubScreen === 'privacy' && (
        <PrivacySettingsScreen
          userProfile={userProfile}
          currentUserEmail={currentUserEmail}
          onBack={() => setActiveSubScreen('none')}
          onUpdatePreferences={onUpdatePreferences}
          onUpdateProfile={onUpdateProfile}
        />
      )}

      {/* 3. Account Sub-Screen */}
      {activeSubScreen === 'account' && (
        <AccountSettingsScreen
          userProfile={userProfile}
          currentUserEmail={currentUserEmail}
          onBack={() => setActiveSubScreen('none')}
          onSignOut={onSignOut}
        />
      )}

      {/* 4. Subscriptions Sub-Screen */}
      {activeSubScreen === 'subscriptions' && (
        <SubscriptionsScreen
          userProfile={userProfile}
          currentUserEmail={currentUserEmail}
          onBack={() => setActiveSubScreen('none')}
        />
      )}

      {/* 5. Lists Sub-Screen */}
      {activeSubScreen === 'lists' && (
        <ListsScreen
          onBack={() => setActiveSubScreen('none')}
          chats={chats}
          onOpenChat={onOpenChat}
        />
      )}

      {/* 6. Broadcast Messages Sub-Screen */}
      {activeSubScreen === 'broadcast' && (
        <BroadcastScreen
          onBack={() => setActiveSubScreen('none')}
          chats={chats}
          onSendMessage={onSendMessage}
        />
      )}

      {/* 7. Starred Messages Sub-Screen */}
      {activeSubScreen === 'starred' && (
        <StarredMessagesScreen
          onBack={() => setActiveSubScreen('none')}
          chats={chats}
          onOpenChat={onOpenChat}
        />
      )}

      {/* 8. Linked Devices Sub-Screen */}
      {activeSubScreen === 'linked_devices' && (
        <LinkedDevicesScreen
          onBack={() => setActiveSubScreen('none')}
        />
      )}

      {/* 9. Chats & Wallpaper Sub-Screen */}
      {activeSubScreen === 'chats' && (
        <ChatSettingsScreen
          userProfile={userProfile}
          onBack={() => setActiveSubScreen('none')}
          onUpdatePreferences={onUpdatePreferences}
          onUpdateProfile={onUpdateProfile}
          chats={chats}
          onClearChats={onClearChats}
        />
      )}

      {/* 10. Appearance Sub-Screen */}
      {activeSubScreen === 'appearance' && (
        <AppearanceSettingsScreen
          onBack={() => setActiveSubScreen('none')}
        />
      )}
      </div>
    </div>
  );
};

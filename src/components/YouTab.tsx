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
  OWNER_FIXED_ID,
  validateAndFormatUserId,
  getBackendPrivacyStatus,
  generateStandardUserKempoId,
} from '../lib/accountRules';
import { AdminConsoleModal } from './AdminConsoleModal';
import { ProfileEditScreen } from './ProfileEditScreen';

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

  // Helper to verify ID follows Kempo Pro naming conventions
  const isKempoFormatted = (id?: string) => {
    if (!id) return false;
    const upper = id.trim().toUpperCase();
    return upper.startsWith('KEMPO') || upper.startsWith('KEMPO PRO') || upper.startsWith('KEMPO-');
  };

  // Ensure country dial code selected during onboarding (e.g., +234) remains permanently attached to the user's shareable ID
  const countryPrefix =
    userProfile?.countryCode ||
    (typeof window !== 'undefined' ? localStorage.getItem('kempo_country_code') || '+234' : '+234');
  const cleanCode = countryPrefix.startsWith('+') ? countryPrefix : `+${countryPrefix}`;
  const rawSuffix =
    userProfile?.rawIdEntry ||
    (userProfile?.phoneNumber ? userProfile.phoneNumber.replace(cleanCode, '') : '') ||
    'A5738';

  // Display complete ID format (e.g., "Kempo Pro +234 [ID]") prominently without dropping the country prefix
  const kempoId =
    userProfile?.kempoId && userProfile.kempoId.includes('+')
      ? userProfile.kempoId
      : `Kempo Pro ${cleanCode}${rawSuffix}`;

  const displayName =
    userProfile?.displayName ||
    currentUserName ||
    (isOwner ? 'Precious Ddkid' : 'Kempo User');
  const accountType = isOwner ? 'creator' : userProfile?.category || userProfile?.accountType || 'personal';

  // Auto-correct any legacy non-Kempo IDs so every regular user has Kempo Pro ID
  useEffect(() => {
    if (!isOwner && userProfile?.kempoId && !isKempoFormatted(userProfile.kempoId)) {
      const standardId = userProfile.countryCode
        ? `Kempo Pro ${userProfile.countryCode} ${userProfile.phoneNumber || 'A5738'}`
        : generateStandardUserKempoId();
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

  // Cover photo / video header background state (Supports Images & Videos)
  const [coverUrl, setCoverUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        userProfile?.coverUrl ||
        localStorage.getItem('kempo_user_cover') ||
        ''
      );
    }
    return userProfile?.coverUrl || '';
  });
  const [coverType, setCoverType] = useState<'image' | 'video'>(() => {
    if (userProfile?.coverType) return userProfile.coverType;
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('kempo_user_cover_type');
      if (cached === 'video' || cached === 'image') return cached;
      const url = localStorage.getItem('kempo_user_cover');
      if (isVideoMediaUrl(url || '')) return 'video';
    }
    return isVideoMediaUrl(userProfile?.coverUrl) ? 'video' : 'image';
  });

  // Sync cover photo/video if userProfile changes
  useEffect(() => {
    if (userProfile?.coverUrl !== undefined) {
      setCoverUrl(userProfile.coverUrl || '');
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
      <div className="flex items-center justify-between pb-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareId}
            className="w-9 h-9 rounded-full bg-[#1c1c1e] hover:bg-[#252528] text-neutral-200 hover:text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
            title="QR Code & Share ID"
          >
            <QrCode className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setShowProfileEdit(true)}
            className="w-9 h-9 rounded-full bg-[#1c1c1e] hover:bg-[#252528] text-neutral-200 hover:text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
            title="Edit Profile"
            aria-label="Edit Profile"
          >
            <Edit3 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* 1. Full-Bleed Cover Photo/Video & Profile Hero (No Dark Box) */}
      <div className="relative rounded-3xl overflow-hidden border border-neutral-800/80 shadow-2xl min-h-[310px] sm:min-h-[340px] flex flex-col justify-end">
        {/* Full-Bleed Cover Background Video or Picture Stretching Full Width & Height */}
        <div
          onClick={() => setShowProfileEdit(true)}
          className="absolute inset-0 w-full h-full cursor-pointer group overflow-hidden bg-gradient-to-br from-[#17171d] via-[#22222a] to-[#16161c]"
          title="Tap to edit profile & cover photo or video"
        >
          {coverUrl ? (
            isVideoMediaUrl(coverUrl) || coverType === 'video' ? (
              <video
                src={coverUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover group-hover:scale-102 transition duration-500 pointer-events-none"
              />
            ) : (
              <img
                src={coverUrl}
                alt="Profile Cover Background"
                className="w-full h-full object-cover group-hover:scale-102 transition duration-500 pointer-events-none"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-end p-3 text-neutral-600 group-hover:text-neutral-400 transition bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/40 via-transparent to-transparent">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500/70 mr-1 drop-shadow">
                Kempo Pro
              </span>
            </div>
          )}
          {/* Seamless gradient overlay ensuring user details & text remain ultra-readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25 pointer-events-none" />
        </div>

        {/* User Details Overlaid Directly on Top of Full-Bleed Cover */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 pt-8 pb-5 select-none">
          {/* Centered Circular Avatar with Camera Uploader */}
          <div
            className="relative cursor-pointer group mb-2"
            onClick={() => setShowProfileEdit(true)}
          >
            <div
              className={`w-24 h-24 rounded-full overflow-hidden ring-4 ${
                isOwner
                  ? 'ring-amber-500/80 shadow-amber-950/40'
                  : 'ring-red-600 shadow-red-950/50'
              } bg-[#161619]/80 backdrop-blur-xs flex items-center justify-center shadow-2xl transition group-hover:scale-102`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-neutral-200 font-black">
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
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-black/80 ring-2 ring-black active:scale-90 transition cursor-pointer"
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
            className="inline-flex items-center gap-1.5 px-3 py-1 mb-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-[11px] text-neutral-200 shadow-lg transition active:scale-95 cursor-pointer relative"
            title="Tap to update status"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="font-medium max-w-[200px] truncate drop-shadow-sm">{statusThought}</span>
          </button>

          {/* Centered Display Name with Clean Drop Shadow */}
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2 mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            <span>{displayName}</span>
            {isOwner ? (
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black inline-block shadow-sm" title="Online"></span>
            )}
          </h2>

          {/* Account Badge */}
          <div className="mt-1 flex items-center justify-center">
            {isOwner ? (
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-lg shadow-black/60 border border-amber-400/40 flex items-center gap-1.5 backdrop-blur-xs">
                <span>👑</span>
                <span>KEMPO PRO OWNER & ADMIN</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-red-300 border border-red-800/50 shadow-md">
                {accountType === 'personal' && 'Personal Account'}
                {accountType === 'business' && 'Business Account'}
                {accountType === 'creator' && 'Creator Profile'}
                {accountType === 'developer_gamer' && 'Developer / Gamer'}
              </span>
            )}
          </div>

          {/* 2. User ID Sizing & Copy Button */}
          <div className="mt-2.5 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 shadow-lg">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              ID:
            </span>
            <span
              className={`text-xs font-mono font-bold tracking-wide select-all ${
                isOwner ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {kempoId}
            </span>
            {/* Small Copy icon/button right next to User ID */}
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-white text-[10px] font-semibold transition active:scale-95 cursor-pointer ml-0.5"
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
              className="p-1 rounded-md bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition active:scale-95 cursor-pointer"
              title="Share ID"
            >
              <Share2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp-Style Group 1: Subscriptions, Lists, Broadcasts, Starred, Linked Devices */}
      <div className="rounded-2xl bg-[#161619] border border-neutral-800/80 overflow-hidden divide-y divide-[#222226]">
        {/* 1. Subscriptions */}
        <div
          onClick={() => {
            alert(
              "KEMPO PRo Subscriptions:\n\nAll premium features, unlimited encrypted voice & video calls, end-to-end security, and real-time messaging are permanently active for your account."
            );
          }}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600/20 to-purple-600/20 text-red-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-red-500" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Subscriptions</h4>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 2. Lists */}
        <div
          onClick={() => {
            alert("Lists: Organize custom contacts and group categories.");
          }}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center shrink-0">
              <List className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Lists</h4>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 3. Broadcast messages */}
        <div
          onClick={() => {
            alert("Broadcast Messages: Send announcements to multiple contacts simultaneously.");
          }}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Broadcast messages</h4>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 4. Starred */}
        <div
          onClick={() => {
            alert("Starred Messages: View your saved messages and highlights.");
          }}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Starred</h4>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 5. Linked devices */}
        <div
          onClick={() => {
            alert("Linked Devices: 1 active browser session on this device. Real-time encryption active.");
          }}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Linked devices</h4>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>
      </div>

      {/* WhatsApp-Style Group 2: Account, Privacy, Chats, Appearance, Notifications, Install, Log Out */}
      <div className="rounded-2xl bg-[#161619] border border-neutral-800/80 overflow-hidden divide-y divide-[#222226]">
        {/* 1. Account */}
        <div
          onClick={() => {
            alert(
              `Account Information:\n\nUser ID: ${kempoId}\nAccount Type: ${accountType.toUpperCase()}\nStatus: Active\n\nYour profile is safely stored offline and synced with Supabase.`
            );
          }}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Account</h4>
              <p className="text-[11px] text-neutral-400 truncate">Security, passkeys & ID</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 2. Privacy */}
        <div
          onClick={() => {
            alert(
              `Privacy & Account Security:\n\nAccount Status: Active & Encrypted\nUser ID: ${kempoId}\nAccount Type: ${
                isOwner ? '👑 Kempo Pro Owner / Admin' : 'Standard Account'
              }\n\nBackend Email Privacy: Active\nYour sign-in email is handled strictly by the backend server and is never exposed or visible on the app frontend.\n\nEnd-to-End Encryption: Enabled`
            );
          }}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Privacy</h4>
              <p className="text-[11px] text-neutral-400 truncate flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400 shrink-0 inline" />
                <span>{getBackendPrivacyStatus(rawEmail)}</span>
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 3. Chats */}
        <div
          onClick={() => {
            alert('Chats & Wallpaper settings: WhatsApp dark doodle wallpaper is active.');
          }}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Chats</h4>
              <p className="text-[11px] text-neutral-400">Theme, wallpaper & chat history</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center justify-center">
              1
            </span>
            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
          </div>
        </div>

        {/* 4. Appearance (App Color & Theme) */}
        <div
          onClick={onOpenThemeSettings}
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Appearance</h4>
              <p className="text-[11px] text-neutral-400">Crimson Red (Active)</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 5. Notifications */}
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
          className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-white">Notifications</h4>
              <p className="text-[11px] text-neutral-400">
                {userProfile?.preferences?.messageTones !== false ? 'In-app sounds enabled' : 'Muted'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
        </div>

        {/* 6. Add to Home Screen (shown when installable and not on home screen) */}
        {!isRunningOnHomeScreen && isInstallable && (
          <div
            onClick={onInstallPwa}
            className="p-3.5 hover:bg-[#1c1c20] flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[14px] font-semibold text-white">Add to Home Screen</h4>
                <p className="text-[11px] text-neutral-400">Install for full-screen standalone experience</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
          </div>
        )}

        {/* 7. Log Out */}
        <div
          onClick={onSignOut}
          className="p-3.5 hover:bg-red-950/30 flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-bold text-red-400">Log Out</h4>
              <p className="text-[11px] text-neutral-400">Sign out of this session</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
        </div>
      </div>

      {/* 8. Owner & Admin Console Button (Visible ONLY to the owner) */}
      {isOwner && (
        <div
          onClick={() => setShowAdminConsole(true)}
          className="p-4 rounded-2xl bg-gradient-to-r from-red-950 via-[#1f1216] to-[#2a170d] border-2 border-amber-500/70 hover:border-amber-400 flex items-center justify-between cursor-pointer transition active:scale-[0.99] shadow-2xl shadow-red-950/60"
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
    </div>
  );
};

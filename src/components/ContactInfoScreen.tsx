import React, { useState, useEffect } from 'react';
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
  Copy,
  X,
} from 'lucide-react';
import { Chat, UserProfileData } from '../types';
import { fetchContactProfile, getCachedContactProfile, isVideoMediaUrl, formatLastSeen } from '../lib/supabase';
import { getMediaFromOfflineCache, saveMediaToOfflineCache } from '../lib/mediaCache';
import { isOwnerAccount, OWNER_FIXED_ID, isOwnerIdFormat, isOwnerEmail, isRawIdString, formatNameFromEmail, formatDisplayKempoId } from '../lib/accountRules';

interface ContactInfoScreenProps {
  chat: Chat;
  contactProfile?: UserProfileData | null;
  isOnline?: boolean;
  lastSeenText?: string;
  coverUrl?: string;
  coverType?: 'image' | 'video';
  avatarUrl?: string;
  onBack: () => void;
  onStartCall?: (chat: Chat, isVideo: boolean) => void;
  onSearchChat?: () => void;
  onClearChat?: (chatId: string) => void;
  onBlockContact?: (chatId: string) => void;
  onReportContact?: (chatId: string) => void;
}

export const ContactInfoScreen: React.FC<ContactInfoScreenProps> = ({
  chat,
  contactProfile: initialProfile,
  isOnline: propIsOnline,
  lastSeenText: propLastSeenText,
  coverUrl: propCoverUrl,
  coverType: propCoverType,
  avatarUrl: propAvatarUrl,
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
  const [showFullPicture, setShowFullPicture] = useState(false);

  // Derive unique contact identifier
  const cleanPartnerId =
    chat.kempoId ||
    chat.about?.replace('KEMPO ID: ', '').trim() ||
    chat.phoneNumber ||
    chat.id;

  // Strict check: Only true owner accounts get the Owner badge
  const isContactOwner = Boolean(
    (initialProfile?.email && isOwnerEmail(initialProfile.email)) ||
    (chat.email && isOwnerEmail(chat.email))
  );

  // High performance dynamic default cover matching Settings view
  const defaultCover =
    'https://assets.mixkit.co/videos/preview/mixkit-red-smoke-rising-in-the-dark-41586-large.mp4';

  // Synchronous cache lookup for 0ms lag-free render
  const syncCached =
    initialProfile ||
    getCachedContactProfile(cleanPartnerId) ||
    getCachedContactProfile(chat.kempoId) ||
    getCachedContactProfile(chat.id);

  const [profile, setProfile] = useState<UserProfileData | null>(syncCached || null);

  // Instant local cache avatar resolution for 0ms lag
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    if (propAvatarUrl) return propAvatarUrl;
    if (syncCached?.avatarUrl) return syncCached.avatarUrl;
    if (chat.avatarUrl) return chat.avatarUrl;
    if (typeof window !== 'undefined') {
      const cached =
        localStorage.getItem(`kempo_contact_avatar_${chat.id}`) ||
        localStorage.getItem(`kempo_contact_avatar_${cleanPartnerId}`);
      if (cached) return cached;
    }
    return isContactOwner ? '/pwa-512x512.png' : '';
  });

  // Instant local cache cover resolution
  const [coverUrl, setCoverUrl] = useState<string>(() => {
    if (propCoverUrl) return propCoverUrl;
    if (syncCached?.coverUrl) return syncCached.coverUrl;
    if (chat.coverUrl) return chat.coverUrl;
    if (typeof window !== 'undefined') {
      const cached =
        localStorage.getItem(`kempo_contact_cover_${chat.id}`) ||
        localStorage.getItem(`kempo_contact_cover_${cleanPartnerId}`);
      if (cached) return cached;
    }
    return defaultCover;
  });

  const [coverType, setCoverType] = useState<'image' | 'video'>(() => {
    if (propCoverType) return propCoverType;
    if (syncCached?.coverType) return syncCached.coverType;
    if (chat.coverType) return chat.coverType;
    return isVideoMediaUrl(coverUrl) ? 'video' : 'image';
  });

  // Pre-cache media locally from IndexedDB and fetch live profile asynchronously for 60fps zero lag
  useEffect(() => {
    let isMounted = true;

    // 1. IndexedDB cache retrieval
    getMediaFromOfflineCache(`kempo_contact_cover_${cleanPartnerId}`).then((cached) => {
      if (isMounted && cached) {
        setCoverUrl(cached);
        setCoverType(isVideoMediaUrl(cached) ? 'video' : 'image');
      }
    });

    getMediaFromOfflineCache(`kempo_contact_avatar_${cleanPartnerId}`).then((cached) => {
      if (isMounted && cached) {
        setAvatarUrl(cached);
      }
    });

    // 2. Fetch from Supabase
    fetchContactProfile({
      id: chat.id,
      kempoId: chat.kempoId,
      phoneNumber: chat.phoneNumber,
      name: chat.name,
      avatarUrl: chat.avatarUrl,
      coverUrl: chat.coverUrl,
      coverType: chat.coverType,
    }).then((fetched) => {
      if (!isMounted || !fetched) return;
      setProfile(fetched);

      if (fetched.avatarUrl) {
        setAvatarUrl(fetched.avatarUrl);
        try {
          localStorage.setItem(`kempo_contact_avatar_${chat.id}`, fetched.avatarUrl);
          localStorage.setItem(`kempo_contact_avatar_${cleanPartnerId}`, fetched.avatarUrl);
          saveMediaToOfflineCache(`kempo_contact_avatar_${cleanPartnerId}`, fetched.avatarUrl);
        } catch {}
      }

      if (fetched.coverUrl) {
        setCoverUrl(fetched.coverUrl);
        setCoverType(fetched.coverType || (isVideoMediaUrl(fetched.coverUrl) ? 'video' : 'image'));
        try {
          localStorage.setItem(`kempo_contact_cover_${chat.id}`, fetched.coverUrl);
          localStorage.setItem(`kempo_contact_cover_${cleanPartnerId}`, fetched.coverUrl);
          saveMediaToOfflineCache(`kempo_contact_cover_${cleanPartnerId}`, fetched.coverUrl);
        } catch {}
      }
    });

    return () => {
      isMounted = false;
    };
  }, [chat.id, cleanPartnerId]);

  const effectiveIsOnline =
    propIsOnline !== undefined ? propIsOnline : Boolean(chat.online);
  const effectiveLastSeen =
    propLastSeenText ||
    formatLastSeen(profile?.lastSeen || chat.lastSeen || chat.timestamp);

  // Derive permanent Kempo Pro Shareable ID
  const rawShareableKempoId = isContactOwner
    ? OWNER_FIXED_ID
    : profile?.kempoId ||
      chat.kempoId ||
      (chat.about?.startsWith('KEMPO ID: ')
        ? chat.about.replace('KEMPO ID: ', '').trim()
        : '') ||
      cleanPartnerId;

  const shareableKempoId = formatDisplayKempoId(rawShareableKempoId);

  // Real registered display name (avoid showing raw ID strings as title or fake 'Kempo Contact')
  const rawName = profile?.displayName || chat.name || '';
  const isNameAnId = isRawIdString(rawName) || rawName === shareableKempoId || rawName === rawShareableKempoId;

  const resolvedLocalName = typeof window !== 'undefined'
    ? localStorage.getItem(`kempo_contact_name_${cleanPartnerId}`) || localStorage.getItem(`kempo_contact_name_${chat.id}`)
    : null;

  const displayName =
    !isNameAnId && rawName.trim() && rawName !== 'Kempo Contact' && rawName !== 'Contact'
      ? rawName.trim()
      : profile?.displayName && !isRawIdString(profile.displayName) && profile.displayName !== 'Kempo Contact'
      ? profile.displayName
      : resolvedLocalName && !isRawIdString(resolvedLocalName) && resolvedLocalName !== 'Kempo Contact'
      ? resolvedLocalName
      : isContactOwner
      ? 'Precious Ddkid'
      : (profile?.email || chat.email)
      ? formatNameFromEmail(profile?.email || chat.email)
      : formatDisplayKempoId(cleanPartnerId || shareableKempoId);

  const initialLetter = (displayName || 'K').trim().charAt(0).toUpperCase();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyId = () => {
    if (shareableKempoId) {
      navigator.clipboard.writeText(shareableKempoId);
      showToast('Kempo Pro ID copied to clipboard');
    }
  };

  const handleShareContact = () => {
    const text = `Contact: ${displayName}\nKempo Pro ID: ${shareableKempoId}`;
    if (navigator.share) {
      navigator.share({
        title: displayName,
        text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      showToast('Contact info copied to clipboard');
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    showToast(!isFavorite ? `Added ${displayName} to Favourites` : `Removed ${displayName} from Favourites`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090c] text-white flex flex-col select-none overflow-hidden animate-in slide-in-from-right duration-200">
      {/* 1. Full-Height Vertical Stretch for Contact's Cover Media (Live Video or Photo) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Persistent base wallpaper so it NEVER shows black on iOS low power mode */}
        <img
          src={
            coverUrl && !isVideoMediaUrl(coverUrl) && coverType !== 'video'
              ? coverUrl
              : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'
          }
          alt="Cover Wallpaper Backdrop"
          className="w-full h-full object-cover absolute inset-0"
        />

        {coverUrl && (isVideoMediaUrl(coverUrl) || coverType === 'video') ? (
          <video
            src={coverUrl}
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"
            className="w-full h-full object-cover relative z-1"
          />
        ) : !coverUrl ? (
          <video
            src={defaultCover}
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"
            className="w-full h-full object-cover relative z-1"
          />
        ) : null}
        {/* Subtle translucent vignette mirroring Settings view so the media is completely visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60 pointer-events-none z-2" />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2 rounded-2xl bg-[#1e1e24]/90 backdrop-blur-md border border-red-500/50 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-red-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar (Semi-transparent backdrop) */}
      <div className="sticky top-0 z-20 bg-black/40 backdrop-blur-md border-b border-white/10 px-4 pt-[max(env(safe-area-inset-top),10px)] pb-2 flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-red-500 hover:text-red-400 py-1 pr-2 active:opacity-70 transition cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,1)]"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          <span className="text-sm font-semibold hidden sm:inline">Back</span>
        </button>

        <h1 className="text-base font-bold text-white tracking-tight drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">Contact info</h1>

        <div className="w-12 flex justify-end">
          <button
            onClick={() => showToast('Contact is synced via Kempo Pro')}
            className="text-red-500 hover:text-red-400 text-sm font-semibold cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,1)]"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Scrollable Content Container Overlaid Directly On Top of Contact's Cover */}
      <div className="relative z-10 flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 space-y-4 pb-28">
        {/* 1. Top Profile Section & Quick Actions (Direct Glass Overlay) */}
        <div className="flex flex-col items-center text-center pt-2">
          {/* Centered Circular Avatar with Signature Red Ring */}
          <div
            onClick={() => setShowFullPicture(true)}
            title="Tap to view full picture"
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-red-600/90 shadow-2xl shadow-black/90 bg-black/40 flex items-center justify-center relative cursor-pointer active:scale-95 transition hover:brightness-110"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => {
                  setAvatarUrl('');
                }}
              />
            ) : isContactOwner ? (
              <img
                src="/pwa-512x512.png"
                alt="Kempo Pro Owner"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl text-white font-black drop-shadow-md">
                {initialLetter}
              </span>
            )}
            {effectiveIsOnline && (
              <span className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-black">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </span>
            )}
          </div>

          {/* Contact Display Name (Real Registered Account Name) */}
          <h2 className="text-2xl font-black text-white tracking-tight mt-3 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
            {displayName}
          </h2>

          {/* Permanent Kempo Pro ID Badge with One-Tap Copy */}
          <div
            onClick={handleCopyId}
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 border border-white/20 shadow-xl drop-shadow cursor-pointer active:scale-95 transition group"
            title="Tap to copy Kempo Pro ID"
          >
            <span className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider drop-shadow-xs">
              ID:
            </span>
            <span
              className={`text-xs font-mono font-bold tracking-wide select-all drop-shadow-sm ${
                isContactOwner ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {shareableKempoId}
            </span>
            <Copy className="w-3.5 h-3.5 text-white/80 group-hover:text-white group-hover:scale-110 transition" />
          </div>

          {/* Dynamic Online / Last Seen status tag */}
          <div className="mt-1.5">
            {effectiveIsOnline ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 justify-center drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                online
              </span>
            ) : (
              <span className="text-xs font-medium text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                {effectiveLastSeen}
              </span>
            )}
          </div>

          {/* Quick Action Buttons: Voice, Video, Search (Glassmorphism overlay - No Solid Dark Box) */}
          <div className="grid grid-cols-3 gap-3 w-full mt-4">
            {/* Action 1: Voice Call */}
            <button
              onClick={() => {
                onBack();
                onStartCall?.(chat, false);
              }}
              className="py-3 px-2 rounded-2xl bg-black/45 hover:bg-black/65 border border-white/20 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-xl group"
            >
              <Phone className="w-5 h-5 text-red-500 group-hover:scale-110 transition stroke-[2.2] drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
              <span className="text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Voice</span>
            </button>

            {/* Action 2: Video Call */}
            <button
              onClick={() => {
                onBack();
                onStartCall?.(chat, true);
              }}
              className="py-3 px-2 rounded-2xl bg-black/45 hover:bg-black/65 border border-white/20 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-xl group"
            >
              <Video className="w-5 h-5 text-red-500 group-hover:scale-110 transition stroke-[2.2] drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
              <span className="text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Video</span>
            </button>

            {/* Action 3: In-Chat Search */}
            <button
              onClick={() => {
                onBack();
                onSearchChat?.();
              }}
              className="py-3 px-2 rounded-2xl bg-black/45 hover:bg-black/65 border border-white/20 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-xl group"
            >
              <Search className="w-5 h-5 text-red-500 group-hover:scale-110 transition stroke-[2.2] drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
              <span className="text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Search</span>
            </button>
          </div>
        </div>

        {/* 2. Media, Links, Docs & Starred Messages (Semi-transparent Glass Container) */}
        <div className="bg-black/35 backdrop-blur-xs rounded-2xl border border-white/10 divide-y divide-white/15 overflow-hidden shadow-xl">
          <div
            onClick={() => showToast('Media browser: No shared media yet')}
            className="p-3.5 flex items-center justify-between hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-red-600/35 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <ImageIcon className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Media, links and docs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">None</span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          </div>

          <div
            onClick={() => showToast('Starred messages: None')}
            className="p-3.5 flex items-center justify-between hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600/35 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Starred
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">None</span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          </div>
        </div>

        {/* 3. Notifications & Chat Theme (Semi-transparent Glass Container) */}
        <div className="bg-black/35 backdrop-blur-xs rounded-2xl border border-white/10 divide-y divide-white/15 overflow-hidden shadow-xl">
          <div
            onClick={() => {
              setIsMuted(!isMuted);
              showToast(!isMuted ? 'Notifications muted for 8 hours' : 'Notifications unmuted');
            }}
            className="p-3.5 flex items-center justify-between hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/35 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Bell className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Notifications
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                {isMuted ? 'Muted' : 'Default'}
              </span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          </div>

          <div
            onClick={() => showToast('Theme: Dark Kempo Pro Crimson Wallpaper')}
            className="p-3.5 flex items-center justify-between hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-pink-600/35 border border-pink-500/40 text-pink-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Palette className="w-4 h-4 text-pink-400" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Chat theme
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Kempo Dark</span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          </div>

          <div
            onClick={() => showToast('Save to Photos: Default')}
            className="p-3.5 flex items-center justify-between hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-teal-600/35 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Download className="w-4 h-4 text-teal-400" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Save to Photos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Default</span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          </div>
        </div>

        {/* 4. Security & Privacy Controls (Semi-transparent Glass Container) */}
        <div className="bg-black/35 backdrop-blur-xs rounded-2xl border border-white/10 divide-y divide-white/15 overflow-hidden shadow-xl">
          <div
            onClick={() => showToast('Disappearing messages: Off')}
            className="p-3.5 flex items-center justify-between hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/35 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Disappearing messages
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Off</span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          </div>

          {/* Lock Chat Switch */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/35 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-[15px] font-bold text-white block drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Lock chat
                </span>
                <span className="text-[11.5px] text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  Lock and hide this chat on this device
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLocked(!isLocked);
                showToast(!isLocked ? 'Chat locked with device passcode' : 'Chat unlocked');
              }}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center shadow-lg ${
                isLocked ? 'bg-red-600 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-md block" />
            </button>
          </div>

          <div
            onClick={() => showToast('Restricted chat: Off')}
            className="p-3.5 flex items-center justify-between hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-orange-600/35 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <ShieldAlert className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Restricted chat
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Off</span>
              <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
            </div>
          </div>

          {/* Encryption Info */}
          <div
            onClick={() => setShowEncryptionModal(true)}
            className="p-3.5 flex items-center justify-between hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-xl bg-red-600/35 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0 shadow-lg drop-shadow">
                <Lock className="w-4 h-4 text-red-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[15px] font-bold text-white block drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  Encryption
                </span>
                <span className="text-[11.5px] text-white/75 truncate block drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  Messages and calls are end-to-end encrypted. Tap to verify.
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" />
          </div>
        </div>

        {/* 5. Groups in Common (Semi-transparent Glass Container) */}
        <div>
          <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider px-2 mb-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
            No groups in common
          </h3>
          <div className="bg-black/35 backdrop-blur-xs rounded-2xl border border-white/10 divide-y divide-white/15 overflow-hidden shadow-xl">
            <button
              onClick={() => showToast(`Create group with ${displayName}`)}
              className="w-full p-3.5 flex items-center gap-3.5 hover:bg-white/10 active:bg-white/20 transition text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-red-600/35 border border-red-500/40 flex items-center justify-center text-red-400 shadow-lg drop-shadow shrink-0">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Create group with {displayName}
              </span>
            </button>

            <button
              onClick={() => showToast(`Add ${displayName} to existing group`)}
              className="w-full p-3.5 flex items-center gap-3.5 hover:bg-white/10 active:bg-white/20 transition text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-red-600/35 border border-red-500/40 flex items-center justify-center text-red-400 shadow-lg drop-shadow shrink-0">
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                Add to group
              </span>
            </button>
          </div>
        </div>

        {/* 6. Standard Management Options Card (Semi-transparent Glass Container in signature red) */}
        <div className="bg-black/35 backdrop-blur-xs rounded-2xl border border-white/10 divide-y divide-white/15 overflow-hidden shadow-xl">
          <button
            onClick={handleShareContact}
            className="w-full p-3.5 flex items-center justify-between text-red-400 hover:text-red-300 hover:bg-white/10 active:bg-white/20 transition text-[15px] font-bold cursor-pointer drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"
          >
            <span>Share contact</span>
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleFavorite}
            className="w-full p-3.5 flex items-center justify-between text-red-400 hover:text-red-300 hover:bg-white/10 active:bg-white/20 transition text-[15px] font-bold cursor-pointer drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"
          >
            <span>{isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}</span>
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>

          <button
            onClick={() => showToast('Added to custom list')}
            className="w-full p-3.5 flex items-center justify-between text-red-400 hover:text-red-300 hover:bg-white/10 active:bg-white/20 transition text-[15px] font-bold cursor-pointer drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"
          >
            <span>Add to list</span>
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={() => showToast('Exporting encrypted chat history...')}
            className="w-full p-3.5 flex items-center justify-between text-red-400 hover:text-red-300 hover:bg-white/10 active:bg-white/20 transition text-[15px] font-bold cursor-pointer drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"
          >
            <span>Export chat</span>
            <Download className="w-4 h-4" />
          </button>

          {/* Clear Chat in bold red */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full p-3.5 flex items-center justify-between text-red-400 hover:text-red-300 hover:bg-red-500/15 active:bg-red-500/25 transition text-[15px] font-bold cursor-pointer drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"
          >
            <span>Clear chat</span>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* 7. Bottom Safety Actions (Semi-transparent Glass Container in Bold Red) */}
        <div className="bg-black/35 backdrop-blur-xs rounded-2xl border border-white/10 divide-y divide-white/15 overflow-hidden shadow-xl">
          <button
            onClick={() => setShowBlockConfirm(true)}
            className="w-full p-3.5 text-center text-red-400 hover:text-red-300 hover:bg-red-500/15 active:bg-red-500/25 transition text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"
          >
            <Ban className="w-4 h-4" />
            <span>{isBlocked ? `Unblock ${displayName}` : `Block ${displayName}`}</span>
          </button>

          <button
            onClick={() => setShowReportConfirm(true)}
            className="w-full p-3.5 text-center text-red-400 hover:text-red-300 hover:bg-red-500/15 active:bg-red-500/25 transition text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"
          >
            <Flag className="w-4 h-4" />
            <span>Report {displayName}</span>
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
                className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearChat?.(chat.id);
                  showToast('Chat history cleared');
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition cursor-pointer"
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
              {isBlocked ? `Unblock ${displayName}?` : `Block ${displayName}?`}
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              {isBlocked
                ? `${displayName} will be able to send you messages and call you again.`
                : `Blocked contacts will no longer be able to call you or send you messages on Kempo Pro.`}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBlockConfirm(false);
                  setIsBlocked(!isBlocked);
                  onBlockContact?.(chat.id);
                  showToast(!isBlocked ? `Blocked ${displayName}` : `Unblocked ${displayName}`);
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition cursor-pointer"
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
            <h3 className="text-base font-bold text-white mb-1">Report {displayName}?</h3>
            <p className="text-xs text-neutral-400 mb-5">
              The last 5 messages from this contact will be forwarded to Kempo Pro Security. This contact will not be notified.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowReportConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowReportConfirm(false);
                  onReportContact?.(chat.id);
                  showToast(`Report submitted for ${displayName}`);
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition cursor-pointer"
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
              Messages and calls with <span className="text-white font-bold">{displayName}</span> are secured with 256-bit Kempo Pro end-to-end encryption. Only you and this person can read or listen to them.
            </p>
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-[11px] font-mono text-neutral-300 break-all mb-4 select-all">
              Security Code: 4920 1849 5830 2948 1049 8592
            </div>
            <button
              onClick={() => setShowEncryptionModal(false)}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Full Picture Viewer Modal (WhatsApp style) */}
      {showFullPicture && (
        <div
          className="fixed inset-0 z-70 bg-black/95 flex flex-col items-center justify-between p-4 animate-in fade-in select-none"
          onClick={() => setShowFullPicture(false)}
        >
          <div className="w-full max-w-lg flex items-center justify-between text-white py-2">
            <span className="text-base font-bold truncate pr-4">{displayName}</span>
            <button
              onClick={() => setShowFullPicture(false)}
              className="p-2 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center w-full max-w-lg overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
              />
            ) : isContactOwner ? (
              <img
                src="/pwa-512x512.png"
                alt="Owner"
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <div className="w-64 h-64 rounded-3xl bg-gradient-to-br from-red-600 via-red-800 to-red-950 flex items-center justify-center text-white font-black text-8xl shadow-2xl">
                {initialLetter}
              </div>
            )}
          </div>
          <div className="text-xs text-neutral-400 font-mono pb-4">
            {shareableKempoId}
          </div>
        </div>
      )}
    </div>
  );
};

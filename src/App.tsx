import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { ArchivedRow } from './components/ArchivedRow';
import { ChatListItem } from './components/ChatListItem';
import { BottomTabBar } from './components/BottomTabBar';
import { KempoAiOrb } from './components/KempoAiOrb';
import { ChatRoom } from './components/ChatRoom';
import { UpdatesTab } from './components/UpdatesTab';
import { CallsTab } from './components/CallsTab';
import { CommunitiesTab } from './components/CommunitiesTab';
import { YouTab } from './components/YouTab';
import { PWAInstallModal } from './components/PWAInstallModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { KempoAiModal } from './components/KempoAiModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { NewChatModal } from './components/NewChatModal';
import { NewContactModal } from './components/NewContactModal';
import { ActiveCallModal } from './components/ActiveCallModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { ActionMenuModal } from './components/ActionMenuModal';
import { CameraModal } from './components/CameraModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ChatActionSheetModal } from './components/ChatActionSheetModal';
import { InAppNotificationBanner } from './components/InAppNotificationBanner';
import { ProfilePhotoModal } from './components/ProfilePhotoModal';
import { PhoneMissed, MessageCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from './lib/firebase';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingFlow } from './components/OnboardingFlow';
import { BannedAccountScreen } from './components/BannedAccountScreen';
import { isOwnerEmail, OWNER_FIXED_ID, isOwnerIdFormat, generateStandardUserKempoId, isRawIdString, formatNameFromEmail, formatDisplayKempoId } from './lib/accountRules';
import {
  realtimeService,
  IncomingCallEvent,
  DirectMessagePayload,
  MissedCallEvent,
} from './lib/realtimeService';
import { dispatchDeviceNotification, playNotificationChime } from './lib/deviceNotifications';
import { usePWAInstall } from './hooks/usePWAInstall';
import { offlineQueue } from './lib/offlineQueue';
import { preloadAvatarModel } from './lib/modelPreloader';
import {
  supabase,
  supabaseSignOut,
  syncChatToSupabase,
  fetchUserProfile,
  saveFullUserProfile,
  findUserByKempoId,
  checkUserProfileCompletion,
  isAccountBanned,
  DEFAULT_PREFERENCES,
  generateKempoId,
  getOrCreatePermanentKempoId,
  fetchSupabaseMessages,
  fetchUserRealChatsFromSupabase,
} from './lib/supabase';
import {
  INITIAL_CHATS,
  ARCHIVED_CHATS,
  STATUS_STORIES,
  CALL_LOGS,
  USER_PROFILE,
} from './data/mockData';
import { StatusCreationSheet } from './components/status/StatusCreationSheet';
import { StatusEditorModal } from './components/status/StatusEditorModal';
import {
  fetchActiveStatuses,
  publishStatusToSupabase,
  filterExpiredStatuses,
  filterContactAudience,
} from './lib/statusService';
import {
  Chat,
  Message,
  FilterType,
  TabType,
  StatusStory,
  CallLog,
  UserProfileData,
  StatusMusicTrack,
  StatusTextOverlay,
} from './types';

// Helper to check if browser is returning from Google OAuth redirect
const isGoogleRedirect = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hash.includes('access_token') ||
    window.location.search.includes('code=') ||
    sessionStorage.getItem('kempo_google_auth_in_progress') === 'true'
  );
};

// Helper to check if user has already completed onboarding previously (WhatsApp style persistence)
const hasCompletedOnboarding = (email?: string, userId?: string): boolean => {
  if (typeof window === 'undefined') return false;

  const cleanEmail = (email || '').trim().toLowerCase();
  const storedUser = (localStorage.getItem('kempo_auth_user') || '').trim().toLowerCase();
  const targetEmail = cleanEmail || storedUser;

  if (!targetEmail && !userId) return false;

  // 1. Check per-email completed flag in localStorage (must have phone number saved)
  if (targetEmail && localStorage.getItem('kempo_completed_' + targetEmail) === 'true') {
    const phone = localStorage.getItem('kempo_user_phone_' + targetEmail) || localStorage.getItem('kempo_user_phone');
    if (phone) return true;
  }

  // 2. Check persistent completed accounts registry in localStorage
  try {
    const regRaw = localStorage.getItem('kempo_completed_accounts');
    if (regRaw) {
      const reg = JSON.parse(regRaw);
      if (targetEmail && reg[targetEmail] && reg[targetEmail].phoneNumber) return true;
      if (userId && reg[userId] && reg[userId].phoneNumber) return true;
    }
  } catch {}

  // 3. Check persistent profile completed flags & cached profile for this specific email
  const cachedProfile = localStorage.getItem('kempo_user_profile');
  if (cachedProfile && targetEmail) {
    try {
      const parsed = JSON.parse(cachedProfile);
      const pEmail = (parsed.email || '').trim().toLowerCase();
      if (
        pEmail === targetEmail &&
        (parsed.isProfileCompleted || parsed.isOnboarded || parsed.is_profile_completed) &&
        parsed.phoneNumber
      ) {
        return true;
      }
    } catch {}
  }

  return false;
};

export default function App() {
  // Auth state: If returning from Google OAuth, authenticate immediately without flashing dashboard
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (isGoogleRedirect()) return true;
      return Boolean(localStorage.getItem('kempo_auth_user') || localStorage.getItem('sb-token'));
    }
    return false;
  });

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('kempo_auth_user') : '') || '';
  });
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('kempo_auth_name') : '') || '';
  });
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('kempo_user_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const email = parsed.email || localStorage.getItem('kempo_auth_user') || '';
          if (!parsed.kempoId || parsed.kempoId.includes('OWNER') || parsed.kempoId.endsWith('A5738')) {
            parsed.kempoId = generateStandardUserKempoId(parsed.countryCode, email);
          }
          if (parsed.accountType === 'creator' && !parsed.category) {
            parsed.accountType = 'personal';
          }
          return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return null;
  });

  // 3-Step Setup Screen: triggered after Google Sign In or for fresh registrations
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('kempo_google_auth_in_progress') === 'true') {
        return true;
      }
    }
    return false;
  });
  const [isCheckingProfile, setIsCheckingProfile] = useState<boolean>(false);
  // Chats & app state (Empty by default for a fresh app experience)
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clear any old fake mock keys from earlier versions
        ['kempo_chats_demo', 'mock_chats', 'fake_contacts', 'kempo_contacts'].forEach((key) => {
          localStorage.removeItem(key);
        });
        const saved = localStorage.getItem('kempo_user_chats');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Strictly exclude any legacy dummy chats or placeholder mock messages
            const cleanChats = parsed.filter(
              (c: any) =>
                c.id !== 'kempo-owner-account' &&
                !c.lastMessage?.includes('Connected with Kempo Pro Creator') &&
                !c.lastMessage?.includes('Tap to chat')
            );
            localStorage.setItem('kempo_user_chats', JSON.stringify(cleanChats));
            return cleanChats;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CHATS;
  });
  const [archivedChats, setArchivedChats] = useState<Chat[]>(ARCHIVED_CHATS);

  // Active Status Stories (Filtered with 24-hour lifespan & contact privacy)
  const [stories, setStories] = useState<StatusStory[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kempo_user_statuses');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return filterExpiredStatuses(parsed);
        }
      } catch {}
    }
    return STATUS_STORIES;
  });

  const [calls, setCalls] = useState<CallLog[]>(CALL_LOGS);

  // Status Creation & Editor State
  const [showStatusCreationSheet, setShowStatusCreationSheet] = useState(false);
  const [statusEditorMedia, setStatusEditorMedia] = useState<{
    type: 'image' | 'video' | 'text' | 'voice' | 'layout';
    url?: string;
    text?: string;
    backgroundColor?: string;
    voiceBlob?: Blob;
    duration?: number;
    layoutImages?: string[];
  } | null>(null);
  const [showStatusEditor, setShowStatusEditor] = useState(false);

  // Sync user-created chats to local persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kempo_user_chats', JSON.stringify(chats));
    }
  }, [chats]);

  // Auto-heal existing chats with raw ID names (e.g. KEMPO-81889P) to true registered account names
  useEffect(() => {
    const rawIdChats = chats.filter((c) => isRawIdString(c.name) || !c.avatarUrl);
    if (rawIdChats.length === 0) return;

    let isMounted = true;
    (async () => {
      let didUpdate = false;
      const updatedChats = [...chats];

      for (let i = 0; i < updatedChats.length; i++) {
        const c = updatedChats[i];
        if (isRawIdString(c.name) || !c.avatarUrl) {
          const partnerId = c.kempoId || c.about?.replace('KEMPO ID: ', '').trim() || c.phoneNumber || c.id;
          const found = await findUserByKempoId(partnerId);
          if (found && isMounted) {
            let realName = found.displayName;
            if (!realName || isRawIdString(realName)) {
              realName = found.email ? formatNameFromEmail(found.email) : 'Kempo Contact';
            }
            updatedChats[i] = {
              ...c,
              name: realName,
              avatarUrl: found.avatarUrl || c.avatarUrl,
              coverUrl: found.coverUrl || c.coverUrl,
              coverType: found.coverType || c.coverType,
              email: found.email || c.email,
            };
            didUpdate = true;
          }
        }
      }

      if (didUpdate && isMounted) {
        setChats(updatedChats);
        localStorage.setItem('kempo_user_chats', JSON.stringify(updatedChats));
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  // Modals state
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [activeStory, setActiveStory] = useState<StatusStory | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [actionSheetChat, setActionSheetChat] = useState<Chat | null>(null);

  const handleArchiveChat = (chatId: string) => {
    const target = chats.find((c) => c.id === chatId);
    if (!target) return;
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setArchivedChats((prev) => [{ ...target, isArchived: true }, ...prev]);
  };

  const handleClearChatMessages = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [], lastMessage: 'Chat cleared', unreadCount: 0 }
          : c
      )
    );
  };

  const handleDeleteSingleChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
  };

  const handleToggleFavorite = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isFavorite: !c.isFavorite } : c))
    );
  };
  const [activeCallingChat, setActiveCallingChat] = useState<Chat | null>(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [activeCallStatus, setActiveCallStatus] = useState<
    'Ringing...' | 'Connected' | 'Call Declined' | 'No Answer'
  >('Ringing...');
  const [incomingCall, setIncomingCall] = useState<{
    id: string;
    name: string;
    avatarUrl?: string;
    kempoId?: string;
    isVideo: boolean;
  } | null>(null);

  // WhatsApp-style quick profile photo preview modal
  const [previewPhotoChat, setPreviewPhotoChat] = useState<Chat | null>(null);

  // In-app Notification Banner state (real-time popup for missed calls & incoming messages)
  const [bannerNotification, setBannerNotification] = useState<{
    id: string;
    type: 'missed_call' | 'message';
    title: string;
    body: string;
    avatarUrl?: string;
    onClick?: () => void;
  } | null>(null);

  const showBanner = (notif: {
    type: 'missed_call' | 'message';
    title: string;
    body: string;
    avatarUrl?: string;
    onClick?: () => void;
  }) => {
    const id = `notif-${Date.now()}`;
    setBannerNotification({ id, ...notif });
    setTimeout(() => {
      setBannerNotification((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  };

  // PWA install hook
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Listen for offline queue synchronizations and update message checkmarks smoothly (WhatsApp style)
  useEffect(() => {
    const unsub = offlineQueue.onStatusChange((item, newStatus) => {
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === item.chatId) {
            const updatedMessages = c.messages.map((m) =>
              m.id === item.message.id ? { ...m, status: newStatus, isPendingSync: false } : m
            );
            const isLast = c.messages[c.messages.length - 1]?.id === item.message.id;
            return {
              ...c,
              lastMessageStatus: isLast ? 'single_tick' : c.lastMessageStatus,
              messages: updatedMessages,
            };
          }
          return c;
        })
      );

      setSelectedChat((prev) => {
        if (!prev || prev.id !== item.chatId) return prev;
        const updatedMessages = prev.messages.map((m) =>
          m.id === item.message.id ? { ...m, status: newStatus, isPendingSync: false } : m
        );
        const isLast = prev.messages[prev.messages.length - 1]?.id === item.message.id;
        return {
          ...prev,
          lastMessageStatus: isLast ? 'single_tick' : prev.lastMessageStatus,
          messages: updatedMessages,
        };
      });

      // Transition to double tick (delivered to recipient device)
      setTimeout(() => {
        setChats((prevChats) =>
          prevChats.map((c) => {
            if (c.id === item.chatId) {
              return {
                ...c,
                lastMessageStatus: 'double_tick_grey',
                messages: c.messages.map((m) =>
                  m.id === item.message.id ? { ...m, status: 'delivered' } : m
                ),
              };
            }
            return c;
          })
        );
        setSelectedChat((prev) => {
          if (!prev || prev.id !== item.chatId) return prev;
          return {
            ...prev,
            lastMessageStatus: 'double_tick_grey',
            messages: prev.messages.map((m) =>
              m.id === item.message.id ? { ...m, status: 'delivered' } : m
            ),
          };
        });
      }, 1200);
    });

    return unsub;
  }, []);

  // Fetch active statuses from Supabase with 24-hour expiration filter and contact privacy
  useEffect(() => {
    let isMounted = true;
    fetchActiveStatuses(userProfile?.id || currentUserId, userProfile?.kempoId, chats).then((active) => {
      if (isMounted && active.length > 0) {
        setStories(active);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userProfile?.id, userProfile?.kempoId, chats.length]);

  // Handle publishing a new status story (Asynchronous with zero UI lag)
  const handlePublishStatus = async (storyData: {
    mediaType: 'image' | 'video' | 'text' | 'voice' | 'layout';
    url?: string;
    caption: string;
    musicTrack?: StatusMusicTrack;
    filter?: string;
    isGif?: boolean;
    trimStart?: number;
    trimEnd?: number;
    rotation?: number;
    textOverlays?: StatusTextOverlay[];
    taggedContacts?: string[];
    audience: 'contacts' | 'everyone';
    textContent?: string;
    textBackgroundColor?: string;
  }) => {
    const isOwner = isOwnerEmail(userProfile?.email || currentUserEmail);
    const myKempoId = isOwner ? OWNER_FIXED_ID : (userProfile?.kempoId || 'me');
    const myName = userProfile?.displayName || currentUserName || 'My Status';
    const myAvatar =
      userProfile?.avatarUrl ||
      (typeof window !== 'undefined' ? localStorage.getItem('kempo_user_avatar') || '' : '') ||
      (isOwner ? '/pwa-512x512.png' : '');

    const newStoryId = `status-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newStory: StatusStory = {
      id: newStoryId,
      userId: userProfile?.id || currentUserId || 'me',
      userKempoId: myKempoId,
      userName: 'My Status',
      userAvatar: myAvatar,
      timestamp: 'Just now',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      caption: storyData.caption,
      imageUrl: storyData.mediaType !== 'video' ? storyData.url : undefined,
      videoUrl: storyData.mediaType === 'video' ? storyData.url : undefined,
      mediaType: storyData.mediaType,
      musicTrack: storyData.musicTrack,
      filter: storyData.filter,
      isGif: storyData.isGif,
      trimStart: storyData.trimStart,
      trimEnd: storyData.trimEnd,
      rotation: storyData.rotation,
      textOverlays: storyData.textOverlays,
      taggedContacts: storyData.taggedContacts,
      audience: storyData.audience,
      textContent: storyData.textContent,
      textBackgroundColor: storyData.textBackgroundColor,
      viewed: false,
    };

    // 1. Instant zero-lag optimistic UI update
    setStories((prev) => [newStory, ...prev.filter((s) => s.userName !== 'My Status' && s.id !== 's_my')]);
    setActiveTab('updates');

    // 2. High-speed asynchronous upload to Supabase and persistent IndexedDB/localStorage
    publishStatusToSupabase(newStory).catch((err) => {
      console.warn('Async status publish notice:', err);
    });
  };

  // Supabase Auth listener & Session restore
  useEffect(() => {
    // 0. Preload 3D Head Avatar instantly in memory
    preloadAvatarModel().catch(() => {});

    // 1. Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        const email = (session.user.email || localStorage.getItem('kempo_auth_user') || '').trim();
        setCurrentUserEmail(email);
        localStorage.setItem('kempo_auth_user', email);

        const isGoogleAuth =
          sessionStorage.getItem('kempo_google_auth_in_progress') === 'true' ||
          window.location.hash.includes('access_token') ||
          window.location.search.includes('code=');

        const isKnownCompleted = hasCompletedOnboarding(email, session.user.id);

        // If user came via Google auth and has not finalized onboarding, always show 3-step setup!
        if (isGoogleAuth && !isKnownCompleted) {
          setShowOnboarding(true);
        } else if (isKnownCompleted) {
          setShowOnboarding(false);
          const { profile } = await checkUserProfileCompletion(session.user.id, email);
          if (profile) {
            if (!profile.kempoId || profile.kempoId.endsWith('A5738') || profile.kempoId.includes('OWNER') || isOwnerIdFormat(profile.kempoId)) {
              profile.kempoId = await getOrCreatePermanentKempoId(email, profile.countryCode);
            }
            if (profile.avatarUrl && typeof window !== 'undefined') {
              localStorage.setItem('kempo_user_avatar', profile.avatarUrl);
            }
            if (profile.countryCode && typeof window !== 'undefined') {
              localStorage.setItem('kempo_country_code', profile.countryCode);
            }
            setUserProfile(profile);
            setCurrentUserName(profile.displayName);
          }
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('kempo_google_auth_in_progress');
          }
        } else {
          // Check profile in Supabase & cache
          const { isCompleted, profile } = await checkUserProfileCompletion(session.user.id, email);
          if (isCompleted && profile?.phoneNumber) {
            setShowOnboarding(false);
            if (profile) {
              if (!profile.kempoId || profile.kempoId.endsWith('A5738') || profile.kempoId.includes('OWNER') || isOwnerIdFormat(profile.kempoId)) {
                profile.kempoId = await getOrCreatePermanentKempoId(email, profile.countryCode);
              }
              if (profile.avatarUrl && typeof window !== 'undefined') {
                localStorage.setItem('kempo_user_avatar', profile.avatarUrl);
              }
              if (profile.countryCode && typeof window !== 'undefined') {
                localStorage.setItem('kempo_country_code', profile.countryCode);
              }
              setUserProfile(profile);
              setCurrentUserName(profile.displayName);
            }
          } else {
            // First time user: show 3-step setup!
            setShowOnboarding(true);
          }
        }

        if (typeof window !== 'undefined') {
          if (window.location.hash || window.location.search.includes('code=')) {
            history.replaceState(null, '', window.location.pathname);
          }
        }
      } else {
        if (!isGoogleRedirect()) {
          const stored = localStorage.getItem('kempo_auth_user');
          if (!stored) {
            setIsAuthenticated(false);
            setCurrentUserId('');
            setCurrentUserEmail('');
            setCurrentUserName('');
            setUserProfile(null);
            setShowOnboarding(false);
          }
        }
      }
    });

    // 2. Listen to auth state transitions (including Google OAuth redirect return)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        const email = (session.user.email || localStorage.getItem('kempo_auth_user') || '').trim();
        setCurrentUserEmail(email);
        const isOwner = isOwnerEmail(email);
        const meta = session.user.user_metadata || {};
        const name =
          meta.full_name ||
          meta.name ||
          meta.display_name ||
          'Kempo User';
        setCurrentUserName(name);
        localStorage.setItem('kempo_auth_user', email);
        if (name) localStorage.setItem('kempo_auth_name', name);

        const isGoogleAuth =
          sessionStorage.getItem('kempo_google_auth_in_progress') === 'true' ||
          window.location.hash.includes('access_token') ||
          window.location.search.includes('code=');

        const isKnownCompleted = hasCompletedOnboarding(email, session.user.id);

        if (isGoogleAuth && !isKnownCompleted) {
          setShowOnboarding(true);
        } else if (isKnownCompleted) {
          setShowOnboarding(false);
          checkUserProfileCompletion(session.user.id, email).then(({ profile }) => {
            if (profile) {
              if (!profile.kempoId || profile.kempoId.endsWith('A5738') || profile.kempoId.includes('OWNER') || isOwnerIdFormat(profile.kempoId)) {
                getOrCreatePermanentKempoId(email, profile.countryCode).then((freshId) => {
                  profile.kempoId = freshId;
                  setUserProfile((prev) => (prev ? { ...prev, kempoId: freshId } : null));
                });
              }
              if (profile.avatarUrl && typeof window !== 'undefined') {
                localStorage.setItem('kempo_user_avatar', profile.avatarUrl);
              }
              if (profile.countryCode && typeof window !== 'undefined') {
                localStorage.setItem('kempo_country_code', profile.countryCode);
              }
              setUserProfile(profile);
              if (profile.displayName) setCurrentUserName(profile.displayName);
            }
          });
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('kempo_google_auth_in_progress');
          }
        } else {
          checkUserProfileCompletion(session.user.id, email).then(({ isCompleted, profile }) => {
            if (isCompleted && profile?.phoneNumber) {
              setShowOnboarding(false);
              if (profile) {
                if (!profile.kempoId || profile.kempoId.endsWith('A5738') || profile.kempoId.includes('OWNER') || isOwnerIdFormat(profile.kempoId)) {
                  getOrCreatePermanentKempoId(email, profile.countryCode).then((freshId) => {
                    profile.kempoId = freshId;
                    setUserProfile((prev) => (prev ? { ...prev, kempoId: freshId } : null));
                  });
                }
                if (profile.avatarUrl && typeof window !== 'undefined') {
                  localStorage.setItem('kempo_user_avatar', profile.avatarUrl);
                }
                if (profile.countryCode && typeof window !== 'undefined') {
                  localStorage.setItem('kempo_country_code', profile.countryCode);
                }
                setUserProfile(profile);
                if (profile.displayName) setCurrentUserName(profile.displayName);
              }
            } else {
              setShowOnboarding(true);
            }
          });
        }

        if (typeof window !== 'undefined') {
          if (window.location.hash || window.location.search.includes('code=')) {
            history.replaceState(null, '', window.location.pathname);
          }
        }
      } else if (_event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUserId('');
        setCurrentUserEmail('');
        setCurrentUserName('');
        setUserProfile(null);
        setShowOnboarding(false);
        localStorage.removeItem('kempo_auth_user');
        localStorage.removeItem('kempo_auth_name');
        sessionStorage.removeItem('kempo_dashboard_active');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthenticated = async (email: string, name?: string, photoURL?: string) => {
    setIsAuthenticated(true);
    setCurrentUserEmail(email);
    if (name) setCurrentUserName(name);
    localStorage.setItem('kempo_auth_user', email);
    if (name) localStorage.setItem('kempo_auth_name', name);

    const isGoogleAuth = sessionStorage.getItem('kempo_google_auth_in_progress') === 'true';
    const isKnownCompleted = hasCompletedOnboarding(email);

    // If returning from Google sign in or uncompleted profile, present 3-step setup screen:
    if (isGoogleAuth || !isKnownCompleted) {
      setShowOnboarding(true);
      return;
    }

    try {
      const { isCompleted, profile } = await checkUserProfileCompletion(currentUserId || email, email);
      if (isCompleted && profile?.phoneNumber) {
        setShowOnboarding(false);
        if (profile) {
          if (photoURL && !profile.avatarUrl) profile.avatarUrl = photoURL;
          setUserProfile(profile);
          if (profile.displayName) setCurrentUserName(profile.displayName);
        } else if (photoURL) {
          setUserProfile((prev) => (prev ? { ...prev, avatarUrl: photoURL } : null));
        }
      } else {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.warn('Profile fetch note:', err);
      if (isKnownCompleted) {
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    }
  };

  const handleOnboardingComplete = async (profile: UserProfileData) => {
    if (!profile.kempoId || profile.kempoId.endsWith('A5738') || profile.kempoId.includes('OWNER') || isOwnerIdFormat(profile.kempoId)) {
      profile.kempoId = await getOrCreatePermanentKempoId(profile.email || currentUserEmail, profile.countryCode);
    }
    profile.isOnboarded = true;
    profile.isProfileCompleted = true;
    profile.is_profile_completed = true;

    if (typeof window !== 'undefined') {
      if (profile.avatarUrl) {
        localStorage.setItem('kempo_user_avatar', profile.avatarUrl);
      }
      if (profile.countryCode) {
        localStorage.setItem('kempo_country_code', profile.countryCode);
      }
      localStorage.setItem('kempo_user_id', profile.kempoId);
    }

    await saveFullUserProfile(profile);
    setUserProfile(profile);
    setCurrentUserName(profile.displayName);
    setShowOnboarding(false);

    if (typeof window !== 'undefined') {
      const email = (profile.email || currentUserEmail || '').trim().toLowerCase();
      if (email) {
        localStorage.setItem('kempo_completed_' + email, 'true');
      }
      sessionStorage.setItem('kempo_dashboard_active', 'true');
      localStorage.setItem('kempo_profile_completed', 'true');
      localStorage.setItem('kempo_onboarded_completed', 'true');
      localStorage.setItem('kempo_user_profile', JSON.stringify(profile));
      try {
        const regRaw = localStorage.getItem('kempo_completed_accounts') || '{}';
        const reg = JSON.parse(regRaw);
        if (email) reg[email] = true;
        if (profile.id) reg[profile.id] = true;
        localStorage.setItem('kempo_completed_accounts', JSON.stringify(reg));
      } catch {}
      sessionStorage.removeItem('kempo_google_auth_in_progress');
      if (window.location.hash || window.location.search.includes('code=')) {
        history.replaceState(null, '', window.location.pathname);
      }
    }
  };

  const handleSignOut = async () => {
    await supabaseSignOut();
    setIsAuthenticated(false);
    setCurrentUserId('');
    setCurrentUserEmail('');
    setCurrentUserName('');
    setUserProfile(null);
    setShowOnboarding(false);
    sessionStorage.removeItem('kempo_dashboard_active');
    sessionStorage.removeItem('kempo_google_auth_in_progress');
    localStorage.removeItem('kempo_auth_user');
    localStorage.removeItem('kempo_auth_name');
  };

  // Add Contact by shareable KEMPO-ID (or dedicated Owner ID)
  const handleAddContactById = async (targetId: string, customName?: string): Promise<Chat | null> => {
    const cleanId = targetId.trim();
    if (!cleanId) return null;

    if (customName && customName.trim()) {
      localStorage.setItem(`kempo_contact_name_${cleanId}`, customName.trim());
    }

    // Check if user already exists in current chats list
    const existing = chats.find(
      (c) =>
        (c.kempoId && c.kempoId.toUpperCase() === cleanId.toUpperCase()) ||
        (c.kempoId && c.kempoId.replace(/\s+/g, '').toUpperCase() === cleanId.replace(/\s+/g, '').toUpperCase()) ||
        (c.about && c.about.toUpperCase().includes(cleanId.toUpperCase())) ||
        (c.email && c.email.toLowerCase() === cleanId.toLowerCase()) ||
        c.name.toUpperCase() === cleanId.toUpperCase() ||
        c.id === `user-${cleanId}`
    );

    if (existing) {
      if (customName && customName.trim() && existing.name !== customName.trim()) {
        const updated = { ...existing, name: customName.trim() };
        setChats((prev) => prev.map((c) => (c.id === existing.id ? updated : c)));
        setSelectedChat(updated);
        return updated;
      }
      setSelectedChat(existing);
      return existing;
    }

    // Query Supabase & directory for real user profile by ID, phone, or email
    const foundProfile = await findUserByKempoId(cleanId);
    if (!foundProfile && !isOwnerIdFormat(cleanId)) {
      return null;
    }

    const isContactOwner = false;
    const contactKempoId = foundProfile?.kempoId || cleanId;
    
    let contactName = (customName && customName.trim()) || foundProfile?.displayName || '';
    if (!contactName || isRawIdString(contactName) || contactName === cleanId) {
      contactName = foundProfile?.email
        ? formatNameFromEmail(foundProfile.email)
        : foundProfile?.displayName || 'Kempo Member';
    }

    if (customName && customName.trim()) {
      localStorage.setItem(`kempo_contact_name_${contactKempoId}`, customName.trim());
    }

    const contactAvatar = foundProfile?.avatarUrl || '';

    // Fetch any real message history between the current user and this contact
    const myKempoId = userProfile?.kempoId || 'me';
    const pastMessages = await fetchSupabaseMessages(myKempoId, contactKempoId);
    const lastMsg = pastMessages[pastMessages.length - 1];

    const newChat: Chat = {
      id: foundProfile?.id || `user-${contactKempoId.replace(/\s+/g, '_')}`,
      kempoId: contactKempoId,
      email: foundProfile?.email,
      name: contactName,
      avatarUrl: contactAvatar,
      avatarBg: isContactOwner ? '#451a24' : '#251a24',
      avatarType: contactAvatar ? 'photo' : 'initials',
      timestamp: lastMsg?.timestamp || 'Just now',
      lastMessage: lastMsg?.text || (lastMsg?.mediaType === 'audio' ? '🎤 Voice message' : ''),
      lastMessageStatus: (lastMsg?.status as any) || 'none',
      unreadCount: 0,
      online: realtimeService.isUserOnline(contactKempoId),
      about: `KEMPO ID: ${contactKempoId}`,
      phoneNumber: foundProfile?.phoneNumber || cleanId,
      coverUrl: foundProfile?.coverUrl,
      coverType: foundProfile?.coverType,
      messages: pastMessages,
    };

    setChats((prev) => [newChat, ...prev.filter((c) => c.id !== newChat.id && c.kempoId !== newChat.kempoId)]);
    setSelectedChat(newChat);
    syncChatToSupabase(newChat);
    return newChat;
  };

  const handleSaveNewContact = async (contactData: {
    firstName: string;
    lastName: string;
    username: string;
    countryDialCode: string;
    rawInputId: string;
    syncToPhone: boolean;
    verifiedProfile?: UserProfileData | null;
  }) => {
    const customName =
      [contactData.firstName, contactData.lastName].filter(Boolean).join(' ') ||
      contactData.username ||
      '';

    let targetId = contactData.verifiedProfile?.kempoId || contactData.rawInputId.trim();
    if (
      targetId &&
      !targetId.startsWith('+') &&
      !targetId.toLowerCase().startsWith('kempo') &&
      !isOwnerIdFormat(targetId)
    ) {
      targetId = `${contactData.countryDialCode}${targetId}`;
    }

    const createdChat = await handleAddContactById(targetId, customName);
    if (createdChat) {
      if (customName) {
        localStorage.setItem(`kempo_contact_name_${createdChat.id}`, customName);
        if (createdChat.kempoId) {
          localStorage.setItem(`kempo_contact_name_${createdChat.kempoId}`, customName);
        }
      }
      setSelectedChat(createdChat);
    }
  };

  const handleUpdateContactName = (chatId: string, newName: string) => {
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, name: newName } : c));
      localStorage.setItem('kempo_user_chats', JSON.stringify(updated));
      return updated;
    });
    setSelectedChat((prev) => (prev && prev.id === chatId ? { ...prev, name: newName } : prev));
  };

  // Compute total unread chats
  const totalUnread = chats.filter((c) => (c.unreadCount || 0) > 0).length;

  // Filter chats based on query and filter tab
  const filteredChats = chats.filter((chat) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = chat.name.toLowerCase().includes(q);
      const matchesMsg = chat.lastMessage.toLowerCase().includes(q);
      const matchesId = Boolean(
        (chat.kempoId && chat.kempoId.toLowerCase().includes(q)) ||
        (chat.about && chat.about.toLowerCase().includes(q)) ||
        (chat.phoneNumber && chat.phoneNumber.toLowerCase().includes(q))
      );
      if (!matchesName && !matchesMsg && !matchesId) return false;
    }

    // Tab filter
    if (activeFilter === 'unread') {
      return (chat.unreadCount || 0) > 0;
    }
    if (activeFilter === 'favorites') {
      return !!chat.isFavorite;
    }
    if (activeFilter === 'groups') {
      return chat.name.toLowerCase().includes('group') || chat.name.toLowerCase().includes('club') || chat.name.toLowerCase().includes('devs');
    }

    return true;
  });

  // Handle incoming live direct messages in real time
  const handleIncomingDirectMessage = (dm: DirectMessagePayload) => {
    const senderKempoId = dm.senderKempoId.toUpperCase();
    const msg = dm.message;

    setChats((prevChats) => {
      const existingIndex = prevChats.findIndex(
        (c) =>
          (c.kempoId && c.kempoId.toUpperCase() === senderKempoId) ||
          (c.about && c.about.toUpperCase().includes(senderKempoId)) ||
          c.id === `user-${senderKempoId}` ||
          c.id === senderKempoId
      );

      if (existingIndex >= 0) {
        const existing = prevChats[existingIndex];
        if (existing.messages.some((m) => m.id === msg.id)) {
          return prevChats;
        }
        if (dm.senderAvatar && typeof window !== 'undefined') {
          localStorage.setItem(`kempo_contact_avatar_${senderKempoId}`, dm.senderAvatar);
        }
        if (dm.senderCoverUrl && typeof window !== 'undefined') {
          localStorage.setItem(`kempo_contact_cover_${senderKempoId}`, dm.senderCoverUrl);
        }
        const localSavedName =
          typeof window !== 'undefined'
            ? localStorage.getItem(`kempo_contact_name_${senderKempoId}`) ||
              localStorage.getItem(`kempo_contact_name_${existing.id}`)
            : null;

        if (!localSavedName && dm.senderName && !isRawIdString(dm.senderName) && typeof window !== 'undefined') {
          localStorage.setItem(`kempo_contact_name_${senderKempoId}`, dm.senderName);
        }

        const updatedChat: Chat = {
          ...existing,
          name:
            localSavedName ||
            (existing.name && !isRawIdString(existing.name) ? existing.name : '') ||
            (dm.senderName && !isRawIdString(dm.senderName)
              ? dm.senderName
              : dm.senderEmail
              ? formatNameFromEmail(dm.senderEmail)
              : existing.name),
          avatarUrl: dm.senderAvatar || existing.avatarUrl || '',
          coverUrl: dm.senderCoverUrl || existing.coverUrl,
          coverType: dm.senderCoverType || existing.coverType || 'video',
          email: dm.senderEmail || existing.email,
          lastMessage: msg.text || (msg.mediaType === 'audio' ? '🎤 Voice message' : '📸 Photo'),
          lastMessageStatus: 'none',
          timestamp: msg.timestamp || 'Just now',
          unreadCount:
            selectedChat &&
            ((selectedChat.kempoId && selectedChat.kempoId.toUpperCase() === senderKempoId) ||
              selectedChat.id === existing.id)
              ? 0
              : (existing.unreadCount || 0) + 1,
          messages: [...existing.messages, { ...msg, status: 'delivered' }],
        };
        const rest = prevChats.filter((_, idx) => idx !== existingIndex);
        const newChats = [updatedChat, ...rest];
        localStorage.setItem('kempo_user_chats', JSON.stringify(newChats));
        syncChatToSupabase(updatedChat);
        return newChats;
      } else {
        let initialChatName = dm.senderName;
        if (!initialChatName || isRawIdString(initialChatName)) {
          initialChatName = dm.senderEmail
            ? formatNameFromEmail(dm.senderEmail)
            : dm.senderKempoId && dm.senderKempoId.includes('@')
            ? formatNameFromEmail(dm.senderKempoId)
            : formatDisplayKempoId(senderKempoId);
        }

        if (dm.senderAvatar && typeof window !== 'undefined') {
          localStorage.setItem(`kempo_contact_avatar_${senderKempoId}`, dm.senderAvatar);
        }
        if (dm.senderCoverUrl && typeof window !== 'undefined') {
          localStorage.setItem(`kempo_contact_cover_${senderKempoId}`, dm.senderCoverUrl);
        }
        const localSavedName =
          typeof window !== 'undefined'
            ? localStorage.getItem(`kempo_contact_name_${senderKempoId}`) ||
              localStorage.getItem(`kempo_contact_name_user-${senderKempoId}`)
            : null;

        if (!localSavedName && initialChatName && !isRawIdString(initialChatName) && typeof window !== 'undefined') {
          localStorage.setItem(`kempo_contact_name_${senderKempoId}`, initialChatName);
        }

        const newChat: Chat = {
          id: `user-${senderKempoId}`,
          kempoId: senderKempoId,
          name: localSavedName || initialChatName,
          email: dm.senderEmail || '',
          avatarUrl: dm.senderAvatar || '',
          avatarBg: '#251a24',
          avatarType: dm.senderAvatar ? 'photo' : 'initials',
          coverUrl: dm.senderCoverUrl,
          coverType: dm.senderCoverType || 'video',
          timestamp: msg.timestamp || 'Just now',
          lastMessage: msg.text || (msg.mediaType === 'audio' ? '🎤 Voice message' : '📸 Photo'),
          lastMessageStatus: 'none',
          unreadCount: 1,
          online: true,
          about: `KEMPO ID: ${formatDisplayKempoId(senderKempoId)}`,
          phoneNumber: senderKempoId,
          messages: [{ ...msg, status: 'delivered' }],
        };
        const newChats = [newChat, ...prevChats];
        localStorage.setItem('kempo_user_chats', JSON.stringify(newChats));
        syncChatToSupabase(newChat);
        return newChats;
      }
    });

    // Check if the chat is currently open on recipient's screen
    const isThisChatOpen = Boolean(
      selectedChat &&
      ((selectedChat.kempoId && selectedChat.kempoId.toUpperCase() === senderKempoId) ||
        (selectedChat.about && selectedChat.about.toUpperCase().includes(senderKempoId)) ||
        selectedChat.id === `user-${senderKempoId}`)
    );

    if (selectedChat && isThisChatOpen) {
      setSelectedChat((prev) => {
        if (!prev) return null;
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          lastMessage: msg.text || 'New message',
          timestamp: msg.timestamp || 'Just now',
          unreadCount: 0,
          messages: [...prev.messages, { ...msg, status: 'delivered' }],
        };
      });
    }

    // Immediately dispatch real WhatsApp-style delivery or read receipt back to the sender
    if (msg.id) {
      const myCurrentId = userProfile?.kempoId || currentUserId || 'me';
      if (isThisChatOpen) {
        realtimeService.sendReadReceipt(myCurrentId, dm.senderKempoId, msg.id);
      } else {
        realtimeService.sendDeliveryReceipt(myCurrentId, dm.senderKempoId, msg.id);
      }
    }

    // Real native device notification & audio chime
    const allowSounds = userProfile?.preferences?.soundEffects !== false && userProfile?.preferences?.messageTones !== false;
    const allowDevicePush = userProfile?.preferences?.deviceNotifications !== false;

    if (allowDevicePush) {
      const senderTitle = dm.senderName || `Kempo Pro (${senderKempoId})`;
      const bodyPreview = userProfile?.preferences?.lockScreenPreviews !== false
        ? (msg.text || (msg.mediaType === 'audio' ? '🎤 Voice message' : '📸 Photo'))
        : 'New message';

      dispatchDeviceNotification(senderTitle, {
        body: bodyPreview,
        badgeCount: 1,
        silentSound: !allowSounds,
      });
    } else if (allowSounds) {
      playNotificationChime('message');
    }
  };

  // Handle sending a message in a chat
  const handleSendMessage = (
    chatId: string,
    text: string,
    mediaType?: 'image' | 'audio' | 'sticker' | 'document',
    mediaUrl?: string,
    senderId?: string,
    timestamp?: string,
    customMsgId?: string,
    explicitStatus?: 'pending' | 'sent' | 'delivered' | 'read'
  ) => {
    const isIncoming = Boolean(senderId && senderId !== (userProfile?.kempoId || 'me') && !senderId.startsWith('me'));
    const cleanText = text.startsWith('[incoming]') ? text.replace('[incoming]', '') : text;

    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = timestamp || `${hours}:${minutes} ${ampm}`;

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const resolvedStatus: 'pending' | 'sent' | 'delivered' | 'read' = isIncoming
      ? 'delivered'
      : explicitStatus || (isOffline ? 'pending' : 'sent');

    const msgId = customMsgId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newMsg: Message = {
      id: msgId,
      senderId: senderId || userProfile?.kempoId || 'me',
      text: cleanText,
      mediaType: mediaType,
      mediaUrl,
      timestamp: timeStr,
      status: resolvedStatus,
      isPendingSync: resolvedStatus === 'pending',
    };

    const targetChat = chats.find((c) => c.id === chatId);
    const partnerId =
      targetChat?.kempoId ||
      targetChat?.about?.replace('KEMPO ID: ', '').trim() ||
      targetChat?.phoneNumber ||
      chatId;

    // Enqueue locally if outgoing and currently offline
    if (!isIncoming && resolvedStatus === 'pending') {
      offlineQueue.enqueue(chatId, senderId || userProfile?.kempoId || 'me', partnerId, newMsg);
    }

    const newLastStatus = isIncoming
      ? ('none' as const)
      : resolvedStatus === 'pending'
      ? ('pending_clock' as const)
      : ('single_tick' as const);

    setChats((prevChats) => {
      const updated = prevChats.map((c) => {
        if (c.id === chatId) {
          const updatedChat = {
            ...c,
            lastMessage: cleanText,
            lastMessageStatus: newLastStatus,
            timestamp: timeStr,
            unreadCount: isIncoming ? (c.unreadCount || 0) + 1 : 0,
            messages: [...c.messages, newMsg],
          };
          if (!isOffline) {
            syncChatToSupabase(updatedChat);
          }
          return updatedChat;
        }
        return c;
      });

      try {
        localStorage.setItem('kempo_user_chats', JSON.stringify(updated));
      } catch (err) {
        console.warn('Chat local storage safeguard:', err);
      }
      return updated;
    });

    // Also update selectedChat if currently open
    if (selectedChat && selectedChat.id === chatId) {
      setSelectedChat((prev) =>
        prev
          ? {
              ...prev,
              lastMessage: cleanText,
              lastMessageStatus: newLastStatus,
              timestamp: timeStr,
              unreadCount: 0,
              messages: [...prev.messages, newMsg],
            }
          : null
      );
    }

    // Message status is 100% real-time:
    // 1. Initially 'pending' (clock) if offline, or 'sent' (1 tick) when sent to Supabase.
    // 2. Turns into 'delivered' (2 grey ticks) when acknowledged by recipient or presence confirmation.
    // 3. Turns into 'read' (2 blue ticks) when recipient opens the chat.
  };

  // Open a chat
  const handleOpenChat = (chat: Chat) => {
    // Mark as read
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
    );
    setSelectedChat({ ...chat, unreadCount: 0 });
  };

  // Listen to personal signaling channel for real incoming WhatsApp calls, responses, and missed calls
  useEffect(() => {
    const myId = userProfile?.kempoId || currentUserName || 'my-id';
    const unsubPresence = realtimeService.initPresence(myId, currentUserName || userProfile?.displayName);

    realtimeService.listenToPersonalSignals(
      myId,
      (callEvent: IncomingCallEvent) => {
        setIncomingCall({
          id: callEvent.callerId,
          name: callEvent.callerName,
          avatarUrl: callEvent.callerAvatar,
          kempoId: callEvent.callerKempoId,
          isVideo: callEvent.isVideo,
        });
      },
      () => {
        setActiveCallingChat(null);
        setIncomingCall(null);
      },
      (dm: DirectMessagePayload) => {
        handleIncomingDirectMessage(dm);
      },
      () => {
        // Call accepted by recipient
        setActiveCallStatus('Connected');
      },
      () => {
        // Call declined by recipient
        setActiveCallStatus('Call Declined');
        if (activeCallingChat) {
          const isVideo = isVideoCall;
          const outgoingLog: CallLog = {
            id: `call-${Date.now()}`,
            name: activeCallingChat.name,
            avatarUrl: activeCallingChat.avatarUrl,
            timestamp: 'Just now',
            type: 'outgoing',
            isVideo,
          };
          setCalls((prev) => [outgoingLog, ...prev]);
          handleSendMessage(activeCallingChat.id, `📞 Missed ${isVideo ? 'video' : 'voice'} call`);
        }
        setTimeout(() => {
          setActiveCallingChat(null);
        }, 1800);
      },
      (missedEvent: MissedCallEvent) => {
        // Missed call received
        const missedLog: CallLog = {
          id: `call-${Date.now()}`,
          name: missedEvent.callerName,
          avatarUrl: missedEvent.callerAvatar || '',
          timestamp: missedEvent.timestamp || 'Just now',
          type: 'missed',
          isVideo: missedEvent.isVideo,
        };
        setCalls((prev) => [missedLog, ...prev]);

        // Real in-app notification banner
        showBanner({
          type: 'missed_call',
          title: `Missed ${missedEvent.isVideo ? 'Video' : 'Voice'} Call`,
          body: `Missed call from ${missedEvent.callerName}`,
          avatarUrl: missedEvent.callerAvatar,
          onClick: () => setActiveTab('calls'),
        });

        // Add missed call message to chat
        const callerKempoId = missedEvent.callerKempoId || missedEvent.callerId;
        const matched = chats.find(
          (c) =>
            (c.kempoId && c.kempoId.toUpperCase() === callerKempoId.toUpperCase()) ||
            (c.phoneNumber && c.phoneNumber.toUpperCase() === callerKempoId.toUpperCase()) ||
            c.name === missedEvent.callerName
        );
        if (matched) {
          handleSendMessage(matched.id, `📞 Missed ${missedEvent.isVideo ? 'video' : 'voice'} call`);
        }
      },
      (deliveredMsgId) => {
        // Delivery receipt: message reached recipient device -> turns into double grey ticks ✓✓
        setChats((prev) =>
          prev.map((c) => ({
            ...c,
            lastMessageStatus:
              c.messages[c.messages.length - 1]?.id === deliveredMsgId
                ? 'double_tick_grey'
                : c.lastMessageStatus,
            messages: c.messages.map((m) =>
              m.id === deliveredMsgId && m.status === 'sent' ? { ...m, status: 'delivered' } : m
            ),
          }))
        );
        setSelectedChat((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            lastMessageStatus:
              prev.messages[prev.messages.length - 1]?.id === deliveredMsgId
                ? 'double_tick_grey'
                : prev.lastMessageStatus,
            messages: prev.messages.map((m) =>
              m.id === deliveredMsgId && m.status === 'sent' ? { ...m, status: 'delivered' } : m
            ),
          };
        });
      },
      (readerId, readMsgId) => {
        // Read receipt: recipient viewed the message -> turns into double blue ticks ✓✓
        setChats((prev) =>
          prev.map((c) => {
            const isMatch =
              (c.kempoId && c.kempoId.toUpperCase() === readerId.toUpperCase()) ||
              c.id === `user-${readerId.toUpperCase()}` ||
              (c.messages && c.messages.some((m) => m.id === readMsgId));
            if (!isMatch && !readMsgId) return c;
            return {
              ...c,
              lastMessageStatus: 'double_tick_blue',
              messages: c.messages.map((m) =>
                (!readMsgId || m.id === readMsgId) ? { ...m, status: 'read' } : m
              ),
            };
          })
        );
        setSelectedChat((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            lastMessageStatus: 'double_tick_blue',
            messages: prev.messages.map((m) =>
              (!readMsgId || m.id === readMsgId) ? { ...m, status: 'read' } : m
            ),
          };
        });
      }
    );

    // Real-time Supabase postgres_changes listener on messages table
    const unsubPostgres = realtimeService.subscribeToPostgresMessages(
      myId,
      async (msg, senderId, receiverId) => {
        let senderName = senderId;
        let senderAvatar = '';
        try {
          const senderProfile = await findUserByKempoId(senderId);
          if (senderProfile) {
            senderName = senderProfile.displayName;
            if (!senderName || isRawIdString(senderName)) {
              senderName = senderProfile.email ? formatNameFromEmail(senderProfile.email) : 'Kempo Contact';
            }
            senderAvatar = senderProfile.avatarUrl || '';
          }
        } catch {}

        handleIncomingDirectMessage({
          message: msg,
          senderKempoId: senderId,
          senderName,
          senderAvatar,
          recipientKempoId: receiverId,
        });
      },
      (messageId, status) => {
        setChats((prev) =>
          prev.map((c) => ({
            ...c,
            lastMessageStatus:
              c.messages[c.messages.length - 1]?.id === messageId
                ? status === 'read'
                  ? 'double_tick_blue'
                  : 'double_tick_grey'
                : c.lastMessageStatus,
            messages: c.messages.map((m) =>
              m.id === messageId ? { ...m, status } : m
            ),
          }))
        );
        setSelectedChat((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            lastMessageStatus:
              prev.messages[prev.messages.length - 1]?.id === messageId
                ? status === 'read'
                  ? 'double_tick_blue'
                  : 'double_tick_grey'
                : prev.lastMessageStatus,
            messages: prev.messages.map((m) =>
              m.id === messageId ? { ...m, status } : m
            ),
          };
        });
      }
    );

    // Real-time Profile Updates Subscription (Live photo, cover wallpaper, name sync)
    const unsubProfiles = realtimeService.subscribeToProfileUpdates((updatedProf) => {
      if (!updatedProf) return;
      const targetKempoId = (updatedProf.kempoId || updatedProf.id || '').toUpperCase();
      const targetEmail = (updatedProf.email || '').toLowerCase();

      setChats((prevChats) => {
        let changed = false;
        const newChats = prevChats.map((c) => {
          const cKempo = (c.kempoId || '').toUpperCase();
          const cId = (c.id || '').toUpperCase();
          const cEmail = (c.email || '').toLowerCase();

          const matches =
            (targetKempoId && (cKempo === targetKempoId || cKempo.includes(targetKempoId) || targetKempoId.includes(cKempo))) ||
            (cId === targetKempoId) ||
            (targetEmail && cEmail === targetEmail);

          if (matches) {
            changed = true;
            let newName = c.name;
            if (updatedProf.displayName && !isRawIdString(updatedProf.displayName)) {
              newName = updatedProf.displayName;
            } else if (isRawIdString(newName) && (updatedProf.email || c.email)) {
              newName = formatNameFromEmail(updatedProf.email || c.email);
            }

            return {
              ...c,
              name: newName,
              avatarUrl: updatedProf.avatarUrl !== undefined ? updatedProf.avatarUrl : c.avatarUrl,
              coverUrl: updatedProf.coverUrl !== undefined ? updatedProf.coverUrl : c.coverUrl,
              coverType: updatedProf.coverType !== undefined ? updatedProf.coverType : c.coverType,
            };
          }
          return c;
        });

        if (changed) {
          localStorage.setItem('kempo_user_chats', JSON.stringify(newChats));
        }
        return changed ? newChats : prevChats;
      });

      setSelectedChat((prev) => {
        if (!prev) return null;
        const cKempo = (prev.kempoId || '').toUpperCase();
        const cId = (prev.id || '').toUpperCase();
        const cEmail = (prev.email || '').toLowerCase();

        const matches =
          (targetKempoId && (cKempo === targetKempoId || cKempo.includes(targetKempoId) || targetKempoId.includes(cKempo))) ||
          (cId === targetKempoId) ||
          (targetEmail && cEmail === targetEmail);

        if (matches) {
          let newName = prev.name;
          if (updatedProf.displayName && !isRawIdString(updatedProf.displayName)) {
            newName = updatedProf.displayName;
          } else if (isRawIdString(newName) && (updatedProf.email || prev.email)) {
            newName = formatNameFromEmail(updatedProf.email || prev.email);
          }

          return {
            ...prev,
            name: newName,
            avatarUrl: updatedProf.avatarUrl !== undefined ? updatedProf.avatarUrl : prev.avatarUrl,
            coverUrl: updatedProf.coverUrl !== undefined ? updatedProf.coverUrl : prev.coverUrl,
            coverType: updatedProf.coverType !== undefined ? updatedProf.coverType : prev.coverType,
          };
        }
        return prev;
      });
    });

    // Sync real Supabase chat conversations on login / connect
    if (userProfile?.kempoId) {
      fetchUserRealChatsFromSupabase(userProfile.kempoId).then((realChats) => {
        if (realChats && realChats.length > 0) {
          setChats((prevChats) => {
            const existingKempoIds = new Set(
              prevChats.map((c) => (c.kempoId || '').toUpperCase())
            );
            const toAdd = realChats.filter(
              (rc) => !existingKempoIds.has((rc.kempoId || '').toUpperCase())
            );
            if (toAdd.length === 0) return prevChats;
            const merged = [...prevChats, ...toAdd];
            localStorage.setItem('kempo_user_chats', JSON.stringify(merged));
            return merged;
          });
        }
      });
    }

    // Real-time Presence listener to update online status across all chats dynamically
    const unsubPresenceChange = realtimeService.onPresenceChange((onlineUsers) => {
      setChats((prevChats) => {
        let changed = false;
        const updated = prevChats.map((c) => {
          const partnerId = c.kempoId || c.phoneNumber || c.id;
          const isOnline = onlineUsers.has(realtimeService.normalizeId(partnerId));
          if (c.online !== isOnline) {
            changed = true;
            return { ...c, online: isOnline };
          }
          return c;
        });
        return changed ? updated : prevChats;
      });
    });

    // Firestore Live Real-Time Snapshot Listener for User Profile updates
    let unsubFirestore: (() => void) | undefined;
    try {
      const usersCol = collection(db, 'users');
      unsubFirestore = onSnapshot(usersCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified' || change.type === 'added') {
            const data = change.doc.data();
            const docId = change.doc.id;
            const targetId = (data.kempoId || data.uid || docId || '').trim().toUpperCase();
            const targetEmail = (data.email || '').trim().toLowerCase();
            const avatar = data.avatarUrl || data.photoURL || '';
            const cover = data.coverUrl || '';
            const coverType = data.coverType || 'image';
            const name = data.displayName || '';

            setChats((prevChats) => {
              let changed = false;
              const newChats = prevChats.map((c) => {
                const cKempo = (c.kempoId || '').toUpperCase();
                const cId = (c.id || '').toUpperCase();
                const cEmail = (c.email || '').toLowerCase();

                const isMatch =
                  cId === docId.toUpperCase() ||
                  (targetId && (cKempo === targetId || cKempo.includes(targetId) || targetId.includes(cKempo))) ||
                  (targetEmail && cEmail === targetEmail);

                if (isMatch) {
                  changed = true;
                  return {
                    ...c,
                    name: name && !isRawIdString(name) ? name : c.name,
                    avatarUrl: avatar || c.avatarUrl,
                    coverUrl: cover || c.coverUrl,
                    coverType: coverType || c.coverType,
                  };
                }
                return c;
              });

              if (changed) {
                localStorage.setItem('kempo_user_chats', JSON.stringify(newChats));
              }
              return changed ? newChats : prevChats;
            });

            setSelectedChat((prev) => {
              if (!prev) return null;
              const cKempo = (prev.kempoId || '').toUpperCase();
              const cId = (prev.id || '').toUpperCase();
              const cEmail = (prev.email || '').toLowerCase();

              const isMatch =
                cId === docId.toUpperCase() ||
                (targetId && (cKempo === targetId || cKempo.includes(targetId) || targetId.includes(cKempo))) ||
                (targetEmail && cEmail === targetEmail);

              if (isMatch) {
                return {
                  ...prev,
                  name: name && !isRawIdString(name) ? name : prev.name,
                  avatarUrl: avatar || prev.avatarUrl,
                  coverUrl: cover || prev.coverUrl,
                  coverType: coverType || prev.coverType,
                };
              }
              return prev;
            });
          }
        });
      }, (err) => {
        console.info('Firestore realtime snapshot notice:', err);
      });
    } catch (e) {
      console.warn('Firestore snapshot setup warning:', e);
    }

    return () => {
      unsubPresence();
      unsubPostgres();
      unsubProfiles();
      unsubPresenceChange();
      if (unsubFirestore) unsubFirestore();
    };
  }, [userProfile?.kempoId, currentUserName, selectedChat, activeCallingChat, isVideoCall, chats]);

  // Start Call (Video or Voice) with Real-Time Signaling (Never call self)
  const handleStartCall = (chatOrName: Chat | string, isVideo: boolean) => {
    let targetChat: Chat | undefined;
    if (typeof chatOrName === 'string') {
      targetChat = chats.find((c) => c.name === chatOrName) || {
        id: `temp-${Date.now()}`,
        name: chatOrName,
        avatarUrl: '',
        timestamp: 'Just now',
        lastMessage: isVideo ? 'Video call' : 'Voice call',
        messages: [],
      };
    } else {
      targetChat = chatOrName;
    }

    const targetKempoId =
      targetChat.kempoId ||
      targetChat.phoneNumber ||
      targetChat.about?.replace('KEMPO ID: ', '') ||
      targetChat.id;

    if (
      userProfile?.kempoId &&
      targetKempoId &&
      targetKempoId.toUpperCase() === userProfile.kempoId.toUpperCase()
    ) {
      alert('You cannot call yourself. Enter another person’s KEMPO ID to call them.');
      return;
    }

    setIsVideoCall(isVideo);
    setActiveCallStatus('Ringing...');
    setActiveCallingChat(targetChat);

    // Send call invite signal over Supabase Realtime to target user's personal channel
    if (targetKempoId && userProfile) {
      realtimeService.sendCallInvite(targetKempoId, {
        callId: `call-${Date.now()}`,
        callerId: userProfile.id,
        callerName: userProfile.displayName,
        callerAvatar: userProfile.avatarUrl,
        callerKempoId: userProfile.kempoId,
        isVideo,
      });
    }
  };

  // Start Call directly by recipient User ID
  const handleStartCallById = async (targetKempoId: string, isVideo: boolean) => {
    const cleanId = targetKempoId.trim().toUpperCase();
    if (!cleanId) return;

    if (userProfile?.kempoId && cleanId === userProfile.kempoId.toUpperCase()) {
      alert('You cannot call yourself. Enter another person’s KEMPO ID to ring their device.');
      return;
    }

    let targetChat = chats.find(
      (c) =>
        (c.kempoId && c.kempoId.toUpperCase() === cleanId) ||
        (c.phoneNumber && c.phoneNumber.toUpperCase() === cleanId) ||
        (c.about && c.about.toUpperCase().includes(cleanId))
    );

    if (!targetChat) {
      const found = await findUserByKempoId(cleanId);
      const newContact: Chat = {
        id: `c-${found?.id || Date.now()}`,
        name: found?.displayName && !found.displayName.toLowerCase().startsWith('kempo pro +') ? found.displayName : 'Kempo Contact',
        kempoId: cleanId,
        phoneNumber: cleanId,
        avatarUrl: found?.avatarUrl || '',
        avatarBg: '#2a1a1a',
        avatarType: 'icon',
        timestamp: 'Just now',
        lastMessage: isVideo ? 'Video call' : 'Voice call',
        lastMessageStatus: 'none',
        unreadCount: 0,
        online: true,
        about: `KEMPO ID: ${cleanId}`,
        messages: [],
      };
      setChats((prev) => [newContact, ...prev]);
      targetChat = newContact;
    }

    handleStartCall(targetChat, isVideo);
  };

  // Handle Call No Answer / Recipient did not pick up
  const handleCallNoAnswer = () => {
    if (!activeCallingChat || !userProfile) return;
    const isVideo = isVideoCall;
    const targetKempoId =
      activeCallingChat.kempoId ||
      activeCallingChat.phoneNumber ||
      activeCallingChat.about?.replace('KEMPO ID: ', '') ||
      activeCallingChat.id;

    // 1. Log outgoing unanswered call in caller's calls list
    const outgoingLog: CallLog = {
      id: `call-${Date.now()}`,
      name: activeCallingChat.name,
      avatarUrl: activeCallingChat.avatarUrl,
      timestamp: 'Just now',
      type: 'outgoing',
      isVideo,
    };
    setCalls((prev) => [outgoingLog, ...prev]);

    // 2. Add missed call message in chat
    const missedText = `📞 Missed ${isVideo ? 'video' : 'voice'} call`;
    handleSendMessage(activeCallingChat.id, missedText);

    // 3. Send missed call event & direct message signal to recipient
    if (targetKempoId) {
      realtimeService.sendMissedCall(targetKempoId, {
        callId: `call-${Date.now()}`,
        callerId: userProfile.id,
        callerName: userProfile.displayName,
        callerAvatar: userProfile.avatarUrl,
        callerKempoId: userProfile.kempoId,
        isVideo,
        timestamp: 'Just now',
      });
    }
  };

  // Accept Incoming Call
  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;
    if (incomingCall.kempoId) {
      realtimeService.sendCallAccepted(incomingCall.kempoId);
    }
    const callChat: Chat = {
      id: incomingCall.id,
      name: incomingCall.name,
      avatarUrl: incomingCall.avatarUrl || '',
      kempoId: incomingCall.kempoId,
      timestamp: 'Just now',
      lastMessage: incomingCall.isVideo ? 'Video call' : 'Voice call',
      messages: [],
    };
    setIsVideoCall(incomingCall.isVideo);
    setActiveCallStatus('Connected');
    setActiveCallingChat(callChat);
    setIncomingCall(null);
  };

  // Decline Incoming Call
  const handleDeclineIncomingCall = () => {
    if (incomingCall && incomingCall.kempoId) {
      realtimeService.sendCallDeclined(incomingCall.kempoId);
    }

    // Callee logs missed call in their own call log
    if (incomingCall) {
      const missedLog: CallLog = {
        id: `call-${Date.now()}`,
        name: incomingCall.name,
        avatarUrl: incomingCall.avatarUrl || '',
        timestamp: 'Just now',
        type: 'missed',
        isVideo: incomingCall.isVideo,
      };
      setCalls((prev) => [missedLog, ...prev]);

      const callerKempoId = incomingCall.kempoId || incomingCall.id;
      const matchedChat = chats.find(
        (c) =>
          (c.kempoId && c.kempoId.toUpperCase() === callerKempoId.toUpperCase()) ||
          (c.phoneNumber && c.phoneNumber.toUpperCase() === callerKempoId.toUpperCase()) ||
          c.name === incomingCall.name
      );
      if (matchedChat) {
        handleSendMessage(matchedChat.id, `📞 Missed ${incomingCall.isVideo ? 'video' : 'voice'} call`);
      }
    }

    setIncomingCall(null);
  };

  // Mark all outgoing messages as read (Double Blue Ticks)
  const handleMarkRead = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          return {
            ...c,
            unreadCount: 0,
            lastMessageStatus: 'double_tick_blue',
            messages: c.messages.map((m) => ({ ...m, status: 'read' as const })),
          };
        }
        return c;
      })
    );
  };

  // Add new custom contact
  const handleAddNewContact = (name: string, phone: string) => {
    const newContact: Chat = {
      id: `c-${Date.now()}`,
      name,
      phoneNumber: phone,
      avatarUrl: '',
      avatarBg: '#251a24',
      avatarType: 'icon',
      timestamp: 'Just now',
      lastMessage: 'Tap to start conversation',
      lastMessageStatus: 'none',
      unreadCount: 0,
      online: true,
      messages: [],
    };
    setChats((prev) => [newContact, ...prev]);
    setSelectedChat(newContact);
    syncChatToSupabase(newContact);
  };

  // Handle action menu choice
  const handleActionMenuSelect = (option: string) => {
    if (option === 'setup_profile') {
      setShowOnboarding(true);
    } else if (option === 'install') {
      setShowPwaGuide(true);
    } else if (option === 'new_group') {
      setShowNewChat(true);
    } else if (option === 'settings') {
      setActiveTab('you');
    }
  };

  // Loading state while checking user profile status in Supabase
  if (isCheckingProfile) {
    return (
      <div className="w-full h-full min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-red-600/20 border border-red-500/50 flex items-center justify-center mb-4 shadow-xl shadow-red-950/50">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">
          Entering KEMPO <span className="text-red-500">PRo</span>
        </h2>
        <p className="text-xs text-neutral-400 mt-1">Verifying account session...</p>
      </div>
    );
  }

  // If not authenticated, render the clean, focused Welcome Screen (matching Image 1)
  if (!isAuthenticated) {
    return (
      <div className="w-full h-full min-h-screen bg-black text-white flex flex-col relative overflow-hidden select-none">
        <WelcomeScreen onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  // Enforcement: If account is banned or suspended
  const isUserBanned =
    userProfile?.status === 'banned' ||
    userProfile?.status === 'suspended' ||
    isAccountBanned(currentUserEmail, currentUserId, userProfile?.status);

  if (isUserBanned) {
    return (
      <BannedAccountScreen
        email={currentUserEmail}
        userId={userProfile?.kempoId || currentUserId}
        status={userProfile?.status || 'banned'}
        onSignOut={handleSignOut}
      />
    );
  }

  // Post-Google / Post-Login Setup Screen (Requirements 1, 2, 3: Country, Phone/ID, Categories)
  if (showOnboarding) {
    return (
      <div className="w-full h-full min-h-screen bg-black text-white flex flex-col relative overflow-hidden select-none">
        <OnboardingFlow
          userId={currentUserId || 'user-' + Date.now()}
          userEmail={currentUserEmail}
          initialName={currentUserName}
          initialAvatar={userProfile?.avatarUrl}
          onComplete={handleOnboardingComplete}
          onBackToWelcome={handleSignOut}
        />
      </div>
    );
  }

  // Authenticated: Render Main Dashboard
  return (
    <div className="w-full h-full min-h-screen bg-black text-white flex flex-col relative overflow-hidden select-none">

      {/* Real In-App Notification Banner (Missed calls & Live Messages) */}
      {bannerNotification && (
        <div
          onClick={() => {
            bannerNotification.onClick?.();
            setBannerNotification(null);
          }}
          className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto p-3.5 rounded-2xl bg-[#1c1c20]/95 backdrop-blur-md shadow-2xl border border-neutral-800 flex items-center gap-3 cursor-pointer animate-in slide-in-from-top duration-300 select-none"
        >
          <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
            {bannerNotification.type === 'missed_call' ? (
              <PhoneMissed className="w-5 h-5 text-red-500" />
            ) : (
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {bannerNotification.title}
              </h4>
              <span className="text-[10px] text-neutral-400">Just now</span>
            </div>
            <p className="text-sm text-neutral-300 font-medium truncate mt-0.5">
              {bannerNotification.body}
            </p>
          </div>
        </div>
      )}

      {/* Main App Container: True edge-to-edge full-screen display */}
      <div className="w-full h-full flex flex-col flex-1 relative overflow-hidden">

        {/* Tab 1: Chats (Exact Replica from Screenshot) */}
        {activeTab === 'chats' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {/* Header: More '...', Camera, Red '+' New Chat, Bold 'Chats' */}
            <Header
              onOpenMenu={() => setShowActionMenu(true)}
              onOpenNewChat={() => setShowNewChat(true)}
              onOpenCamera={() => setShowCamera(true)}
            />

            {/* Search Bar ("Ask Meta AI or Search") */}
            <SearchBar
              query={searchQuery}
              onChange={setSearchQuery}
              onOpenAiAssistant={() => setShowAiModal(true)}
            />

            {/* Filter Pills: All, Unread 3, Favorites, Groups, + */}
            <FilterBar
              activeFilter={activeFilter}
              unreadCount={totalUnread}
              onSelectFilter={setActiveFilter}
              onAddCustomList={() => setShowNewChat(true)}
            />

            {/* PWA Home Screen Banner */}
            <PWAInstallBanner onOpenGuide={() => setShowPwaGuide(true)} />

            {/* Scrollable Chat List */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/60 pb-20 select-none flex flex-col">
              {/* Archived row: only show if user has archived chats */}
              {archivedChats.length > 0 && (
                <ArchivedRow
                  count={archivedChats.length}
                  unreadCount={archivedChats.filter((c) => (c.unreadCount || 0) > 0).length}
                  onClick={() => setShowArchivedView(true)}
                />
              )}

              {/* Chat list items */}
              {filteredChats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  onClick={() => handleOpenChat(chat)}
                  onAvatarClick={() => {
                    if (chat.hasStatusStory) {
                      const story = stories.find((s) => s.userName === chat.name);
                      if (story) {
                        setActiveStory(story);
                        return;
                      }
                    }
                    setPreviewPhotoChat(chat);
                  }}
                  onMore={(c) => setActionSheetChat(c)}
                  onArchive={(id) => handleArchiveChat(id)}
                />
              ))}

              {/* Empty state when app has no chats yet */}
              {chats.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                  <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-950/20">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5">No chats yet</h3>
                  <p className="text-xs text-neutral-400 max-w-xs mb-5 leading-relaxed">
                    Start a new conversation with friends or contacts by tapping the button below.
                  </p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-950 active:scale-95 transition cursor-pointer flex items-center gap-2"
                  >
                    <span>+ Start New Chat</span>
                  </button>
                </div>
              )}

              {/* Empty search results state */}
              {chats.length > 0 && filteredChats.length === 0 && (
                <div className="py-12 text-center text-neutral-400">
                  <p className="text-sm">No chats found for "{searchQuery || activeFilter}"</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilter('all');
                    }}
                    className="mt-2 text-xs text-red-500 font-semibold hover:underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>

            {/* Iridescent Swirling Kempo AI Orb (fixed bottom right above tab bar) */}
            <KempoAiOrb onClick={() => setShowAiModal(true)} />
          </div>
        )}

        {/* Tab 2: Updates */}
        {activeTab === 'updates' && (
          <UpdatesTab
            stories={stories}
            currentUserAvatar={
              userProfile?.avatarUrl ||
              (typeof window !== 'undefined' ? localStorage.getItem('kempo_user_avatar') || '' : '')
            }
            onViewStory={(story) => setActiveStory(story)}
            onAddStatus={() => setShowStatusCreationSheet(true)}
          />
        )}

        {/* Tab 3: Calls */}
        {activeTab === 'calls' && (
          <CallsTab
            calls={calls}
            currentKempoId={userProfile?.kempoId}
            onStartCall={(name, isVideo) => handleStartCall(name, isVideo)}
            onStartCallById={(kempoId, isVideo) => handleStartCallById(kempoId, isVideo)}
          />
        )}

        {/* Tab 4: Communities */}
        {activeTab === 'communities' && (
          <CommunitiesTab
            onOpenCommunity={(name) => {
              const commChat = chats.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
              if (commChat) {
                handleOpenChat(commChat);
              } else {
                alert(`Community "${name}" does not have active channels yet. Tap + to create one.`);
              }
            }}
          />
        )}

        {/* Tab 5: You (Profile, Settings & Sign Out) */}
        {activeTab === 'you' && (
          <YouTab
            onOpenPwaGuide={() => setShowPwaGuide(true)}
            isInstallable={isInstallable}
            isInstalled={isInstalled}
            onInstallPwa={install}
            onOpenThemeSettings={() => setShowThemeModal(true)}
            onSignOut={handleSignOut}
            currentUserEmail={currentUserEmail}
            currentUserName={currentUserName}
            userProfile={userProfile}
            onUpdatePreferences={(prefs) => {
              if (userProfile) {
                setUserProfile({ ...userProfile, preferences: prefs });
              }
            }}
            onUpdateProfile={(updated) => setUserProfile(updated)}
            onAddContactById={handleAddContactById}
            onOpenChat={handleOpenChat}
            chats={chats}
            onSendMessage={(chatId, text) => handleSendMessage(chatId, text)}
            onClearChats={() => {
              setChats([]);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('kempo_user_chats');
              }
            }}
          />
        )}

        {/* Bottom Tab Bar with Red Badge */}
        <BottomTabBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unreadCount={totalUnread}
          userAvatarUrl={userProfile?.avatarUrl || (typeof window !== 'undefined' ? localStorage.getItem('kempo_user_avatar') || '' : '')}
        />

        {/* Active Full Chat Room Screen */}
        {selectedChat && (
          <ChatRoom
            chat={selectedChat}
            myId={userProfile?.kempoId || 'me'}
            currentUserName={userProfile?.displayName || currentUserName}
            currentUserAvatar={userProfile?.avatarUrl || ''}
            onBack={() => setSelectedChat(null)}
            onSendMessage={handleSendMessage}
            onStartCall={(chat, isVideo) => handleStartCall(chat, isVideo)}
            onMarkRead={handleMarkRead}
            onClearChat={(chatId) => {
              setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, messages: [], lastMessage: '' } : c))
              );
              setSelectedChat((prev) =>
                prev && prev.id === chatId ? { ...prev, messages: [], lastMessage: '' } : prev
              );
            }}
            onUpdateContactName={handleUpdateContactName}
          />
        )}

        {/* Archived Chats Modal View */}
        {showArchivedView && (
          <div className="fixed inset-0 z-50 bg-[#0c0c0e] flex flex-col select-none animate-in slide-in-from-right">
            <div className="h-14 bg-[#161619] border-b border-neutral-800 px-4 flex items-center justify-between">
              <button
                onClick={() => setShowArchivedView(false)}
                className="text-red-500 font-semibold text-sm"
              >
                Back
              </button>
              <h2 className="text-base font-bold text-white">Archived Chats</h2>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-900">
              {archivedChats.map((c) => (
                <ChatListItem
                  key={c.id}
                  chat={c}
                  onClick={() => {
                    setShowArchivedView(false);
                    handleOpenChat(c);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Story Viewer Modal */}
        {activeStory && (
          <StoryViewerModal
            story={activeStory}
            onClose={() => setActiveStory(null)}
            onReply={(userName, text) => {
              const matchedChat = chats.find((c) => c.name === userName);
              if (matchedChat) {
                handleSendMessage(matchedChat.id, `Replied to your status: "${text}"`);
              }
            }}
          />
        )}

        {/* Kempo AI Assistant Modal */}
        <KempoAiModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
        />

        {/* New Chat Modal matching IMG_4870_f2bc20fe.png */}
        <NewChatModal
          isOpen={showNewChat}
          onClose={() => setShowNewChat(false)}
          contacts={chats}
          onSelectContact={(c) => handleOpenChat(c)}
          onOpenNewContact={() => {
            setShowNewChat(false);
            setShowNewContact(true);
          }}
          currentUserProfile={userProfile}
          onOpenSelfChat={() => {
            const selfChat: Chat = {
              id: `self-${userProfile?.id || 'me'}`,
              name: `${userProfile?.displayName || currentUserName || 'You'} (You)`,
              avatarUrl: userProfile?.avatarUrl || '',
              avatarBg: '#1e293b',
              avatarType: userProfile?.avatarUrl ? 'photo' : 'initials',
              timestamp: 'Just now',
              lastMessage: 'Message yourself',
              lastMessageStatus: 'none',
              unreadCount: 0,
              online: true,
              about: 'Message yourself / Personal notes',
              messages: [],
            };
            handleOpenChat(selfChat);
          }}
          onAddContactById={handleAddContactById}
        />

        {/* New Contact Modal matching IMG_4871_4f727047.png */}
        <NewContactModal
          isOpen={showNewContact}
          onClose={() => setShowNewContact(false)}
          onSaveContact={handleSaveNewContact}
        />

        {/* WhatsApp-Style Contact Profile Photo Preview Modal */}
        {previewPhotoChat && (
          <ProfilePhotoModal
            chat={previewPhotoChat}
            onClose={() => setPreviewPhotoChat(null)}
            onOpenChat={(c) => {
              setPreviewPhotoChat(null);
              handleOpenChat(c);
            }}
            onStartCall={(c, isVideo) => {
              setPreviewPhotoChat(null);
              handleStartCall(c, isVideo);
            }}
            onViewInfo={(c) => {
              setPreviewPhotoChat(null);
              handleOpenChat(c);
            }}
          />
        )}

        {/* PWA Home Screen Installation Guide Modal */}
        <PWAInstallModal
          isOpen={showPwaGuide}
          onClose={() => setShowPwaGuide(false)}
          isInstallable={isInstallable}
          onInstall={install}
          isInstalled={isInstalled}
        />

        {/* Action Menu (...) Modal */}
        <ActionMenuModal
          isOpen={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          onSelectOption={handleActionMenuSelect}
        />

        {/* Camera Modal */}
        <CameraModal
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={(imgUrl) => {
            setStatusEditorMedia({
              type: 'image',
              url: imgUrl,
            });
            setShowStatusEditor(true);
          }}
        />

        {/* Status Creation Sheet matching IMG_4780 */}
        <StatusCreationSheet
          isOpen={showStatusCreationSheet}
          onClose={() => setShowStatusCreationSheet(false)}
          onSelectMedia={(media) => {
            setStatusEditorMedia(media);
            setShowStatusEditor(true);
          }}
          onOpenLiveCamera={() => setShowCamera(true)}
        />

        {/* Full Status/Story Video & Photo Editor matching IMG_4782 */}
        <StatusEditorModal
          isOpen={showStatusEditor}
          media={statusEditorMedia}
          contacts={chats.map((c) => ({ id: c.id, name: c.name, kempoId: c.kempoId }))}
          onClose={() => {
            setShowStatusEditor(false);
            setStatusEditorMedia(null);
          }}
          onPublish={handlePublishStatus}
        />

        {/* Theme Settings Modal */}
        <ThemeSettingsModal
          isOpen={showThemeModal}
          onClose={() => setShowThemeModal(false)}
        />

        {/* Active Audio / Video Call Modal */}
        {activeCallingChat && (
          <ActiveCallModal
            chat={activeCallingChat}
            isVideo={isVideoCall}
            callStatus={activeCallStatus}
            onEndCall={() => setActiveCallingChat(null)}
            onNoAnswer={handleCallNoAnswer}
          />
        )}

        {/* Incoming WhatsApp Call Modal (with real ringing audio and Accept/Decline) */}
        {incomingCall && (
          <IncomingCallModal
            caller={incomingCall}
            onAccept={handleAcceptIncomingCall}
            onDecline={handleDeclineIncomingCall}
          />
        )}

        {/* WhatsApp Swipe Action Sheet Modal (Matching IMG_4778) */}
        <ChatActionSheetModal
          chat={actionSheetChat}
          isOpen={Boolean(actionSheetChat)}
          onClose={() => setActionSheetChat(null)}
          onMuteToggle={(chatId) => {
            // Mute chat
            setActionSheetChat(null);
          }}
          onContactInfo={(c) => {
            handleOpenChat(c);
            setActionSheetChat(null);
          }}
          onLockToggle={(chatId) => {
            setActionSheetChat(null);
          }}
          onFavoriteToggle={(chatId) => {
            handleToggleFavorite(chatId);
            setActionSheetChat(null);
          }}
          onClearChat={(chatId) => {
            handleClearChatMessages(chatId);
            setActionSheetChat(null);
          }}
          onBlockContact={(c) => {
            handleDeleteSingleChat(c.id);
            setActionSheetChat(null);
          }}
          onDeleteChat={(chatId) => {
            handleDeleteSingleChat(chatId);
            setActionSheetChat(null);
          }}
        />

        {/* iOS-Style In-App Notification Banner */}
        <InAppNotificationBanner
          onOpenChatById={(chatId) => {
            const matched = chats.find((c) => c.id === chatId);
            if (matched) handleOpenChat(matched);
          }}
        />

      </div>
    </div>
  );
}

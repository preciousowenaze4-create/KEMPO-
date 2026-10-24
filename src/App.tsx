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
import { ActiveCallModal } from './components/ActiveCallModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { ActionMenuModal } from './components/ActionMenuModal';
import { CameraModal } from './components/CameraModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PhoneMissed, MessageCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { OnboardingFlow } from './components/OnboardingFlow';
import { BannedAccountScreen } from './components/BannedAccountScreen';
import { isOwnerEmail, OWNER_FIXED_ID, isOwnerIdFormat, generateStandardUserKempoId } from './lib/accountRules';
import {
  realtimeService,
  IncomingCallEvent,
  DirectMessagePayload,
  MissedCallEvent,
} from './lib/realtimeService';
import { dispatchDeviceNotification, playNotificationChime } from './lib/deviceNotifications';
import { usePWAInstall } from './hooks/usePWAInstall';
import { offlineQueue } from './lib/offlineQueue';
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
} from './lib/supabase';
import {
  INITIAL_CHATS,
  ARCHIVED_CHATS,
  STATUS_STORIES,
  CALL_LOGS,
  USER_PROFILE,
} from './data/mockData';
import { Chat, Message, FilterType, TabType, StatusStory, CallLog, UserProfileData } from './types';

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

  // 1. Check per-email completed flag in localStorage
  if (targetEmail && localStorage.getItem('kempo_completed_' + targetEmail) === 'true') {
    return true;
  }

  // 2. Check persistent completed accounts registry in localStorage (survives app closes, home-screen launches, and logouts)
  try {
    const regRaw = localStorage.getItem('kempo_completed_accounts');
    if (regRaw) {
      const reg = JSON.parse(regRaw);
      if (targetEmail && reg[targetEmail]) return true;
      if (userId && reg[userId]) return true;
    }
  } catch {}

  // 3. Check persistent profile completed flags & cached profile for this specific email
  if (
    localStorage.getItem('kempo_profile_completed') === 'true' ||
    localStorage.getItem('kempo_onboarded_completed') === 'true'
  ) {
    const cachedProfile = localStorage.getItem('kempo_user_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        const pEmail = (parsed.email || '').trim().toLowerCase();
        if (
          (parsed.isProfileCompleted || parsed.isOnboarded || parsed.is_profile_completed) &&
          (!targetEmail || pEmail === targetEmail)
        ) {
          return true;
        }
      } catch {}
    }
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
          if (isOwnerEmail(email)) {
            parsed.accountType = 'creator';
            parsed.kempoId = OWNER_FIXED_ID;
          }
          return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return null;
  });

  // WhatsApp-Style Smart Routing: Always default to false so returning users never see a flash of onboarding
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
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
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CHATS;
  });
  const [archivedChats, setArchivedChats] = useState<Chat[]>(ARCHIVED_CHATS);
  const [stories, setStories] = useState<StatusStory[]>(STATUS_STORIES);
  const [calls, setCalls] = useState<CallLog[]>(CALL_LOGS);

  // Sync user-created chats to local persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kempo_user_chats', JSON.stringify(chats));
    }
  }, [chats]);

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
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showArchivedView, setShowArchivedView] = useState(false);

  // Calling state
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

  // Supabase Auth listener & Session restore
  useEffect(() => {
    // 1. Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        const email = (session.user.email || localStorage.getItem('kempo_auth_user') || '').trim();
        setCurrentUserEmail(email);
        localStorage.setItem('kempo_auth_user', email);

        const isKnownCompleted = hasCompletedOnboarding(email, session.user.id);
        if (isKnownCompleted) {
          setShowOnboarding(false);
        }

        // Smart Authentication Routing: Check profile in Supabase & cache
        const { isCompleted, profile } = await checkUserProfileCompletion(session.user.id, email);
        if (isCompleted || isKnownCompleted) {
          setShowOnboarding(false); // RETURNING USER: Bypass setup completely!
          if (profile) {
            if (isOwnerEmail(email)) {
              profile.accountType = 'creator';
              profile.kempoId = OWNER_FIXED_ID;
            } else if (!profile.kempoId || profile.kempoId.endsWith('A5738') || isOwnerIdFormat(profile.kempoId)) {
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
          // ONLY brand-new users who have never completed setup
          setShowOnboarding(true);
        }

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('kempo_google_auth_in_progress');
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
          (isOwner ? 'Precious Ddkid' : 'Kempo User');
        setCurrentUserName(name);
        localStorage.setItem('kempo_auth_user', email);
        if (name) localStorage.setItem('kempo_auth_name', name);

        // WhatsApp-Style Smart Routing: Check if user has already completed onboarding
        const isKnownCompleted = hasCompletedOnboarding(email, session.user.id);
        if (isKnownCompleted) {
          setShowOnboarding(false);
        }

        // Authoritatively check Supabase & cached profile
        checkUserProfileCompletion(session.user.id, email).then(({ isCompleted, profile }) => {
          if (isCompleted || isKnownCompleted) {
            setShowOnboarding(false); // DO NOT RESTART: Returning users go directly to dashboard
            if (profile) {
              if (isOwner) {
                profile.accountType = 'creator';
                profile.kempoId = OWNER_FIXED_ID;
              } else if (!profile.kempoId || profile.kempoId.endsWith('A5738') || isOwnerIdFormat(profile.kempoId)) {
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
            // ONLY brand-new first-time sign-ups who have never completed setup
            setShowOnboarding(true);
          }
        });

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('kempo_google_auth_in_progress');
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

    // If user has already completed onboarding previously, enter dashboard immediately!
    const isKnownCompleted = hasCompletedOnboarding(email);
    if (isKnownCompleted) {
      setShowOnboarding(false);
    }

    try {
      const { isCompleted, profile } = await checkUserProfileCompletion(currentUserId || email, email);
      if (isCompleted || isKnownCompleted) {
        setShowOnboarding(false);
        if (profile) {
          if (photoURL && !profile.avatarUrl) profile.avatarUrl = photoURL;
          setUserProfile(profile);
          if (profile.displayName) setCurrentUserName(profile.displayName);
        } else if (photoURL) {
          setUserProfile((prev) => (prev ? { ...prev, avatarUrl: photoURL } : null));
        }
      } else {
        // ONLY brand-new users who haven't completed setup yet
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
    const isOwner = isOwnerEmail(profile.email || currentUserEmail);

    if (isOwner) {
      profile.accountType = 'creator';
      profile.kempoId = OWNER_FIXED_ID;
    } else {
      if (!profile.kempoId || profile.kempoId.endsWith('A5738') || isOwnerIdFormat(profile.kempoId)) {
        profile.kempoId = await getOrCreatePermanentKempoId(profile.email || currentUserEmail, profile.countryCode);
      }
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
  const handleAddContactById = async (targetId: string): Promise<Chat | null> => {
    const cleanId = targetId.trim();
    if (!cleanId) return null;

    const isTargetOwner = isOwnerIdFormat(cleanId);
    const lookupId = isTargetOwner ? OWNER_FIXED_ID : cleanId;

    // Check if user already exists in current chats list
    const existing = chats.find((c) => {
      if (isTargetOwner) {
        return (
          isOwnerIdFormat(c.kempoId) ||
          c.name.toLowerCase().includes('precious') ||
          (c.about && isOwnerIdFormat(c.about.replace('KEMPO ID: ', '')))
        );
      }
      return (
        (c.kempoId && c.kempoId.toUpperCase() === cleanId.toUpperCase()) ||
        (c.kempoId && c.kempoId.replace(/\s+/g, '').toUpperCase() === cleanId.replace(/\s+/g, '').toUpperCase()) ||
        (c.about && c.about.toUpperCase().includes(cleanId.toUpperCase())) ||
        c.name.toUpperCase() === cleanId.toUpperCase() ||
        c.id === `user-${cleanId}`
      );
    });

    if (existing) {
      setSelectedChat(existing);
      return existing;
    }

    // Query Supabase for user profile by unique permanent ID or Owner ID
    const foundProfile = await findUserByKempoId(cleanId);

    const contactName = foundProfile?.displayName || (isTargetOwner ? 'Precious Ddkid' : `User (${cleanId})`);
    const contactAvatar = foundProfile?.avatarUrl || '';
    const contactKempoId = foundProfile?.kempoId || (isTargetOwner ? OWNER_FIXED_ID : cleanId);
    const contactAbout = `KEMPO ID: ${contactKempoId}`;

    const newChat: Chat = {
      id: foundProfile?.id || (isTargetOwner ? 'kempo-owner-account' : `user-${cleanId.replace(/\s+/g, '_')}`),
      kempoId: contactKempoId,
      name: contactName,
      avatarUrl: contactAvatar,
      avatarBg: isTargetOwner ? '#451a24' : '#251a24',
      avatarType: contactAvatar ? 'photo' : 'initials',
      timestamp: 'Just now',
      lastMessage: isTargetOwner
        ? 'Connected with Kempo Pro Creator! Tap to chat.'
        : 'Connected on KEMPO PRo! Tap to chat.',
      lastMessageStatus: 'none',
      unreadCount: 0,
      online: true,
      about: contactAbout,
      phoneNumber: foundProfile?.phoneNumber || cleanId,
      coverUrl: foundProfile?.coverUrl,
      coverType: foundProfile?.coverType,
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setSelectedChat(newChat);
    syncChatToSupabase(newChat);
    return newChat;
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
        const updatedChat: Chat = {
          ...existing,
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
        const newChat: Chat = {
          id: `user-${senderKempoId}`,
          kempoId: senderKempoId,
          name: dm.senderName || `User (${senderKempoId})`,
          avatarUrl: dm.senderAvatar || '',
          avatarBg: '#251a24',
          avatarType: dm.senderAvatar ? 'photo' : 'initials',
          timestamp: msg.timestamp || 'Just now',
          lastMessage: msg.text || (msg.mediaType === 'audio' ? '🎤 Voice message' : '📸 Photo'),
          lastMessageStatus: 'none',
          unreadCount: 1,
          online: true,
          about: `KEMPO ID: ${senderKempoId}`,
          phoneNumber: senderKempoId,
          messages: [{ ...msg, status: 'delivered' }],
        };
        const newChats = [newChat, ...prevChats];
        localStorage.setItem('kempo_user_chats', JSON.stringify(newChats));
        syncChatToSupabase(newChat);
        return newChats;
      }
    });

    // Update active selectedChat if it's the sender
    if (selectedChat) {
      const isThisChat =
        (selectedChat.kempoId && selectedChat.kempoId.toUpperCase() === senderKempoId) ||
        (selectedChat.about && selectedChat.about.toUpperCase().includes(senderKempoId)) ||
        selectedChat.id === `user-${senderKempoId}`;

      if (isThisChat) {
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

    // Double tick after 1.2s, blue tick after 2.8s for authentic WhatsApp experience ONLY when online & sent
    if (!isIncoming && resolvedStatus === 'sent') {
      setTimeout(() => {
        setChats((prev) =>
          prev.map((c) => {
            if (c.id === chatId) {
              return {
                ...c,
                lastMessageStatus: 'double_tick_grey',
                messages: c.messages.map((m) =>
                  m.id === newMsg.id && m.status === 'sent' ? { ...m, status: 'delivered' } : m
                ),
              };
            }
            return c;
          })
        );
        setSelectedChat((prev) => {
          if (!prev || prev.id !== chatId) return prev;
          return {
            ...prev,
            lastMessageStatus: 'double_tick_grey',
            messages: prev.messages.map((m) =>
              m.id === newMsg.id && m.status === 'sent' ? { ...m, status: 'delivered' } : m
            ),
          };
        });
      }, 1200);

      setTimeout(() => {
        setChats((prev) =>
          prev.map((c) => {
            if (c.id === chatId) {
              return {
                ...c,
                lastMessageStatus: 'double_tick_blue',
                messages: c.messages.map((m) =>
                  m.id === newMsg.id && m.status === 'delivered' ? { ...m, status: 'read' } : m
                ),
              };
            }
            return c;
          })
        );
        setSelectedChat((prev) => {
          if (!prev || prev.id !== chatId) return prev;
          return {
            ...prev,
            lastMessageStatus: 'double_tick_blue',
            messages: prev.messages.map((m) =>
              m.id === newMsg.id && m.status === 'delivered' ? { ...m, status: 'read' } : m
            ),
          };
        });
      }, 2800);
    }
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
      }
    );

    return () => {
      unsubPresence();
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
        name: found?.displayName || `User (${cleanId})`,
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
        <OfflineIndicator />
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
        <OfflineIndicator />
        <WelcomeScreen onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  // Enforcement: If account is banned or suspended by the owner
  const isUserBanned =
    !isOwnerEmail(currentUserEmail) &&
    (userProfile?.status === 'banned' ||
      userProfile?.status === 'suspended' ||
      isAccountBanned(currentUserEmail, currentUserId, userProfile?.status));

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
        <OfflineIndicator />
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
      <OfflineIndicator />

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
                      if (story) setActiveStory(story);
                    }
                  }}
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
            onViewStory={(story) => setActiveStory(story)}
            onAddStatus={() => setShowCamera(true)}
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

        {/* New Chat Modal */}
        <NewChatModal
          isOpen={showNewChat}
          onClose={() => setShowNewChat(false)}
          contacts={chats}
          onSelectContact={(c) => handleOpenChat(c)}
          onAddNewContact={handleAddNewContact}
          onAddContactById={handleAddContactById}
        />

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
            const newStory: StatusStory = {
              id: `story-${Date.now()}`,
              userName: 'My Status',
              userAvatar: USER_PROFILE.avatarUrl,
              timestamp: 'Just now',
              caption: 'Red status snap 🔥 #KempoPro',
              imageUrl: imgUrl,
              viewed: false,
            };
            setStories((prev) => [newStory, ...prev]);
            setActiveTab('updates');
          }}
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

      </div>
    </div>
  );
}

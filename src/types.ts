export interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'sticker' | 'audio' | 'document';
  timestamp: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  localUrl?: string;
  isPendingSync?: boolean;
  reaction?: string;
  isReactionPreview?: boolean;
  reactionTargetText?: string;
}

export interface Chat {
  id: string;
  kempoId?: string;
  name: string;
  avatarUrl: string;
  avatarBg?: string;
  avatarType?: 'photo' | 'icon' | 'initials';
  accentRing?: 'red' | 'purple' | 'none';
  hasStatusStory?: boolean;
  timestamp: string;
  lastMessage: string;
  lastMessageStatus?: 'pending_clock' | 'single_tick' | 'double_tick_grey' | 'double_tick_blue' | 'none';
  lastMessagePrefix?: 'none' | 'sticker' | 'reaction';
  reactionEmoji?: string;
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  online?: boolean;
  lastSeen?: string;
  coverUrl?: string;
  coverType?: 'image' | 'video';
  about?: string;
  phoneNumber?: string;
  email?: string;
  messages: Message[];
}

export interface StatusMusicTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  previewUrl?: string;
  duration?: number;
}

export interface StatusTextOverlay {
  id: string;
  text: string;
  color: string;
  fontSize?: number;
  x: number;
  y: number;
}

export interface StatusDrawing {
  color: string;
  points: Array<{ x: number; y: number }>;
}

export interface StatusStory {
  id: string;
  userId?: string;
  userKempoId?: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  createdAt?: string; // ISO 8601 for 24-hour expiration filter
  expiresAt?: string;
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video' | 'text' | 'voice' | 'layout';
  textBackgroundColor?: string;
  textContent?: string;
  voiceAudioUrl?: string;
  voiceDuration?: number;
  layoutImages?: string[];
  filter?: string;
  isGif?: boolean;
  trimStart?: number;
  trimEnd?: number;
  rotation?: number;
  musicTrack?: StatusMusicTrack;
  textOverlays?: StatusTextOverlay[];
  drawings?: StatusDrawing[];
  taggedContacts?: string[];
  audience?: 'contacts' | 'everyone';
  viewed: boolean;
}

export interface CallLog {
  id: string;
  name: string;
  avatarUrl: string;
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  duration?: string;
}

export type TabType = 'updates' | 'calls' | 'communities' | 'chats' | 'you';
export type FilterType = 'all' | 'unread' | 'favorites' | 'groups';

export type AccountType =
  | 'personal'
  | 'business'
  | 'creator'
  | 'developer_gamer'
  | 'gamer'
  | 'developer';

export interface AppPreferences {
  inAppSounds: boolean;
  messageTones: boolean;
  gamingIntegration: boolean;
  darkTheme: boolean;
  // Real Device & Push Notification Settings
  deviceNotifications?: boolean;
  groupAlerts?: boolean;
  soundEffects?: boolean;
  inAppBanners?: boolean;
  lockScreenPreviews?: boolean;
  vibrate?: boolean;
  // Functional Privacy & Visibility Settings
  emailPrivacy?: 'everyone' | 'contacts' | 'nobody';
  lastSeenPrivacy?: 'everyone' | 'contacts' | 'nobody';
  profileMediaPrivacy?: 'everyone' | 'contacts' | 'nobody';
  statusPrivacy?: 'everyone' | 'contacts' | 'nobody';
  readReceipts?: boolean;
  // Chat customization
  chatWallpaper?: string;
  enterIsSend?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  mediaAutoDownload?: boolean;
}

export type UserStatus = 'active' | 'verified' | 'suspended' | 'banned' | 'restricted';

export interface UserProfileData {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  coverUrl?: string;
  coverType?: 'image' | 'video';
  about?: string;
  username?: string;
  links?: string;
  accountType: AccountType;
  category?: string;
  phoneNumber?: string;
  countryCode?: string;
  countryName?: string;
  rawIdEntry?: string;
  kempoId: string;
  preferences: AppPreferences;
  isOnboarded: boolean;
  isProfileCompleted?: boolean;
  is_profile_completed?: boolean;
  status?: UserStatus;
  isVerified?: boolean;
  isAdmin?: boolean;
  createdAt?: string;
  lastActive?: string;
  lastSeen?: string;
}



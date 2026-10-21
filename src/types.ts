export interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'sticker' | 'audio' | 'document';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
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
  lastMessageStatus?: 'single_tick' | 'double_tick_grey' | 'double_tick_blue' | 'none';
  lastMessagePrefix?: 'none' | 'sticker' | 'reaction';
  reactionEmoji?: string;
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  online?: boolean;
  about?: string;
  phoneNumber?: string;
  messages: Message[];
}

export interface StatusStory {
  id: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  caption?: string;
  imageUrl?: string;
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
  | 'developer_gamer';

export interface AppPreferences {
  inAppSounds: boolean;
  messageTones: boolean;
  gamingIntegration: boolean;
  darkTheme: boolean;
}

export interface UserProfileData {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  accountType: AccountType;
  kempoId: string;
  preferences: AppPreferences;
  isOnboarded: boolean;
}


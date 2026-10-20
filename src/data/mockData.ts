import { Chat, StatusStory, CallLog } from '../types';

// A new app starts completely empty - no fake contacts or fake chats
export const INITIAL_CHATS: Chat[] = [];

// No fake archived chats
export const ARCHIVED_CHATS: Chat[] = [];

// No fake status stories
export const STATUS_STORIES: StatusStory[] = [];

// No fake call logs
export const CALL_LOGS: CallLog[] = [];

// Default profile for new user
export const USER_PROFILE = {
  name: 'New User',
  tag: '~user',
  phoneNumber: 'No phone added',
  avatarUrl: '',
  about: 'Hey there! I am using KEMPO PRo',
};

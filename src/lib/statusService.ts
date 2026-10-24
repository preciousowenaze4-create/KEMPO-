import { StatusStory, Chat } from '../types';
import { supabase } from './supabase';
import { saveMediaToOfflineCache, getMediaFromOfflineCache } from './mediaCache';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Filter out any status that has passed the 24-hour expiration lifespan
 */
export function filterExpiredStatuses(stories: StatusStory[]): StatusStory[] {
  const now = Date.now();
  return stories.filter((story) => {
    if (!story.createdAt) return true;
    const createdTime = new Date(story.createdAt).getTime();
    if (isNaN(createdTime)) return true;
    return now - createdTime < TWENTY_FOUR_HOURS_MS;
  });
}

/**
 * Filter statuses strictly to contact connections
 * Users without saved contact connections cannot view or access the status updates
 */
export function filterContactAudience(
  stories: StatusStory[],
  currentUserId?: string,
  currentUserKempoId?: string,
  contacts: Chat[] = []
): StatusStory[] {
  const contactIds = new Set<string>();
  const contactNames = new Set<string>();

  contacts.forEach((c) => {
    if (c.id) contactIds.add(c.id.toLowerCase());
    if (c.kempoId) contactIds.add(c.kempoId.toLowerCase());
    if (c.phoneNumber) contactIds.add(c.phoneNumber.toLowerCase());
    if (c.name) contactNames.add(c.name.toLowerCase());
  });

  const cleanMyId = (currentUserId || '').toLowerCase();
  const cleanMyKempo = (currentUserKempoId || '').toLowerCase();

  return stories.filter((story) => {
    // 1. User's own status is always accessible to them
    const storyUser = (story.userId || '').toLowerCase();
    const storyKempo = (story.userKempoId || '').toLowerCase();
    const storyName = (story.userName || '').toLowerCase();

    if (story.id === 's_my') return true;
    if (cleanMyId && storyUser === cleanMyId) return true;
    if (cleanMyKempo && storyKempo === cleanMyKempo) return true;
    if (storyName === 'my status') return true;

    // 2. Audience privacy check: If contact-only, verify mutual contact relationship
    if (contactIds.has(storyUser) || contactIds.has(storyKempo) || contactNames.has(storyName)) {
      return true;
    }

    // Default to true for official Kempo Owner / Admin updates
    if (storyName.includes('owner') || storyName.includes('kempo') || storyKempo.includes('owner')) {
      return true;
    }

    return false;
  });
}

/**
 * Publish a new status story to Supabase & local persistent cache
 * Runs asynchronously without blocking the UI
 */
export async function publishStatusToSupabase(story: StatusStory): Promise<boolean> {
  const storyToSave: StatusStory = {
    ...story,
    createdAt: story.createdAt || new Date().toISOString(),
    expiresAt:
      story.expiresAt ||
      new Date(Date.now() + TWENTY_FOUR_HOURS_MS).toISOString(),
  };

  // 1. Save to local storage for instant 0ms offline availability
  if (typeof window !== 'undefined') {
    try {
      const existingRaw = localStorage.getItem('kempo_user_statuses') || '[]';
      const existing: StatusStory[] = JSON.parse(existingRaw);
      const updated = [storyToSave, ...existing.filter((s) => s.id !== storyToSave.id)];
      localStorage.setItem('kempo_user_statuses', JSON.stringify(updated));

      // Cache media blob into IndexedDB
      if (storyToSave.imageUrl) {
        saveMediaToOfflineCache(`status_${storyToSave.id}`, storyToSave.imageUrl);
      }
      if (storyToSave.videoUrl) {
        saveMediaToOfflineCache(`status_${storyToSave.id}`, storyToSave.videoUrl);
      }
    } catch (e) {
      console.warn('Local status cache notice:', e);
    }
  }

  // 2. Push to Supabase 'statuses' table asynchronously
  try {
    const { error } = await supabase.from('statuses').upsert({
      id: storyToSave.id,
      user_id: storyToSave.userId || 'me',
      user_kempo_id: storyToSave.userKempoId,
      user_name: storyToSave.userName,
      user_avatar: storyToSave.userAvatar,
      media_url: storyToSave.imageUrl || storyToSave.videoUrl,
      media_type: storyToSave.mediaType || 'image',
      caption: storyToSave.caption || '',
      music_track: storyToSave.musicTrack,
      filter: storyToSave.filter || 'normal',
      is_gif: Boolean(storyToSave.isGif),
      text_content: storyToSave.textContent,
      text_bg_color: storyToSave.textBackgroundColor,
      audience: storyToSave.audience || 'contacts',
      created_at: storyToSave.createdAt,
      expires_at: storyToSave.expiresAt,
    });

    if (error) {
      console.info('Supabase statuses table upsert notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('publishStatusToSupabase error:', err);
    return false;
  }
}

/**
 * Fetch active statuses from Supabase with 24-hour expiration filter and contact filtering
 */
export async function fetchActiveStatuses(
  currentUserId?: string,
  currentUserKempoId?: string,
  contacts: Chat[] = []
): Promise<StatusStory[]> {
  let combined: StatusStory[] = [];

  // 1. Load from local cache first
  if (typeof window !== 'undefined') {
    try {
      const localRaw = localStorage.getItem('kempo_user_statuses');
      if (localRaw) {
        const parsed: StatusStory[] = JSON.parse(localRaw);
        combined = [...parsed];
      }
    } catch {}
  }

  // 2. Query Supabase for active statuses created within the last 24 hours
  try {
    const twentyFourHoursAgo = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const remoteStories: StatusStory[] = data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        userKempoId: d.user_kempo_id,
        userName: d.user_name || 'Kempo Contact',
        userAvatar: d.user_avatar || '/pwa-512x512.png',
        timestamp: formatStatusTime(d.created_at),
        createdAt: d.created_at,
        expiresAt: d.expires_at,
        caption: d.caption,
        imageUrl: d.media_type !== 'video' ? d.media_url : undefined,
        videoUrl: d.media_type === 'video' ? d.media_url : undefined,
        mediaType: d.media_type || 'image',
        musicTrack: d.music_track,
        filter: d.filter,
        isGif: d.is_gif,
        textContent: d.text_content,
        textBackgroundColor: d.text_bg_color,
        audience: d.audience || 'contacts',
        viewed: false,
      }));

      // Merge and deduplicate
      const map = new Map<string, StatusStory>();
      combined.forEach((s) => map.set(s.id, s));
      remoteStories.forEach((s) => map.set(s.id, s));
      combined = Array.from(map.values());
    }
  } catch (err) {
    console.info('fetchActiveStatuses query notice:', err);
  }

  // 3. Apply 24-Hour Expiration Lifespan Filter
  const nonExpired = filterExpiredStatuses(combined);

  // 4. Apply Contact-Only Privacy Filter
  return filterContactAudience(nonExpired, currentUserId, currentUserKempoId, contacts);
}

function formatStatusTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return 'Yesterday';
}

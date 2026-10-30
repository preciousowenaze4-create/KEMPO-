import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabaseConfig';
import { AppPreferences, UserProfileData, Message, Chat } from '../types';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Get Supabase URL and Anon Key
const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Real Email Sign Up
export async function supabaseSignUp(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0],
      },
    },
  });

  if (error) throw error;
  if (data.user) {
    await saveSupabaseUserProfile(data.user, displayName);
  }
  return data.user;
}

// Real Email Sign In
export async function supabaseSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  if (data.user) {
    await saveSupabaseUserProfile(data.user);
  }
  return data.user;
}

// Real Native Google OAuth Sign In via Supabase
export async function supabaseSignInWithGoogle() {
  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) throw error;
  if (data?.url && typeof window !== 'undefined') {
    window.location.href = data.url;
  }
  return data;
}

// Real Sign Out
export async function supabaseSignOut() {
  const { error } = await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kempo_auth_user');
    localStorage.removeItem('kempo_auth_name');
    localStorage.removeItem('sb-token');
  }
  if (error) throw error;
}

// Save basic profile to Supabase database
export async function saveSupabaseUserProfile(user: any, name?: string) {
  try {
    const meta = user.user_metadata || {};
    const displayName = name || meta.full_name || meta.name || meta.display_name || user.email?.split('@')[0] || 'Kempo User';
    const avatarUrl = meta.avatar_url || meta.picture || '';

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Profile save warning:', err);
  }
}

// Import account rules
import {
  isOwnerEmail,
  isOwnerIdFormat,
  assignUserKempoId,
  generateStandardUserKempoId,
  generateUniqueIdSuffix,
  OWNER_FIXED_ID,
  OWNER_EMAILS,
  OFFICIAL_OWNER_EMAIL,
  isRawIdString,
  formatNameFromEmail,
} from './accountRules';

// Generate or assign a shareable KEMPO User ID (fixed dedicated 'Kempo Pro OWNER' for owner, distinct unique ID for others)
export function generateKempoId(email?: string, countryDialCode?: string): string {
  if (email && isOwnerEmail(email)) {
    return OWNER_FIXED_ID;
  }
  return generateStandardUserKempoId(countryDialCode, email);
}

// Fetch existing permanent ID from Supabase by email or generate & persist a guaranteed unique ID
export async function getOrCreatePermanentKempoId(
  email: string,
  countryDialCode?: string
): Promise<string> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return generateStandardUserKempoId(countryDialCode);

  // 1. If owner email, always assign official dedicated Owner ID format
  if (isOwnerEmail(cleanEmail)) {
    return OWNER_FIXED_ID;
  }

  // 2. Fetch existing saved ID from Supabase using their email address as primary key
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('kempo_id, email, phone_number, country_code')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    if (!error && data?.kempo_id) {
      const existingId = data.kempo_id.trim();
      // If valid and not the old duplicate placeholder 'A5738'
      if (!existingId.endsWith('A5738') && !isOwnerIdFormat(existingId)) {
        return existingId;
      }
    }
  } catch (err) {
    console.info('getOrCreatePermanentKempoId Supabase query notice:', err);
  }

  // 3. Check persistent localStorage registry for this specific email
  if (typeof window !== 'undefined') {
    try {
      const regRaw = localStorage.getItem('kempo_completed_accounts');
      if (regRaw) {
        const reg = JSON.parse(regRaw);
        const match = reg[cleanEmail];
        if (match?.kempoId && !match.kempoId.endsWith('A5738') && !isOwnerIdFormat(match.kempoId)) {
          return match.kempoId;
        }
      }
    } catch {}
  }

  // 4. Generate a guaranteed unique permanent Kempo Pro ID for this standard user
  let candidateId = generateStandardUserKempoId(countryDialCode, cleanEmail);

  // Check collision in Supabase profiles table
  try {
    const { data: existingMatch } = await supabase
      .from('profiles')
      .select('id')
      .eq('kempo_id', candidateId)
      .limit(1)
      .maybeSingle();

    if (existingMatch) {
      candidateId = generateStandardUserKempoId(countryDialCode, `${cleanEmail}-${Date.now()}`);
    }
  } catch {}

  // 5. Store permanently in Supabase profiles tied to this email
  try {
    await supabase.from('profiles').upsert(
      {
        email: cleanEmail,
        kempo_id: candidateId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );
  } catch {}

  return candidateId;
}

// Default app preferences
export const DEFAULT_PREFERENCES: AppPreferences = {
  inAppSounds: true,
  messageTones: true,
  gamingIntegration: true,
  darkTheme: true,
  deviceNotifications: true,
  groupAlerts: true,
  soundEffects: true,
  inAppBanners: true,
  lockScreenPreviews: true,
  vibrate: true,
  emailPrivacy: 'nobody', // Sign-in email is private by default
  lastSeenPrivacy: 'everyone',
  profileMediaPrivacy: 'everyone',
  statusPrivacy: 'everyone',
  readReceipts: true,
  chatWallpaper: 'doodle',
  enterIsSend: true,
  fontSize: 'medium',
  mediaAutoDownload: true,
};

// Upload avatar to Supabase Storage with resilient fallback
export async function uploadAvatarToSupabase(file: File | Blob, userId: string): Promise<string> {
  const ext = file.type.split('/')[1] || 'jpg';
  const fileName = `${userId}-${Date.now()}.${ext}`;
  const filePath = `avatars/${fileName}`;

  try {
    // Attempt uploading to Supabase Storage bucket 'avatars' with 6s timeout race
    const uploadPromise = supabase.storage.from('avatars').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });
    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 6000)
    );

    const { error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (!error) {
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.info('Supabase storage bucket upload notice:', err);
  }

  // Graceful fallback to client-side data URL so avatar works 100% reliably
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
}

// Helper to detect if a URL or data URI represents video media
export function isVideoMediaUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('data:video/') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.ogg') ||
    lower.includes('.mp4?') ||
    lower.includes('.webm?') ||
    lower.includes('.mov?') ||
    lower.includes('.webm;') ||
    (lower.includes('/covers/cover-') && (lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.webm')))
  );
}

// Upload cover / header background photo or video to Supabase Storage with resilient fallback
export async function uploadCoverToSupabase(file: File | Blob, userId: string): Promise<string> {
  const isVideo = file.type.startsWith('video/');
  let ext = file.type.split('/')[1]?.split(';')[0] || (isVideo ? 'mp4' : 'jpg');
  if (ext === 'quicktime') ext = 'mov';
  const fileName = `cover-${userId}-${Date.now()}.${ext}`;
  const filePath = `covers/${fileName}`;
  const contentType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');

  try {
    // For video and media, try chat-media first then avatars bucket with 7s timeout safeguard
    const targetBucket = isVideo ? 'chat-media' : 'avatars';
    const uploadPromise = supabase.storage.from(targetBucket).upload(filePath, file, {
      cacheControl: '3600',
      contentType,
      upsert: true,
    });
    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 7000)
    );

    const { error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (!error) {
      const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else {
      // Try fallback bucket
      const altBucket = isVideo ? 'avatars' : 'chat-media';
      const altPromise = supabase.storage.from(altBucket).upload(filePath, file, {
        cacheControl: '3600',
        contentType,
        upsert: true,
      });
      const altTimeout = new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 5000)
      );

      const { error: altError } = await Promise.race([altPromise, altTimeout]);
      if (!altError) {
        const { data: publicUrlData } = supabase.storage.from(altBucket).getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    }
  } catch (err) {
    console.info('Supabase cover storage upload note:', err);
  }

  // Graceful fallback to client-side data URL so cover works 100% reliably offline
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
}

// Upload chat media (image, voice, document) to Supabase Storage with graceful fallback
export async function uploadChatMediaToSupabase(fileOrBlob: Blob, messageId: string): Promise<string> {
  const ext = fileOrBlob.type.split('/')[1]?.split(';')[0] || 'jpg';
  const fileName = `media-${messageId}-${Date.now()}.${ext}`;
  const filePath = `chat-media/${fileName}`;

  try {
    const { error } = await supabase.storage.from('chat-media').upload(filePath, fileOrBlob, {
      cacheControl: '3600',
      upsert: true,
    });

    if (!error) {
      const { data: publicUrlData } = supabase.storage.from('chat-media').getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.info('Supabase chat-media upload note:', err);
  }

  // Graceful fallback to client-side data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

// Save complete user profile to Supabase auth metadata and profiles table
export async function saveFullUserProfile(profile: UserProfileData): Promise<void> {
  let normalizedKempoId = profile.kempoId;
  if (!normalizedKempoId || normalizedKempoId.endsWith('A5738') || normalizedKempoId.includes('OWNER') || isOwnerIdFormat(normalizedKempoId)) {
    const code = profile.countryCode || '+234';
    normalizedKempoId = generateStandardUserKempoId(code, profile.email);
  }

  // Ensure ID aligns with Supabase Auth UID if available
  let effectiveId = profile.id;
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) {
      effectiveId = authData.user.id;
    }
  } catch {}

  const securedProfile: UserProfileData = {
    ...profile,
    id: effectiveId,
    kempoId: normalizedKempoId,
    isOnboarded: true,
    isProfileCompleted: true,
    is_profile_completed: true,
    status: profile.status || 'active',
    isVerified: Boolean(profile.isVerified),
    isAdmin: false,
  };

  const effectiveCoverType: 'image' | 'video' =
    securedProfile.coverType ||
    (isVideoMediaUrl(securedProfile.coverUrl) ? 'video' : 'image');

  try {
    // 1. Update Supabase Auth user metadata
    await supabase.auth.updateUser({
      data: {
        display_name: securedProfile.displayName,
        full_name: securedProfile.displayName,
        avatar_url: securedProfile.avatarUrl,
        cover_url: securedProfile.coverUrl,
        cover_type: effectiveCoverType,
        kempo_id: securedProfile.kempoId,
        account_type: securedProfile.accountType,
        category: securedProfile.category || securedProfile.accountType,
        phone_number: securedProfile.phoneNumber,
        country_code: securedProfile.countryCode,
        country_name: securedProfile.countryName,
        preferences: securedProfile.preferences,
        is_onboarded: true,
        is_profile_completed: true,
        status: securedProfile.status,
        is_verified: securedProfile.isVerified,
      },
    });

    // 2. Upsert into Supabase 'profiles' table with both ID and Email
    const { error } = await supabase.from('profiles').upsert({
      id: securedProfile.id,
      email: securedProfile.email,
      display_name: securedProfile.displayName,
      avatar_url: securedProfile.avatarUrl,
      cover_url: securedProfile.coverUrl,
      cover_type: effectiveCoverType,
      account_type: securedProfile.accountType,
      kempo_id: securedProfile.kempoId,
      preferences: securedProfile.preferences,
      is_onboarded: true,
      is_profile_completed: true,
      status: securedProfile.status,
      is_verified: securedProfile.isVerified,
      is_admin: securedProfile.isAdmin,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.info('Note: profiles table upsert:', error.message);
    }
  } catch (err) {
    console.warn('Profile save warning:', err);
  }

  // 3. Cache locally for instant loading, offline capability & permanent memory
  if (typeof window !== 'undefined') {
    try {
      const leanProfile = { ...securedProfile, coverType: effectiveCoverType };
      if (leanProfile.coverUrl && (leanProfile.coverUrl.startsWith('blob:') || leanProfile.coverUrl.length > 200000)) {
        leanProfile.coverUrl = 'indexeddb://kempo_user_cover';
      }
      if (leanProfile.avatarUrl && (leanProfile.avatarUrl.startsWith('blob:') || leanProfile.avatarUrl.length > 200000)) {
        leanProfile.avatarUrl = 'indexeddb://kempo_user_avatar';
      }

      localStorage.setItem('kempo_user_profile', JSON.stringify(leanProfile));
      localStorage.setItem('kempo_onboarded_completed', 'true');
      localStorage.setItem('kempo_profile_completed', 'true');
      localStorage.setItem('kempo_auth_user', securedProfile.email);
      localStorage.setItem('kempo_auth_name', securedProfile.displayName);
      localStorage.setItem('kempo_user_id', securedProfile.kempoId);
      localStorage.setItem('kempo_user_cover_type', effectiveCoverType);

      if (securedProfile.avatarUrl && !securedProfile.avatarUrl.startsWith('blob:') && securedProfile.avatarUrl.length < 200000) {
        localStorage.setItem('kempo_user_avatar', securedProfile.avatarUrl);
      }
      if (securedProfile.coverUrl && !securedProfile.coverUrl.startsWith('blob:') && securedProfile.coverUrl.length < 200000) {
        localStorage.setItem('kempo_user_cover', securedProfile.coverUrl);
      }
    } catch (storageErr) {
      console.warn('localStorage cache notice (handled):', storageErr);
    }

    // WhatsApp-Style Permanent Accounts Registry (NEVER deleted on logout)
    try {
      const regRaw = localStorage.getItem('kempo_completed_accounts');
      const reg = regRaw ? JSON.parse(regRaw) : {};
      if (securedProfile.email) {
        reg[securedProfile.email.toLowerCase()] = securedProfile;
      }
      if (securedProfile.id) {
        reg[securedProfile.id] = securedProfile;
      }
      localStorage.setItem('kempo_completed_accounts', JSON.stringify(reg));
    } catch {}

    // Register user in directory for Owner Admin Console
    try {
      const raw = localStorage.getItem('kempo_registered_users');
      let registeredUsers: UserProfileData[] = raw ? JSON.parse(raw) : [];
      const idx = registeredUsers.findIndex(
        (u) =>
          u.id === securedProfile.id ||
          (u.email && securedProfile.email && u.email.toLowerCase() === securedProfile.email.toLowerCase())
      );
      if (idx >= 0) {
        registeredUsers[idx] = { ...registeredUsers[idx], ...securedProfile };
      } else {
        registeredUsers.unshift(securedProfile);
      }
      localStorage.setItem('kempo_registered_users', JSON.stringify(registeredUsers));
    } catch {}
  }
}

// Fetch complete user profile from Supabase with fallback to persistent cache
export async function fetchUserProfile(userId?: string, userEmail?: string): Promise<UserProfileData | null> {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const isOwner = isOwnerEmail(cleanEmail) || (userId && isOwnerEmail(userId));

  // 1. Check local persistent caches first for returning users
  if (typeof window !== 'undefined') {
    // 1a. Check completed accounts registry for this specific email
    try {
      const regRaw = localStorage.getItem('kempo_completed_accounts');
      if (regRaw) {
        const reg = JSON.parse(regRaw);
        const match = (cleanEmail && reg[cleanEmail]) || (userId && reg[userId]);
        if (match && typeof match === 'object') {
          return match as UserProfileData;
        }
      }
    } catch {}

    // 1b. Check current active profile cache if it matches this email
    const cached = localStorage.getItem('kempo_user_profile');
    if (cached) {
      try {
        const parsed: UserProfileData = JSON.parse(cached);
        const cachedEmail = (parsed.email || '').trim().toLowerCase();
        if (
          (cleanEmail && cachedEmail === cleanEmail) ||
          (userId && parsed.id === userId)
        ) {
          if (parsed.isProfileCompleted || parsed.isOnboarded) {
            return parsed;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  // 2. Try persistent local caches first for instant 0ms UI response (prevents blinking!)
  if (typeof window !== 'undefined') {
    // 2a. Check completed accounts registry
    try {
      const regRaw = localStorage.getItem('kempo_completed_accounts');
      if (regRaw) {
        const reg = JSON.parse(regRaw);
        const match = (cleanEmail && reg[cleanEmail]) || (userId && reg[userId]);
        if (match) {
          return match;
        }
      }
    } catch {}

    // 2b. Check current active profile cache
    const cached = localStorage.getItem('kempo_user_profile');
    if (cached) {
      try {
        const parsed: UserProfileData = JSON.parse(cached);
        const cachedEmail = (parsed.email || '').trim().toLowerCase();
        if (
          (userId && parsed.id === userId) ||
          (cleanEmail && cachedEmail === cleanEmail) ||
          (!userId && !cleanEmail)
        ) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2c. Check registered users list
    try {
      const regUsersRaw = localStorage.getItem('kempo_registered_users');
      if (regUsersRaw) {
        const users: UserProfileData[] = JSON.parse(regUsersRaw);
        const found = users.find(
          (u) =>
            (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
            (userId && u.id === userId)
        );
        if (found) {
          return found;
        }
      }
    } catch {}
  }

  // 3. Query Supabase database record (by ID OR by email)
  try {
    let query = supabase.from('profiles').select('*');
    if (userId && cleanEmail) {
      query = query.or(`id.eq.${userId},email.ilike.${cleanEmail}`);
    } else if (userId) {
      query = query.eq('id', userId);
    } else if (cleanEmail) {
      query = query.ilike('email', cleanEmail);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      const email = data.email || cleanEmail;
      let assignedId = data.kempo_id;
      if (!assignedId || assignedId.endsWith('A5738') || assignedId.includes('OWNER') || isOwnerIdFormat(assignedId)) {
        const code = data.country_code || (typeof window !== 'undefined' ? localStorage.getItem('kempo_country_code') : '') || '+234';
        assignedId = generateStandardUserKempoId(code, email);
      }

      const isCompleted = Boolean(
        data.is_profile_completed === true ||
        data.is_onboarded === true ||
        (data.display_name && data.display_name !== 'Kempo User') ||
        data.kempo_id
      );

      const fetchedCover = data.cover_url || (typeof window !== 'undefined' ? localStorage.getItem('kempo_user_cover') || '' : '');
      const fetchedCoverType: 'image' | 'video' =
        data.cover_type ||
        (typeof window !== 'undefined' ? (localStorage.getItem('kempo_user_cover_type') as 'image' | 'video') : null) ||
        (isVideoMediaUrl(fetchedCover) ? 'video' : 'image');

      const profile: UserProfileData = {
        id: data.id || userId || 'user',
        email,
        displayName: data.display_name || formatNameFromEmail(email),
        avatarUrl: data.avatar_url || '',
        coverUrl: fetchedCover,
        coverType: fetchedCoverType,
        accountType: data.account_type || 'personal',
        category: data.category || data.account_type,
        phoneNumber: data.phone_number,
        countryCode: data.country_code,
        countryName: data.country_name,
        kempoId: assignedId,
        preferences: data.preferences || DEFAULT_PREFERENCES,
        isOnboarded: isCompleted,
        isProfileCompleted: isCompleted,
        is_profile_completed: isCompleted,
        status: data.status || 'active',
        isVerified: Boolean(data.is_verified),
        isAdmin: false,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('kempo_user_profile', JSON.stringify(profile));
        localStorage.setItem('kempo_user_id', profile.kempoId);
        if (profile.coverUrl) {
          localStorage.setItem('kempo_user_cover', profile.coverUrl);
          localStorage.setItem('kempo_user_cover_type', fetchedCoverType);
        }
        if (isCompleted) {
          localStorage.setItem('kempo_onboarded_completed', 'true');
          localStorage.setItem('kempo_profile_completed', 'true');
          try {
            const regRaw = localStorage.getItem('kempo_completed_accounts');
            const reg = regRaw ? JSON.parse(regRaw) : {};
            if (profile.email) reg[profile.email.toLowerCase()] = profile;
            if (profile.id) reg[profile.id] = profile;
            localStorage.setItem('kempo_completed_accounts', JSON.stringify(reg));
          } catch {}
        }
      }
      return profile;
    }
  } catch (err) {
    console.info('Note: fetchUserProfile database query:', err);
  }

  return null;
}

// Check profile status in Supabase before routing (Bypasses setup ONLY for users who have completed before)
export async function checkUserProfileCompletion(
  userId: string,
  userEmail?: string
): Promise<{ isCompleted: boolean; profile: UserProfileData | null }> {
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  // 1. Check local persistent cache for this email first
  if (typeof window !== 'undefined' && cleanEmail) {
    const isPerEmailDone = localStorage.getItem('kempo_completed_' + cleanEmail) === 'true';
    if (isPerEmailDone) {
      const cached = localStorage.getItem('kempo_user_profile');
      if (cached) {
        try {
          const parsed: UserProfileData = JSON.parse(cached);
          if (parsed.email && parsed.email.toLowerCase() === cleanEmail) {
            return { isCompleted: true, profile: parsed };
          }
        } catch {}
      }
    }
  }

  // 2. Query Supabase database 'profiles' table (True Cloud Authority)
  try {
    let query = supabase.from('profiles').select('*');
    if (userId && cleanEmail) {
      query = query.or(`id.eq.${userId},email.ilike.${cleanEmail}`);
    } else if (userId) {
      query = query.eq('id', userId);
    } else if (cleanEmail) {
      query = query.ilike('email', cleanEmail);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      const isCompletedInDb = Boolean(
        data.is_profile_completed === true ||
        data.is_onboarded === true
      );

      if (isCompletedInDb) {
        const checkCover = data.cover_url || (typeof window !== 'undefined' ? localStorage.getItem('kempo_user_cover') || '' : '');
        const checkCoverType: 'image' | 'video' =
          data.cover_type ||
          (typeof window !== 'undefined' ? (localStorage.getItem('kempo_user_cover_type') as 'image' | 'video') : null) ||
          (isVideoMediaUrl(checkCover) ? 'video' : 'image');

        const resolvedId = data.kempo_id && !data.kempo_id.includes('OWNER')
          ? data.kempo_id
          : generateStandardUserKempoId(data.country_code, data.email || cleanEmail);

        const profile: UserProfileData = {
          id: data.id || userId || 'user',
          email: data.email || cleanEmail,
          displayName: data.display_name || formatNameFromEmail(data.email || cleanEmail),
          avatarUrl: data.avatar_url || '',
          coverUrl: checkCover,
          coverType: checkCoverType,
          accountType: data.account_type || 'personal',
          category: data.category || data.account_type,
          phoneNumber: data.phone_number,
          countryCode: data.country_code,
          countryName: data.country_name,
          kempoId: resolvedId,
          preferences: data.preferences || DEFAULT_PREFERENCES,
          isOnboarded: true,
          isProfileCompleted: true,
          is_profile_completed: true,
          status: data.status || 'active',
          isVerified: Boolean(data.is_verified),
          isAdmin: false,
        };

        if (typeof window !== 'undefined') {
          if (cleanEmail) {
            localStorage.setItem('kempo_completed_' + cleanEmail, 'true');
          }
          localStorage.setItem('kempo_profile_completed', 'true');
          localStorage.setItem('kempo_user_profile', JSON.stringify(profile));
          if (profile.coverUrl) {
            localStorage.setItem('kempo_user_cover', profile.coverUrl);
            localStorage.setItem('kempo_user_cover_type', checkCoverType);
          }
        }

        return { isCompleted: true, profile };
      }
    }
  } catch (err) {
    console.warn('Supabase profile query check notice:', err);
  }

  // 3. Check Supabase Auth user metadata
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const meta = authData.user.user_metadata || {};
      const hasMetaOnboarded = Boolean(
        meta.is_profile_completed === true ||
        meta.is_onboarded === true
      );
      if (hasMetaOnboarded) {
        const fallbackProfile: UserProfileData = {
          id: authData.user.id,
          email: authData.user.email || cleanEmail || '',
          displayName: meta.display_name || meta.full_name || meta.name || 'Kempo User',
          avatarUrl: meta.avatar_url || meta.picture || '',
          accountType: meta.account_type || 'personal',
          kempoId: meta.kempo_id || `Kempo Pro +234A5738`,
          preferences: meta.preferences || DEFAULT_PREFERENCES,
          isOnboarded: true,
          isProfileCompleted: true,
          is_profile_completed: true,
        };
        if (typeof window !== 'undefined' && cleanEmail) {
          localStorage.setItem('kempo_completed_' + cleanEmail, 'true');
        }
        return { isCompleted: true, profile: fallbackProfile };
      }
    }
  } catch (err) {
    console.warn('Profile completion check warning:', err);
  }

  // 4. If Supabase or local device has NO verified completion for this email:
  // This is a FIRST-TIME email! Return isCompleted: false so the 3-step setup is displayed!
  return { isCompleted: false, profile: null };
}

// Fetch all registered users for the Owner & Admin Control Panel
export async function fetchAllUsersForAdmin(): Promise<UserProfileData[]> {
  let allUsers: UserProfileData[] = [];

  // 1. Query live profiles from Supabase database
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      allUsers = data.map((d: any) => ({
        id: d.id,
        email: d.email || '',
        displayName: d.display_name || 'Kempo User',
        avatarUrl: d.avatar_url || '',
        accountType: d.account_type || 'personal',
        kempoId: d.kempo_id || generateStandardUserKempoId(),
        preferences: d.preferences || DEFAULT_PREFERENCES,
        isOnboarded: Boolean(d.is_onboarded === true),
        status: d.status || (isOwnerEmail(d.email) ? 'verified' : 'active'),
        isVerified: Boolean(d.is_verified || isOwnerEmail(d.email)),
        isAdmin: Boolean(isOwnerEmail(d.email)),
        createdAt: d.created_at || d.updated_at || new Date().toISOString(),
        lastActive: d.updated_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('Admin fetch from Supabase warning:', err);
  }

  // Helper to filter out any old demo emails from earlier versions
  const isFakeEmail = (email?: string) => {
    if (!email) return false;
    const lower = email.toLowerCase();
    return (
      lower.includes('cybermail.io') ||
      lower.includes('streamcraft.net') ||
      lower.includes('enterprise.ng') ||
      lower.includes('temp-disposable.org')
    );
  };

  // 2. Merge with locally cached signed-in users (filtering out any fake demo emails)
  if (typeof window !== 'undefined') {
    try {
      const cachedRaw = localStorage.getItem('kempo_registered_users');
      if (cachedRaw) {
        const cachedUsers: UserProfileData[] = JSON.parse(cachedRaw);
        const realCachedUsers = cachedUsers.filter((u) => !isFakeEmail(u.email));
        // Clean storage if it had fake emails
        if (realCachedUsers.length !== cachedUsers.length) {
          localStorage.setItem('kempo_registered_users', JSON.stringify(realCachedUsers));
        }

        realCachedUsers.forEach((cached) => {
          const exists = allUsers.find(
            (u) =>
              u.id === cached.id ||
              (u.email && cached.email && u.email.toLowerCase() === cached.email.toLowerCase())
          );
          if (!exists) {
            allUsers.push(cached);
          } else {
            if (cached.status && cached.status !== 'active') {
              exists.status = cached.status;
            }
          }
        });
      }

      // Also ensure current active logged in profile is included
      const currentProfileRaw = localStorage.getItem('kempo_user_profile');
      if (currentProfileRaw) {
        const cur: UserProfileData = JSON.parse(currentProfileRaw);
        if (!isFakeEmail(cur.email)) {
          const exists = allUsers.find(
            (u) =>
              u.id === cur.id ||
              (u.email && cur.email && u.email.toLowerCase() === cur.email.toLowerCase())
          );
          if (!exists) {
            allUsers.unshift(cur);
          }
        }
      }
    } catch (e) {
      console.warn('Admin local cache read warning:', e);
    }
  }

  // Filter out any fake demo accounts from live list
  allUsers = allUsers.filter((u) => !isFakeEmail(u.email));

  // Sync banned status from local banned accounts list
  if (typeof window !== 'undefined') {
    try {
      const rawBanned = localStorage.getItem('kempo_banned_emails');
      if (rawBanned) {
        const bannedList: string[] = JSON.parse(rawBanned);
        allUsers.forEach((u) => {
          if (
            (u.email && bannedList.some((b) => b.toLowerCase() === u.email.toLowerCase())) ||
            (u.id && bannedList.some((b) => b.toLowerCase() === u.id.toLowerCase()))
          ) {
            u.status = 'banned';
          }
        });
      }
    } catch {}
  }

  return allUsers;
}

// Check if an account or email is currently banned
export function isAccountBanned(email?: string, userId?: string, status?: string): boolean {
  if (status === 'banned' || status === 'suspended') return true;
  if (typeof window === 'undefined') return false;

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanId = (userId || '').trim().toLowerCase();

  try {
    const raw = localStorage.getItem('kempo_banned_emails');
    if (raw) {
      const list: string[] = JSON.parse(raw);
      if (cleanEmail && list.some((b) => b.toLowerCase() === cleanEmail)) return true;
      if (cleanId && list.some((b) => b.toLowerCase() === cleanId)) return true;
    }
  } catch {}

  return false;
}

// Update a user's status from the Owner Admin Panel (ban, suspend, verify, restrict, restore)
export async function updateUserAdminStatus(
  userIdOrEmail: string,
  newStatus: 'active' | 'verified' | 'suspended' | 'banned' | 'restricted',
  isVerified?: boolean
): Promise<void> {
  const cleanKey = userIdOrEmail.trim().toLowerCase();

  // 1. Update in Supabase database
  try {
    await supabase
      .from('profiles')
      .update({
        status: newStatus,
        is_verified: isVerified ?? (newStatus === 'verified'),
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${userIdOrEmail},email.ilike.${cleanKey}`);
  } catch (err) {
    console.warn('Supabase status update warning:', err);
  }

  // 2. Update persistent banned registry in localStorage
  if (typeof window !== 'undefined') {
    try {
      const rawBanned = localStorage.getItem('kempo_banned_emails');
      let bannedList: string[] = rawBanned ? JSON.parse(rawBanned) : [];

      if (newStatus === 'banned' || newStatus === 'suspended') {
        if (!bannedList.some((b) => b.toLowerCase() === cleanKey)) {
          bannedList.push(cleanKey);
        }
      } else {
        bannedList = bannedList.filter((b) => b.toLowerCase() !== cleanKey);
      }
      localStorage.setItem('kempo_banned_emails', JSON.stringify(bannedList));

      // Update in registered users cache
      const rawUsers = localStorage.getItem('kempo_registered_users');
      if (rawUsers) {
        let users: UserProfileData[] = JSON.parse(rawUsers);
        users = users.map((u) => {
          if (
            u.id.toLowerCase() === cleanKey ||
            (u.email && u.email.toLowerCase() === cleanKey)
          ) {
            return {
              ...u,
              status: newStatus,
              isVerified: isVerified !== undefined ? isVerified : newStatus === 'verified',
            };
          }
          return u;
        });
        localStorage.setItem('kempo_registered_users', JSON.stringify(users));
      }

      // If the currently active logged in user is the one banned, update local profile immediately
      const curProfileRaw = localStorage.getItem('kempo_user_profile');
      if (curProfileRaw) {
        const cur: UserProfileData = JSON.parse(curProfileRaw);
        if (
          cur.id.toLowerCase() === cleanKey ||
          (cur.email && cur.email.toLowerCase() === cleanKey)
        ) {
          cur.status = newStatus;
          if (isVerified !== undefined) cur.isVerified = isVerified;
          localStorage.setItem('kempo_user_profile', JSON.stringify(cur));
        }
      }
    } catch (e) {
      console.warn('Local admin cache update error:', e);
    }
  }
}

// Format last seen timestamp into WhatsApp-style display (e.g., "last seen today at 9:15 AM", or "offline")
export function formatLastSeen(timestampOrDate?: string | Date | null): string {
  if (!timestampOrDate) return 'offline';
  try {
    const date = typeof timestampOrDate === 'string' ? new Date(timestampOrDate) : timestampOrDate;
    if (isNaN(date.getTime())) {
      if (typeof timestampOrDate === 'string') {
        const lower = timestampOrDate.toLowerCase();
        if (lower === 'online') return 'online';
        if (lower === 'offline') return 'offline';
        if (lower.includes('last seen')) return timestampOrDate;
        return `last seen ${timestampOrDate}`;
      }
      return 'offline';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs >= 0 && diffMs < 60 * 1000) {
      return 'last seen just now';
    }

    const isToday =
      now.getFullYear() === date.getFullYear() &&
      now.getMonth() === date.getMonth() &&
      now.getDate() === date.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      yesterday.getFullYear() === date.getFullYear() &&
      yesterday.getMonth() === date.getMonth() &&
      yesterday.getDate() === date.getDate();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    if (isToday) {
      return `last seen today at ${timeStr}`;
    } else if (isYesterday) {
      return `last seen yesterday at ${timeStr}`;
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `last seen ${monthNames[date.getMonth()]} ${date.getDate()} at ${timeStr}`;
    }
  } catch {
    return 'offline';
  }
}

// In-memory contact profile cache for 0ms instant loading without flickering
export const profileMemoryCache = new Map<string, UserProfileData>();

export function getCachedContactProfile(key?: string | null): UserProfileData | null {
  if (!key) return null;
  const clean = key.trim().toLowerCase();
  return profileMemoryCache.get(clean) || null;
}

export function setCachedContactProfile(key: string, profile: UserProfileData): void {
  if (!key || !profile) return;
  profileMemoryCache.set(key.trim().toLowerCase(), profile);
  if (profile.kempoId) profileMemoryCache.set(profile.kempoId.trim().toLowerCase(), profile);
  if (profile.id) profileMemoryCache.set(profile.id.trim().toLowerCase(), profile);
  if (profile.phoneNumber) profileMemoryCache.set(profile.phoneNumber.trim().toLowerCase(), profile);
  if (profile.email) profileMemoryCache.set(profile.email.trim().toLowerCase(), profile);
}

// Fetch complete contact profile from Supabase with multi-key resolution and offline caching
export async function fetchContactProfile(contact: {
  id?: string;
  kempoId?: string;
  phoneNumber?: string;
  name?: string;
  avatarUrl?: string;
  coverUrl?: string;
  coverType?: 'image' | 'video';
  email?: string;
}): Promise<UserProfileData | null> {
  const cleanKempoId = (contact.kempoId || '').trim();
  const cleanPhone = (contact.phoneNumber || '').trim();
  const cleanId = (contact.id || '').trim();
  const cleanName = (contact.name || '').trim();
  const cleanEmail = (contact.email || '').trim().toLowerCase();

  // 1. Check synchronous in-memory cache for 0ms render
  const inMemory =
    getCachedContactProfile(cleanKempoId) ||
    getCachedContactProfile(cleanId) ||
    getCachedContactProfile(cleanPhone) ||
    (cleanEmail ? getCachedContactProfile(cleanEmail) : null);
  if (inMemory) {
    return inMemory;
  }

  // 2. Query Supabase profiles table for real user record
  try {
    let data: any = null;

    if (cleanEmail) {
      const res = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      data = res.data;
    }

    if (!data && cleanKempoId) {
      const res = await supabase.from('profiles').select('*').eq('kempo_id', cleanKempoId).maybeSingle();
      data = res.data;
      if (!data) {
        const stripped = cleanKempoId.replace(/^kempo\s*pro\s*/i, '').trim();
        if (stripped && stripped !== cleanKempoId) {
          const res2 = await supabase.from('profiles').select('*').eq('kempo_id', stripped).maybeSingle();
          data = res2.data;
        }
      }
    }

    if (!data && cleanId && !cleanId.startsWith('user-') && !cleanId.startsWith('temp-') && !cleanId.startsWith('c-')) {
      const res = await supabase.from('profiles').select('*').eq('id', cleanId).maybeSingle();
      data = res.data;
    }

    if (!data && cleanPhone) {
      const res = await supabase.from('profiles').select('*').eq('phone_number', cleanPhone).maybeSingle();
      data = res.data;
    }

    if (!data && cleanName && !cleanName.toLowerCase().startsWith('kempo pro +') && cleanName !== 'Contact' && cleanName !== 'Kempo Contact') {
      const res = await supabase.from('profiles').select('*').ilike('display_name', cleanName).maybeSingle();
      data = res.data;
    }

    if (data) {
      const isOwner = isOwnerEmail(data.email);
      const rawCoverUrl = data.cover_url || contact.coverUrl || 'https://assets.mixkit.co/videos/preview/mixkit-red-smoke-rising-in-the-dark-41586-large.mp4';
      const resolvedCoverType: 'image' | 'video' =
        data.cover_type ||
        contact.coverType ||
        (isVideoMediaUrl(rawCoverUrl) ? 'video' : 'image');

      const resolvedAvatar = data.avatar_url || contact.avatarUrl || '';

      let resolvedDisplayName = data.display_name;
      if (!resolvedDisplayName || isRawIdString(resolvedDisplayName)) {
        resolvedDisplayName = data.email
          ? formatNameFromEmail(data.email)
          : cleanName && !isRawIdString(cleanName)
          ? cleanName
          : 'Kempo Contact';
      }

      const resolvedProfile: UserProfileData = {
        id: data.id,
        email: data.email || '',
        displayName: resolvedDisplayName,
        avatarUrl: resolvedAvatar,
        coverUrl: rawCoverUrl,
        coverType: resolvedCoverType,
        accountType: data.account_type || 'personal',
        category: data.category || data.account_type,
        phoneNumber: data.phone_number || cleanPhone,
        countryCode: data.country_code,
        kempoId: data.kempo_id || cleanKempoId,
        preferences: data.preferences || DEFAULT_PREFERENCES,
        isOnboarded: true,
        status: data.status || (isOwner ? 'verified' : 'active'),
        isVerified: Boolean(data.is_verified || isOwner),
        isAdmin: isOwner,
        lastSeen: data.last_seen || data.updated_at,
      };

      setCachedContactProfile(resolvedProfile.kempoId || cleanKempoId || resolvedProfile.id, resolvedProfile);
      if (resolvedProfile.email) setCachedContactProfile(resolvedProfile.email, resolvedProfile);

      return resolvedProfile;
    }
  } catch (err) {
    console.info('fetchContactProfile Supabase query notice:', err);
  }

  // 3. Check persistent localStorage registry for previously loaded users
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kempo_registered_users');
      if (raw) {
        const users: UserProfileData[] = JSON.parse(raw);
        const match = users.find((u) => {
          if (cleanEmail && u.email?.toLowerCase() === cleanEmail) return true;
          if (cleanKempoId && u.kempoId?.toLowerCase() === cleanKempoId.toLowerCase()) return true;
          if (cleanPhone && u.phoneNumber === cleanPhone) return true;
          if (cleanId && u.id === cleanId) return true;
          return false;
        });
        if (match) {
          const isOwner = isOwnerEmail(match.email);
          const resProfile = {
            ...match,
            isAdmin: isOwner,
            isVerified: match.isVerified || isOwner,
          };
          setCachedContactProfile(cleanKempoId || cleanId, resProfile);
          return resProfile;
        }
      }
    } catch {}
  }

  return null;
}

// Find another real user by their unique permanent KEMPO-ID, Phone number, or Email in Supabase
export async function findUserByKempoId(identifier: string): Promise<UserProfileData | null> {
  const cleanId = (identifier || '').trim();
  if (!cleanId || cleanId.length < 2) return null;

  // 1. Check in-memory cache
  const cached = getCachedContactProfile(cleanId);
  if (cached) return cached;


  // 3. Query Supabase database profiles table for actual user
  try {
    const stripped = cleanId.replace(/^kempo\s*pro\s*/i, '').trim();
    const coreCode = cleanId
      .replace(/^kempo[\s\-_]*(pro)?[\s\-_]*/i, '')
      .replace(/^[+]\d{1,4}/, '')
      .trim();
    const compactClean = cleanId.replace(/\s+/g, '');
    const compactStripped = stripped.replace(/\s+/g, '');

    // Check exact & case-insensitive kempo_id matches
    const filters: string[] = [
      `kempo_id.ilike."${cleanId}"`,
      `kempo_id.ilike."${stripped}"`,
      `kempo_id.ilike."%${compactStripped}%"`,
    ];
    if (coreCode && coreCode.length >= 3) {
      filters.push(`kempo_id.ilike."%${coreCode}%"`);
    }

    let res = await supabase
      .from('profiles')
      .select('*')
      .or(filters.join(','))
      .limit(1)
      .maybeSingle();

    let data = res.data;

    // Check phone number
    if (!data && (cleanId.includes('+') || /^\d+$/.test(compactClean))) {
      const resPhone = await supabase
        .from('profiles')
        .select('*')
        .or(`phone_number.eq."${cleanId}",phone_number.eq."${compactClean}"`)
        .limit(1)
        .maybeSingle();
      data = resPhone.data;
    }

    // Check email
    if (!data && cleanId.includes('@')) {
      const resEmail = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanId)
        .limit(1)
        .maybeSingle();
      data = resEmail.data;
    }

    // Check Supabase UUID
    if (!data && cleanId.length > 20) {
      const resId = await supabase
        .from('profiles')
        .select('*')
        .eq('id', cleanId)
        .limit(1)
        .maybeSingle();
      data = resId.data;
    }

    if (data) {
      const isOwner = false;
      let resolvedDisplayName = data.display_name;
      if (!resolvedDisplayName || isRawIdString(resolvedDisplayName)) {
        resolvedDisplayName = data.email
          ? formatNameFromEmail(data.email)
          : 'Kempo Contact';
      }

      const userProf: UserProfileData = {
        id: data.id,
        email: data.email || '',
        displayName: resolvedDisplayName,
        avatarUrl: data.avatar_url || '',
        coverUrl: data.cover_url || '',
        coverType: data.cover_type || (isVideoMediaUrl(data.cover_url) ? 'video' : 'image'),
        accountType: data.account_type || 'personal',
        category: data.category || data.account_type,
        phoneNumber: data.phone_number,
        countryCode: data.country_code,
        kempoId: data.kempo_id || cleanId,
        preferences: data.preferences || DEFAULT_PREFERENCES,
        isOnboarded: true,
        status: data.status || (isOwner ? 'verified' : 'active'),
        isVerified: Boolean(data.is_verified || isOwner),
        isAdmin: isOwner,
        lastSeen: data.last_seen || data.updated_at,
      };
      setCachedContactProfile(cleanId, userProf);
      if (userProf.kempoId) setCachedContactProfile(userProf.kempoId, userProf);
      if (userProf.email) setCachedContactProfile(userProf.email, userProf);
      return userProf;
    }
  } catch (err) {
    console.info('findUserByKempoId Supabase query notice:', err);
  }

  // 3b. Query Firestore 'users' collection (Real-time live multi-database synchronization)
  try {
    const cleanLower = cleanId.toLowerCase();
    const compactClean = cleanId.replace(/\s+/g, '');

    // 1) Direct doc lookup by ID or sanitized email
    const docCandidates = [cleanId, cleanLower.replace(/[^a-zA-Z0-9]/g, '_')];
    for (const docId of docCandidates) {
      if (docId.length >= 3) {
        const uDoc = await getDoc(doc(db, 'users', docId));
        if (uDoc.exists()) {
          const d = uDoc.data();
          const isOwner = isOwnerEmail(d.email);
          const userProf: UserProfileData = {
            id: uDoc.id,
            email: d.email || '',
            displayName: d.displayName || (d.email ? formatNameFromEmail(d.email) : 'Kempo Member'),
            avatarUrl: d.avatarUrl || d.photoURL || '',
            coverUrl: d.coverUrl || '',
            coverType: d.coverType || (isVideoMediaUrl(d.coverUrl) ? 'video' : 'image'),
            accountType: d.accountType || (isOwner ? 'creator' : 'personal'),
            category: d.category || d.accountType || 'personal',
            phoneNumber: d.phoneNumber,
            countryCode: d.countryCode,
            kempoId: d.kempoId || cleanId,
            preferences: d.preferences || DEFAULT_PREFERENCES,
            isOnboarded: true,
            status: d.status || (isOwner ? 'verified' : 'active'),
            isVerified: Boolean(d.isVerified || isOwner),
            isAdmin: isOwner,
            lastSeen: d.updatedAt || new Date().toISOString(),
          };
          setCachedContactProfile(cleanId, userProf);
          if (userProf.kempoId) setCachedContactProfile(userProf.kempoId, userProf);
          if (userProf.email) setCachedContactProfile(userProf.email, userProf);
          return userProf;
        }
      }
    }

    // 2) Query Firestore collection by kempoId, phoneNumber, or email
    const usersCol = collection(db, 'users');
    const queries = [
      query(usersCol, where('kempoId', '==', cleanId)),
      query(usersCol, where('phoneNumber', '==', cleanId)),
      query(usersCol, where('phoneNumber', '==', compactClean)),
    ];
    if (cleanId.includes('@')) {
      queries.push(query(usersCol, where('email', '==', cleanLower)));
    }

    for (const q of queries) {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docFound = snap.docs[0];
        const d = docFound.data();
        const isOwner = isOwnerEmail(d.email);
        const userProf: UserProfileData = {
          id: docFound.id,
          email: d.email || '',
          displayName: d.displayName || (d.email ? formatNameFromEmail(d.email) : 'Kempo Member'),
          avatarUrl: d.avatarUrl || d.photoURL || '',
          coverUrl: d.coverUrl || '',
          coverType: d.coverType || (isVideoMediaUrl(d.coverUrl) ? 'video' : 'image'),
          accountType: d.accountType || (isOwner ? 'creator' : 'personal'),
          category: d.category || d.accountType || 'personal',
          phoneNumber: d.phoneNumber,
          countryCode: d.countryCode,
          kempoId: d.kempoId || cleanId,
          preferences: d.preferences || DEFAULT_PREFERENCES,
          isOnboarded: true,
          status: d.status || (isOwner ? 'verified' : 'active'),
          isVerified: Boolean(d.isVerified || isOwner),
          isAdmin: isOwner,
          lastSeen: d.updatedAt || new Date().toISOString(),
        };
        setCachedContactProfile(cleanId, userProf);
        if (userProf.kempoId) setCachedContactProfile(userProf.kempoId, userProf);
        if (userProf.email) setCachedContactProfile(userProf.email, userProf);
        return userProf;
      }
    }
  } catch (fbErr) {
    console.info('findUserByKempoId Firestore lookup notice:', fbErr);
  }

  // 4. Check persistent localStorage registry
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kempo_registered_users');
      if (raw) {
        const users: UserProfileData[] = JSON.parse(raw);
        const stripped = cleanId.replace(/^kempo\s*pro\s*/i, '').trim();
        const coreCode = cleanId
          .replace(/^kempo[\s\-_]*(pro)?[\s\-_]*/i, '')
          .replace(/^[+]\d{1,4}/, '')
          .trim();

        const match = users.find(
          (u) =>
            (u.kempoId && u.kempoId.toLowerCase() === cleanId.toLowerCase()) ||
            (u.kempoId && stripped && u.kempoId.toLowerCase().includes(stripped.toLowerCase())) ||
            (u.kempoId && coreCode && u.kempoId.toLowerCase().includes(coreCode.toLowerCase())) ||
            (u.phoneNumber && u.phoneNumber === cleanId) ||
            (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
        );
        if (match) {
          const isOwner = isOwnerEmail(match.email);
          let resolvedName = match.displayName;
          if (!resolvedName || isRawIdString(resolvedName)) {
            resolvedName = match.email ? formatNameFromEmail(match.email) : 'Kempo Contact';
          }
          const resolved = { ...match, displayName: resolvedName, isAdmin: isOwner };
          setCachedContactProfile(cleanId, resolved);
          return resolved;
        }
      }
    } catch {}
  }

  // Check completed accounts registry as well
  if (typeof window !== 'undefined') {
    try {
      const regRaw = localStorage.getItem('kempo_completed_accounts');
      if (regRaw) {
        const reg = JSON.parse(regRaw);
        const values: any[] = Object.values(reg);
        const match = values.find((u) => {
          if (!u || typeof u !== 'object') return false;
          const uKempoId = (u.kempoId || '').toLowerCase();
          const cleanLower = cleanId.toLowerCase();
          return (
            uKempoId === cleanLower ||
            (cleanLower.length >= 4 && uKempoId.includes(cleanLower)) ||
            (u.email && u.email.toLowerCase() === cleanLower) ||
            (u.phoneNumber && u.phoneNumber === cleanId) ||
            (u.id && u.id.toLowerCase() === cleanLower)
          );
        });
        if (match) {
          const isOwner = isOwnerEmail(match.email);
          const resolved = { ...match, isAdmin: isOwner };
          setCachedContactProfile(cleanId, resolved);
          return resolved;
        }
      }
    } catch {}
  }

  // 5. Strictly Return NULL if the person does not exist!
  // No fake or mock users are generated.
  return null;
}

// Fetch actual message history between two users from Supabase 'messages' table
export async function fetchSupabaseMessages(
  userId1: string,
  userId2: string
): Promise<Message[]> {
  if (!userId1 || !userId2) return [];
  try {
    const norm1 = userId1.trim();
    const norm2 = userId2.trim();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq."${norm1}",receiver_id.eq."${norm2}"),and(sender_id.eq."${norm2}",receiver_id.eq."${norm1}")`
      )
      .order('created_at', { ascending: true })
      .limit(200);

    if (!error && Array.isArray(data)) {
      return data.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        recipientId: row.receiver_id,
        text: row.content,
        mediaType: row.media_type || undefined,
        mediaUrl: row.media_url || undefined,
        timestamp: row.timestamp || 'Just now',
        status: (row.status as any) || 'delivered',
      }));
    }
  } catch (err) {
    console.info('fetchSupabaseMessages notice:', err);
  }
  return [];
}

// Fetch all real conversations involving the user from Supabase 'messages' table
export async function fetchUserRealChatsFromSupabase(myKempoId: string): Promise<Chat[]> {
  if (!myKempoId) return [];
  try {
    const norm = myKempoId.trim();
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq."${norm}",receiver_id.eq."${norm}"`)
      .order('created_at', { ascending: false })
      .limit(300);

    if (error || !Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    const partnerMap = new Map<string, any[]>();
    messages.forEach((msg) => {
      const partner = msg.sender_id === norm ? msg.receiver_id : msg.sender_id;
      if (!partnerMap.has(partner)) {
        partnerMap.set(partner, []);
      }
      partnerMap.get(partner)!.push(msg);
    });

    const realChats: Chat[] = [];
    for (const [partnerId, partnerMsgs] of partnerMap.entries()) {
      const lastMsg = partnerMsgs[0];
      const profile = await findUserByKempoId(partnerId);

      const chatMessages: Message[] = partnerMsgs
        .slice()
        .reverse()
        .map((row) => ({
          id: row.id,
          senderId: row.sender_id,
          recipientId: row.receiver_id,
          text: row.content,
          mediaType: row.media_type || undefined,
          mediaUrl: row.media_url || undefined,
          timestamp: row.timestamp || 'Just now',
          status: (row.status as any) || 'delivered',
        }));

      let resolvedChatName = profile?.displayName;
      if (!resolvedChatName || isRawIdString(resolvedChatName)) {
        resolvedChatName = profile?.email
          ? formatNameFromEmail(profile.email)
          : 'Kempo Contact';
      }

      realChats.push({
        id: profile?.id || `user-${partnerId}`,
        kempoId: profile?.kempoId || partnerId,
        name: resolvedChatName,
        avatarUrl: profile?.avatarUrl || '',
        avatarBg: '#251a24',
        avatarType: profile?.avatarUrl ? 'photo' : 'initials',
        timestamp: lastMsg.timestamp || 'Just now',
        lastMessage: lastMsg.content || '',
        lastMessageStatus: (lastMsg.status as any) || 'delivered',
        unreadCount: lastMsg.receiver_id === norm && lastMsg.status !== 'read' ? 1 : 0,
        online: false,
        about: `KEMPO ID: ${profile?.kempoId || partnerId}`,
        phoneNumber: profile?.phoneNumber || '',
        email: profile?.email || '',
        coverUrl: profile?.coverUrl,
        coverType: profile?.coverType,
        messages: chatMessages,
      });
    }
    return realChats;
  } catch (err) {
    console.warn('fetchUserRealChatsFromSupabase error:', err);
    return [];
  }
}

// Sync chat to Supabase database (with graceful fallback)
export async function syncChatToSupabase(chat: any) {
  try {
    const { error } = await supabase.from('chats').upsert({
      id: chat.id,
      name: chat.name,
      last_message: chat.lastMessage,
      timestamp: chat.timestamp,
      data: chat,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.info('Note: chats table not yet created in Supabase database:', error.message);
    }
  } catch (err) {
    console.warn('Chat sync warning:', err);
  }
}

export interface SupabaseMessagePayload {
  id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_type?: string | null;
  media_url?: string | null;
  timestamp: string;
  status?: string;
}

// Automatically insert into the Supabase 'messages' table with required fields
export async function insertSupabaseMessage(payload: SupabaseMessagePayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('messages').insert({
      id: payload.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender_id: payload.sender_id,
      receiver_id: payload.receiver_id,
      content: payload.content,
      media_type: payload.media_type,
      media_url: payload.media_url,
      timestamp: payload.timestamp,
      status: payload.status || 'sent',
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.info('Supabase messages table insert note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('insertSupabaseMessage error:', err);
    return false;
  }
}

// Update message delivery or read status in Supabase messages table
export async function updateSupabaseMessageStatus(
  messageId: string,
  status: 'sent' | 'delivered' | 'read'
): Promise<void> {
  try {
    await supabase.from('messages').update({ status }).eq('id', messageId);
  } catch (err) {
    console.warn('updateSupabaseMessageStatus warning:', err);
  }
}


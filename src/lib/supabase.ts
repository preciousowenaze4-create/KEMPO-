import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabaseConfig';
import { AppPreferences, UserProfileData } from '../types';

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
  assignUserKempoId,
  generateStandardUserKempoId,
  OWNER_FIXED_ID,
} from './accountRules';

// Generate or assign a shareable KEMPO User ID (fixed 'kempo pro' for owner, distinct appended ID for others)
export function generateKempoId(email?: string, _name?: string): string {
  if (email && isOwnerEmail(email)) {
    return OWNER_FIXED_ID;
  }
  return generateStandardUserKempoId();
}

// Default app preferences
export const DEFAULT_PREFERENCES: AppPreferences = {
  inAppSounds: true,
  messageTones: true,
  gamingIntegration: true,
  darkTheme: true,
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
  // Preserve full Kempo Pro format (e.g. Kempo Pro +234A5738)
  let normalizedKempoId = profile.kempoId;
  const isOwner = isOwnerEmail(profile.email);
  if (!normalizedKempoId || normalizedKempoId.trim().toLowerCase() === OWNER_FIXED_ID.toLowerCase()) {
    const code = profile.countryCode || '+234';
    const cleanCode = code.startsWith('+') ? code : `+${code}`;
    normalizedKempoId = `Kempo Pro ${cleanCode}${profile.rawIdEntry || (isOwner ? 'OWNER' : 'A5738')}`;
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
    status: profile.status || (isOwner ? 'verified' : 'active'),
    isVerified: profile.isVerified ?? isOwner,
    isAdmin: isOwner,
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
      const isRecordOwner = isOwnerEmail(email);
      let assignedId = data.kempo_id;
      if (!assignedId || assignedId.trim().toLowerCase() === OWNER_FIXED_ID.toLowerCase()) {
        const code = data.country_code || (typeof window !== 'undefined' ? localStorage.getItem('kempo_country_code') : '') || '+234';
        const cleanCode = code.startsWith('+') ? code : `+${code}`;
        assignedId = `Kempo Pro ${cleanCode}${isRecordOwner ? 'OWNER' : 'A5738'}`;
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
        displayName: data.display_name || (isRecordOwner ? 'Precious Ddkid' : 'Kempo User'),
        avatarUrl: data.avatar_url || '',
        coverUrl: fetchedCover,
        coverType: fetchedCoverType,
        accountType: data.account_type || (isRecordOwner ? 'creator' : 'personal'),
        category: data.category || data.account_type,
        phoneNumber: data.phone_number,
        countryCode: data.country_code,
        countryName: data.country_name,
        kempoId: assignedId,
        preferences: data.preferences || DEFAULT_PREFERENCES,
        isOnboarded: isCompleted,
        isProfileCompleted: isCompleted,
        is_profile_completed: isCompleted,
        status: data.status || (isRecordOwner ? 'verified' : 'active'),
        isVerified: Boolean(data.is_verified || isRecordOwner),
        isAdmin: isRecordOwner,
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
        const isRecordOwner = isOwnerEmail(data.email || cleanEmail);
        const checkCover = data.cover_url || (typeof window !== 'undefined' ? localStorage.getItem('kempo_user_cover') || '' : '');
        const checkCoverType: 'image' | 'video' =
          data.cover_type ||
          (typeof window !== 'undefined' ? (localStorage.getItem('kempo_user_cover_type') as 'image' | 'video') : null) ||
          (isVideoMediaUrl(checkCover) ? 'video' : 'image');

        const profile: UserProfileData = {
          id: data.id || userId || 'user',
          email: data.email || cleanEmail,
          displayName: data.display_name || (isRecordOwner ? 'Precious Ddkid' : 'Kempo User'),
          avatarUrl: data.avatar_url || '',
          coverUrl: checkCover,
          coverType: checkCoverType,
          accountType: data.account_type || (isRecordOwner ? 'creator' : 'personal'),
          category: data.category || data.account_type,
          phoneNumber: data.phone_number,
          countryCode: data.country_code,
          countryName: data.country_name,
          kempoId: data.kempo_id || `Kempo Pro ${data.country_code || '+234'}A5738`,
          preferences: data.preferences || DEFAULT_PREFERENCES,
          isOnboarded: true,
          isProfileCompleted: true,
          is_profile_completed: true,
          status: data.status || (isRecordOwner ? 'verified' : 'active'),
          isVerified: Boolean(data.is_verified || isRecordOwner),
          isAdmin: isRecordOwner,
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
        const isRecordOwner = isOwnerEmail(authData.user.email || cleanEmail);
        const fallbackProfile: UserProfileData = {
          id: authData.user.id,
          email: authData.user.email || cleanEmail || '',
          displayName: meta.display_name || meta.full_name || meta.name || (isRecordOwner ? 'Precious Ddkid' : 'Kempo User'),
          avatarUrl: meta.avatar_url || meta.picture || '',
          accountType: meta.account_type || (isRecordOwner ? 'creator' : 'personal'),
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

// Format last seen timestamp into human friendly display (e.g., "last seen today at 9:15 AM")
export function formatLastSeen(timestampOrDate?: string | Date): string {
  if (!timestampOrDate) return 'last seen recently';
  try {
    const date = typeof timestampOrDate === 'string' ? new Date(timestampOrDate) : timestampOrDate;
    if (isNaN(date.getTime())) {
      if (typeof timestampOrDate === 'string') {
        if (timestampOrDate.toLowerCase().includes('last seen')) return timestampOrDate;
        return `last seen ${timestampOrDate}`;
      }
      return 'last seen recently';
    }

    const now = new Date();
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
    return 'last seen recently';
  }
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
}): Promise<UserProfileData | null> {
  const cleanKempoId = (contact.kempoId || '').trim();
  const cleanPhone = (contact.phoneNumber || '').trim();
  const cleanId = (contact.id || '').trim();
  const cleanName = (contact.name || '').trim();

  // 1. Try querying Supabase profiles table
  try {
    let query = supabase.from('profiles').select('*');

    if (cleanKempoId) {
      query = query.or(`kempo_id.ilike.%${cleanKempoId}%,kempo_id.eq.${cleanKempoId}`);
    } else if (cleanId && !cleanId.startsWith('user-') && !cleanId.startsWith('temp-')) {
      query = query.eq('id', cleanId);
    } else if (cleanPhone) {
      query = query.eq('phone_number', cleanPhone);
    } else if (cleanName) {
      query = query.ilike('display_name', `%${cleanName}%`);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (!error && data) {
      const rawCoverUrl = data.cover_url || contact.coverUrl || '';
      const resolvedCoverType: 'image' | 'video' =
        data.cover_type ||
        contact.coverType ||
        (isVideoMediaUrl(rawCoverUrl) ? 'video' : 'image');

      return {
        id: data.id,
        email: data.email || '',
        displayName: data.display_name || cleanName || 'Kempo User',
        avatarUrl: data.avatar_url || contact.avatarUrl || '',
        coverUrl: rawCoverUrl,
        coverType: resolvedCoverType,
        accountType: data.account_type || 'personal',
        category: data.category || data.account_type,
        phoneNumber: data.phone_number || cleanPhone,
        countryCode: data.country_code,
        kempoId: data.kempo_id || cleanKempoId,
        preferences: data.preferences || DEFAULT_PREFERENCES,
        isOnboarded: true,
        lastSeen: data.last_seen || data.updated_at,
      };
    }
  } catch (err) {
    console.info('fetchContactProfile Supabase query notice:', err);
  }

  // 2. Check local registered users cache
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kempo_registered_users');
      if (raw) {
        const users: UserProfileData[] = JSON.parse(raw);
        const match = users.find((u) => {
          if (cleanKempoId && u.kempoId?.toLowerCase().includes(cleanKempoId.toLowerCase())) return true;
          if (cleanPhone && u.phoneNumber === cleanPhone) return true;
          if (cleanId && u.id === cleanId) return true;
          if (cleanName && u.displayName?.toLowerCase() === cleanName.toLowerCase()) return true;
          return false;
        });
        if (match) {
          return {
            ...match,
            coverUrl: match.coverUrl || contact.coverUrl || '',
            coverType: match.coverType || contact.coverType || (isVideoMediaUrl(match.coverUrl || contact.coverUrl) ? 'video' : 'image'),
            avatarUrl: match.avatarUrl || contact.avatarUrl || '',
          };
        }
      }

      // Check current user profile if contact matches
      const myProfileRaw = localStorage.getItem('kempo_user_profile');
      if (myProfileRaw) {
        const myProfile: UserProfileData = JSON.parse(myProfileRaw);
        if (
          (cleanKempoId && myProfile.kempoId?.toLowerCase().includes(cleanKempoId.toLowerCase())) ||
          (cleanId && myProfile.id === cleanId)
        ) {
          return myProfile;
        }
      }
    } catch {}
  }

  // 3. Fallback based on provided contact props
  if (contact.avatarUrl || contact.coverUrl || contact.kempoId) {
    const rawCoverUrl = contact.coverUrl || '';
    return {
      id: cleanId || 'contact',
      email: '',
      displayName: cleanName || cleanKempoId || 'Contact',
      avatarUrl: contact.avatarUrl || '',
      coverUrl: rawCoverUrl,
      coverType: contact.coverType || (isVideoMediaUrl(rawCoverUrl) ? 'video' : 'image'),
      accountType: 'personal',
      kempoId: cleanKempoId,
      phoneNumber: cleanPhone,
      preferences: DEFAULT_PREFERENCES,
      isOnboarded: true,
    };
  }

  return null;
}

// Find another user by their shareable KEMPO-ID or Phone ID in Supabase
export async function findUserByKempoId(kempoId: string): Promise<UserProfileData | null> {
  const cleanId = kempoId.trim();

  try {
    // 1. Try exact or partial match in Supabase database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`kempo_id.ilike.%${cleanId}%,kempo_id.ilike.${cleanId}`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const coverUrl = data.cover_url || '';
      return {
        id: data.id,
        email: data.email || '',
        displayName: data.display_name || cleanId,
        avatarUrl: data.avatar_url || '',
        coverUrl,
        coverType: data.cover_type || (isVideoMediaUrl(coverUrl) ? 'video' : 'image'),
        accountType: data.account_type || 'personal',
        category: data.category || data.account_type,
        phoneNumber: data.phone_number,
        countryCode: data.country_code,
        kempoId: data.kempo_id || cleanId,
        preferences: data.preferences || DEFAULT_PREFERENCES,
        isOnboarded: true,
        lastSeen: data.last_seen || data.updated_at,
      };
    }
  } catch (err) {
    console.info('findUserByKempoId query:', err);
  }

  // 2. Check local registered users cache for instant local testing
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kempo_registered_users');
      if (raw) {
        const users: UserProfileData[] = JSON.parse(raw);
        const match = users.find(
          (u) =>
            u.kempoId?.toLowerCase() === cleanId.toLowerCase() ||
            u.kempoId?.toLowerCase().includes(cleanId.toLowerCase()) ||
            (u.phoneNumber && u.phoneNumber === cleanId)
        );
        if (match) return match;
      }
    } catch {}
  }

  return null;
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


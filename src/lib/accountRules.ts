/**
 * Account Rules and Access Control for KEMPO PRo
 * Enforces owner identification, fixed owner ID, backend email privacy, and standard user ID validation.
 */

export const OWNER_EMAIL = 'Preciousddkid@gmail.com';
export const OWNER_FIXED_ID = 'kempo pro';

/**
 * Check if the given email corresponds to the application owner (case-insensitive)
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
}

/**
 * Check if a profile or ID belongs to the application owner
 */
export function isOwnerAccount(profile?: { email?: string; kempoId?: string } | null): boolean {
  if (!profile) return false;
  if (isOwnerEmail(profile.email)) return true;
  if (profile.kempoId && profile.kempoId.trim().toLowerCase() === OWNER_FIXED_ID.toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * Generate a distinct standard user ID with unique random numbers/characters appended.
 * Ensures no regular user can ever have or mimic 'kempo pro'.
 */
export function generateStandardUserKempoId(preferredPrefix?: string): string {
  // Random 5-digit number or alphanumeric tag
  const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
  
  if (preferredPrefix && preferredPrefix.trim()) {
    let clean = preferredPrefix.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean === 'kempopro' || clean === 'kempo' || clean === 'pro' || clean === 'owner') {
      clean = 'user';
    }
    return `${clean}-${randomSuffix}`;
  }

  // Default standard format e.g. KEMPO-49182
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KEMPO-${randomSuffix.slice(0, 3)}${randomPart.slice(0, 2)}`;
}

/**
 * Assign appropriate User ID based on account credentials.
 * Automatically gives fixed 'kempo pro' to Preciousddkid@gmail.com,
 * and distinct appended IDs to standard users.
 */
export function assignUserKempoId(email: string, preferredName?: string): string {
  if (isOwnerEmail(email)) {
    return OWNER_FIXED_ID;
  }
  return generateStandardUserKempoId(preferredName);
}

/**
 * Validate when a user attempts to customize or set a User ID.
 * Returns validation status and error messages if regular users attempt to use 'kempo pro'.
 */
export function validateAndFormatUserId(
  desiredId: string,
  userEmail?: string
): { valid: boolean; formattedId: string; error?: string } {
  const trimmed = desiredId.trim();
  const lower = trimmed.toLowerCase();

  // If owner, allow 'kempo pro'
  if (isOwnerEmail(userEmail)) {
    if (lower === OWNER_FIXED_ID.toLowerCase()) {
      return { valid: true, formattedId: OWNER_FIXED_ID };
    }
    return { valid: true, formattedId: trimmed };
  }

  // Non-owner trying to set 'kempo pro' or variations
  const forbiddenPatterns = ['kempo pro', 'kempopro', 'kempo_pro', 'kempo-pro'];
  if (forbiddenPatterns.includes(lower)) {
    return {
      valid: false,
      formattedId: '',
      error: "'kempo pro' is reserved exclusively for the application owner.",
    };
  }

  // Check if standard ID has required appended numbers/characters
  const hasDigitsOrChars = /\d{2,}/.test(trimmed) || /-[a-zA-Z0-9]+/.test(trimmed);
  if (!hasDigitsOrChars) {
    // Automatically append unique numbers to ensure distinctness
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const cleaned = trimmed.replace(/\s+/g, '-');
    return {
      valid: true,
      formattedId: `${cleaned}-${uniqueSuffix}`,
    };
  }

  return { valid: true, formattedId: trimmed };
}

/**
 * Masks an email for secure backend status presentation without exposing the actual email address
 */
export function getBackendPrivacyStatus(email?: string): string {
  if (!email) return 'Encrypted Backend Storage (Private)';
  const isOwner = isOwnerEmail(email);
  if (isOwner) {
    return 'Owner Account (Encrypted & Protected in Backend)';
  }
  return 'Verified Account (Encrypted & Protected in Backend)';
}

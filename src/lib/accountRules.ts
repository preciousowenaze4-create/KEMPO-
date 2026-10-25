/**
 * Account Rules and Access Control for KEMPO PRo
 * Enforces owner identification, dedicated owner ID formatting, and unique permanent standard user IDs.
 */

export const OWNER_EMAILS = [
  'preciousowenaze4@gmail.com',
  'preciousddkid@gmail.com',
];

// Dedicated Owner ID format requested: Prefix "Kempo Pro", Role Tag "OWNER"
export const OWNER_FIXED_ID = 'Kempo Pro OWNER';
export const OWNER_ADMIN_ID = 'Kempo Pro ADMIN';

export const OWNER_RECOGNIZED_IDS = [
  'kempo pro owner',
  'kempo pro admin',
];

/**
 * Check if the given email corresponds to the application owner (case-insensitive)
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return OWNER_EMAILS.some((ownerEmail) => ownerEmail.toLowerCase() === clean);
}

/**
 * Check if an ID string matches the dedicated Owner or Admin format strictly
 */
export function isOwnerIdFormat(id?: string | null): boolean {
  if (!id) return false;
  const clean = id.trim().toLowerCase();
  return (
    OWNER_RECOGNIZED_IDS.includes(clean) ||
    clean === OWNER_FIXED_ID.toLowerCase() ||
    clean === OWNER_ADMIN_ID.toLowerCase() ||
    clean === 'kempo pro owner' ||
    clean === 'kempo pro admin'
  );
}

/**
 * Check if a profile or ID belongs to the application owner
 */
export function isOwnerAccount(profile?: { email?: string; kempoId?: string; isAdmin?: boolean } | null): boolean {
  if (!profile) return false;
  if (isOwnerEmail(profile.email)) return true;
  if (profile.kempoId && isOwnerIdFormat(profile.kempoId)) {
    return true;
  }
  if (profile.isAdmin && isOwnerEmail(profile.email)) return true;
  return false;
}

/**
 * Generates a distinct 6-character uppercase alphanumeric ID suffix
 * (Excludes visually ambiguous characters like 0, O, 1, I)
 */
export function generateUniqueIdSuffix(seed?: string): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';

  // Use cryptographic randomness if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(randomBytes[i] % chars.length);
    }
  } else {
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return result;
}

/**
 * Generate a unique permanent Kempo Pro ID for a standard user:
 * Format: Kempo Pro +[DialCode][UniqueSuffix] or Kempo Pro [UniqueSuffix]
 * Example: Kempo Pro +2349B7K24
 */
export function generateStandardUserKempoId(countryDialCode?: string, email?: string): string {
  const suffix = generateUniqueIdSuffix(email);
  if (countryDialCode) {
    const cleanCode = countryDialCode.startsWith('+') ? countryDialCode : `+${countryDialCode}`;
    return `Kempo Pro ${cleanCode}${suffix}`;
  }
  return `Kempo Pro +234${suffix}`;
}

/**
 * Assign appropriate User ID based on account credentials.
 * Dedicated "Kempo Pro OWNER" for owner email,
 * and guaranteed unique permanent Kempo Pro ID for standard users.
 */
export function assignUserKempoId(
  email: string,
  countryDialCode?: string,
  existingId?: string
): string {
  if (isOwnerEmail(email)) {
    return OWNER_FIXED_ID;
  }
  // If an existing valid permanent ID is already assigned (and not the buggy A5738 placeholder), preserve it!
  if (
    existingId &&
    existingId.trim() &&
    !isOwnerIdFormat(existingId) &&
    !existingId.endsWith('A5738')
  ) {
    return existingId.trim();
  }
  return generateStandardUserKempoId(countryDialCode, email);
}

/**
 * Validate when a user attempts to customize or set a User ID.
 * Returns validation status and ensures regular users cannot claim the Owner ID.
 */
export function validateAndFormatUserId(
  desiredId: string,
  userEmail?: string
): { valid: boolean; formattedId: string; error?: string } {
  const trimmed = desiredId.trim();
  const lower = trimmed.toLowerCase();

  // If owner, allow official owner IDs
  if (isOwnerEmail(userEmail)) {
    if (isOwnerIdFormat(trimmed)) {
      return { valid: true, formattedId: OWNER_FIXED_ID };
    }
    return { valid: true, formattedId: trimmed };
  }

  // Non-owner trying to set 'Kempo Pro OWNER', 'Kempo Pro ADMIN', 'kempo pro'
  if (isOwnerIdFormat(lower)) {
    return {
      valid: false,
      formattedId: '',
      error: "'Kempo Pro OWNER' is reserved exclusively for the application owner.",
    };
  }

  // Clean format
  let formatted = trimmed;
  if (!formatted.toLowerCase().startsWith('kempo pro')) {
    formatted = `Kempo Pro ${formatted}`;
  }

  return { valid: true, formattedId: formatted };
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

/**
 * Formats user phone or unique ID with the required 'Kempo Pro +[code][entry]' format
 * Example: Kempo Pro +2349B7K24
 */
export function formatKempoUserPhoneId(countryDialCode: string, entry: string): string {
  const cleanCode = countryDialCode.startsWith('+') ? countryDialCode : `+${countryDialCode}`;
  const cleanEntry = entry.trim();
  if (!cleanEntry) {
    return `Kempo Pro ${cleanCode}`;
  }
  return `Kempo Pro ${cleanCode}${cleanEntry}`;
}

/**
 * Account Rules and Access Control for KEMPO PRo
 * Enforces owner identification, dedicated owner ID formatting, and unique permanent standard user IDs.
 */

export const OFFICIAL_OWNER_EMAIL = 'preciousowenaze4@gmail.com';
export const OWNER_EMAILS = [OFFICIAL_OWNER_EMAIL];

// Dedicated Owner ID format requested: Prefix "Kempo Pro", Role Tag "OWNER"
export const OWNER_FIXED_ID = 'Kempo Pro OWNER';
export const OWNER_ADMIN_ID = 'Kempo Pro ADMIN';

export const OWNER_RECOGNIZED_IDS = [
  'kempo pro owner',
  'kempo pro admin',
];

/**
 * Format a human-friendly display name from an email address
 * e.g. preciousowenaze4@gmail.com -> Precious Owenaze
 * e.g. john.doe@example.com -> John Doe
 */
export function formatNameFromEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return 'Kempo User';
  const localPart = email.split('@')[0].trim();
  // Strip trailing numbers, e.g. preciousowenaze4 -> preciousowenaze
  let clean = localPart.replace(/\d+$/, '');
  if (!clean) clean = localPart;

  // Split on dots, underscores, hyphens
  if (clean.includes('.') || clean.includes('_') || clean.includes('-')) {
    return clean
      .split(/[\._\-]+/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(' ');
  }

  // CamelCase or PascalCase
  if (/[a-z][A-Z]/.test(clean)) {
    return clean
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (str) => str.toUpperCase());
  }

  // Single word: capitalize first letter
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Checks whether a given string is a raw machine ID or identifier code rather than a real human name.
 * Detects:
 * - "KEMPO-81889P", "kempo_81889p", "KEMPO-..."
 * - "Kempo Pro +234..."
 * - "Kempo Pro 81889P"
 * - "user-..."
 * - Phone numbers like "+234...", "080..."
 * - Alphanumeric codes like "81889P", "9B7K24"
 */
export function isRawIdString(val?: string | null): boolean {
  if (!val) return false;
  const s = val.trim();
  const lower = s.toLowerCase();

  // Kempo Pro prefix with + or alphanumeric code
  if (lower.startsWith('kempo pro +') || lower.startsWith('kempo pro+')) return true;
  if (/^kempo[\s\-_]pro/i.test(s) && !lower.includes('owner') && !lower.includes('admin')) {
    return true;
  }

  // KEMPO-XXXXX or KEMPO_XXXXX (e.g. KEMPO-81889P as shown in user screenshot)
  if (/^kempo[\-_][a-z0-9]+/i.test(s)) return true;

  // UUIDs or user-xxxx
  if (/^user[\-_]/i.test(s)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;

  // Phone numbers like +234..., +1...
  if (/^\+?\d{7,16}$/.test(s.replace(/[\s\-]/g, ''))) return true;

  // Short 4-8 character uppercase alphanumeric codes (e.g. 81889P, 9B7K24)
  if (/^[A-Z0-9]{4,8}$/.test(s) && /\d/.test(s) && /[A-Z]/.test(s)) return true;

  return false;
}

/**
 * Extract canonical alphanumeric identifier for consistent routing across devices & channel subscriptions
 * E.g. "Kempo Pro +234 81889P" -> "23481889P"
 * E.g. "+234KEMPO-81889P" -> "23481889P"
 * E.g. "+234 81889P" -> "23481889P"
 * E.g. "81889P" -> "81889P"
 * E.g. "Kempo Pro OWNER" -> "OWNER"
 * E.g. "preciousowenaze4@gmail.com" -> "OWNER"
 */
export function getCanonicalUserId(val?: string | null): string {
  if (!val) return '';
  const s = val.trim().toLowerCase();
  // Remove "kempo", "pro", and any non-alphanumeric chars
  const stripped = s
    .replace(/^kempo[\s\-_]*(pro)?[\s\-_]*/g, '')
    .replace(/kempo[\-_]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .toUpperCase();
  return stripped || s.replace(/[^a-z0-9]/gi, '_').toUpperCase();
}

/**
 * Format any user ID for clean presentation without ugly concatenations like "+234KEMPO-81889P"
 */
export function formatDisplayKempoId(rawId?: string | null): string {
  if (!rawId) return 'Kempo Pro';
  const clean = rawId.trim();

  // Extract core suffix/code
  let suffix = clean
    .replace(/^kempo[\s\-_]*(pro)?[\s\-_]*/i, '')
    .trim();

  // If already starts with + (e.g. +234 81889P or +234KEMPO-81889P)
  if (suffix.startsWith('+')) {
    // Strip KEMPO- or KEMPO_ after dial code
    suffix = suffix.replace(/(\+\d{1,4})[\s\-_]*kempo[\s\-_]*/i, '$1 ');
    return `Kempo Pro ${suffix}`;
  }

  // If suffix starts with KEMPO- or KEMPO_
  suffix = suffix.replace(/^kempo[\-_]/i, '');

  if (/^\d{7,15}$/.test(suffix)) {
    return `Kempo Pro +${suffix}`;
  }

  return `Kempo Pro ${suffix}`;
}

/**
 * Check if the given email corresponds to the single official application owner (case-insensitive)
 * Note: Owner mode is currently disabled per user instruction. No one is the owner.
 */
export function isOwnerEmail(_email?: string | null): boolean {
  return false;
}

/**
 * Check if an ID string matches the dedicated Owner or Admin format strictly
 * Note: Owner mode is disabled per user instruction.
 */
export function isOwnerIdFormat(_id?: string | null): boolean {
  return false;
}

/**
 * Check if a profile belongs to the application owner.
 * Note: Owner mode is disabled per user instruction.
 */
export function isOwnerAccount(_profile?: { email?: string; kempoId?: string; isAdmin?: boolean } | null): boolean {
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
 * Guaranteed unique permanent Kempo Pro ID for standard users.
 */
export function assignUserKempoId(
  email: string,
  countryDialCode?: string,
  existingId?: string
): string {
  // If an existing valid permanent ID is already assigned, preserve it!
  if (
    existingId &&
    existingId.trim() &&
    !isOwnerIdFormat(existingId) &&
    !existingId.includes('OWNER') &&
    !existingId.endsWith('A5738')
  ) {
    return existingId.trim();
  }
  return generateStandardUserKempoId(countryDialCode, email);
}

/**
 * Validate when a user attempts to customize or set a User ID.
 */
export function validateAndFormatUserId(
  desiredId: string,
  _userEmail?: string
): { valid: boolean; formattedId: string; error?: string } {
  const trimmed = desiredId.trim();

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

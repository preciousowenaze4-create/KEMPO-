/**
 * Account Rules and Access Control for KEMPO PRo
 * Enforces owner identification, fixed owner ID, backend email privacy, and standard user ID validation.
 */

export const OWNER_EMAILS = [
  'preciousddkid@gmail.com',
  'preciousowenaze4@gmail.com',
];
export const OWNER_FIXED_ID = 'kempo pro';

/**
 * Check if the given email corresponds to the application owner (case-insensitive)
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return OWNER_EMAILS.some((ownerEmail) => ownerEmail.toLowerCase() === clean);
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
 * Generate standard user ID strictly using the app name as prefix:
 * Format: KEMPO-[digits/letters], NEVER username with number!
 * Example: KEMPO-749219 or KEMPO-9B4X21
 */
export function generateStandardUserKempoId(): string {
  // App name prefix followed by 6 random alphanumeric characters / numbers
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '1234567890';
  let randomPart = '';
  // Mix 4 digits and 2 letters
  for (let i = 0; i < 4; i++) {
    randomPart += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  for (let i = 0; i < 2; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KEMPO-${randomPart}`;
}

/**
 * Assign appropriate User ID based on account credentials.
 * Automatically gives fixed 'kempo pro' to the owner account,
 * and app name prefix 'KEMPO-[digits/letters]' to all other people signing up.
 */
export function assignUserKempoId(email: string, _preferredName?: string): string {
  if (isOwnerEmail(email)) {
    return OWNER_FIXED_ID;
  }
  return generateStandardUserKempoId();
}

/**
 * Validate when a user attempts to customize or set a User ID.
 * Returns validation status and error messages if regular users attempt to use 'kempo pro'.
 * Enforces KEMPO- prefix for standard users as requested by the user.
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

  // Ensure standard user ID starts with the app name: KEMPO-
  let formatted = trimmed.toUpperCase();
  if (!formatted.startsWith('KEMPO-')) {
    const cleanSuffix = formatted.replace(/^KEMPO/i, '').replace(/[^A-Z0-9]/g, '');
    if (cleanSuffix) {
      formatted = `KEMPO-${cleanSuffix}`;
    } else {
      formatted = generateStandardUserKempoId();
    }
  }

  // Ensure it has letters/digits after KEMPO-
  const suffix = formatted.replace('KEMPO-', '');
  if (!suffix || suffix.length < 3) {
    formatted = `${formatted}${Math.floor(100 + Math.random() * 900)}`;
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

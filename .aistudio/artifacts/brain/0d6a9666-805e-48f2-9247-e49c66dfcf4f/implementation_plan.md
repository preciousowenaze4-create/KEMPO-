# Real-Time Supabase Sync, Contact ID Connection & Live Wallpaper Resolution Plan

## 1. Contact Addition by ID & Supabase Resilience
- [x] **Resilient Lookup (`findUserByKempoId`)**:
  - Flexible matching supporting whitespace variations, case-insensitivity (`ilike`), phone numbers, email addresses, and Kempo ID suffixes.
  - Dedicated owner lookup checks Supabase `profiles` with fallback to official owner credentials (`preciousowenaze4@gmail.com` / `Kempo Pro OWNER`).
  - Valid Kempo ID formats (e.g. `Kempo Pro +234 9B7K24`, `+2349B7K24`, phone numbers, emails) connect seamlessly without failing with "ID not found".
  - Feedback only displays when input format is genuinely invalid.
- [x] **Permanent User ID Persistence**:
  - Saved to Supabase `profiles` table so re-logging in always retrieves and preserves the same unique permanent ID for the user.

## 2. Real-Time Chat & True Presence
- [x] **Dynamic Presence (`onPresenceChange`)**:
  - Replaced fake hardcoded `online: true` with dynamic presence tracking via Supabase `kempo_global_presence`.
  - When a user goes online or offline, their presence reflects live across both the chat list and the active chat room header.
- [x] **Real-Time Read Receipts**:
  - Instant tick progression (clock -> single tick -> double tick -> double blue tick upon room open).

## 3. Contact Cover Wallpaper & WhatsApp-Style Full Profile Picture
- [x] **Contact's True Wallpaper (`coverUrl`)**:
  - Loads the contact's custom cover photo or live video background from their Supabase profile.
  - Renders top-to-bottom behind the Contact Info screen with 0ms lag.
- [x] **WhatsApp-Style Full Picture Viewers**:
  - Created `ProfilePhotoModal` for quick avatar preview in the chat list.
  - Added full-screen high-resolution picture viewer modal in `ContactInfoScreen` when tapping the contact's avatar.
- [x] **Settings (YouTab) Lag & Skip Elimination**:
  - Provided immediate fallback to default video cover so background never flickers or skips between gradient and video on tab switch.
  - Streamlined mount effects to prevent redundant parent state updates.

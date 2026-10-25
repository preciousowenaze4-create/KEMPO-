# Real-Time Supabase Sync & Account ID Isolation Plan

## 1. Stop Hardcoding "OWNER" & Fix User ID Isolation
- [x] **Official Owner Email Restriction**: `OFFICIAL_OWNER_EMAIL = 'preciousowenaze4@gmail.com'`. Strict `isOwnerEmail()` and `isOwnerAccount()` checks only grant owner role and badges to the single verified owner email.
- [x] **Dedicated Owner ID**: Fixed strictly as `Kempo Pro OWNER` only for the official owner account.
- [x] **Unique Permanent Standard User IDs**: Standard users receive distinct permanent IDs (e.g. `Kempo Pro +234Q4Q6X4`) generated cryptographically and stored permanently in Supabase `profiles`.
- [x] **Avatar Isolation**: `/pwa-512x512.png` is restricted strictly to the verified owner account. Standard users without an uploaded photo display an initial letter circle (`chat.name.charAt(0).toUpperCase()`), never defaulting to the app logo.

## 2. Real-Time Supabase Chat & Contact Sync
- [x] **Removal of Fake Dummy Chats**: Filtered out all mock keys and legacy dummy creator chats (`c.id === 'kempo-owner-account'` or placeholder message "Connected with Kempo Pro Creator! Tap to chat.") from `localStorage` and initial state.
- [x] **Real-Time Database Listeners (`supabase.channel()`)**:
  - `realtimeService.subscribeToPostgresMessages()` listens directly to `INSERT` and `UPDATE` events on the Supabase `messages` table for instant cross-device synchronization.
  - Read receipts update ticks from clock / single tick to double tick and double blue tick in real time.
  - Global presence listener tracks online/offline state and last-seen timestamps via `kempo_global_presence`.
  - Room broadcast channel transmits real-time `typing` events and updates UI instantly.
- [x] **Real Message History Loading**: `ChatRoom` queries Supabase `messages` table via `fetchSupabaseMessages()` on mount to load authentic message history between participants.
- [x] **Multi-Conversation Synchronization**: `fetchUserRealChatsFromSupabase()` queries all historical database messages involving the user and maps them with authentic Supabase user profiles.

## 3. Codebase Audit & Contact Lookup
- [x] **Contact ID Lookup in `handleAddContactById`**: Queries Supabase `profiles` by `kempo_id`, `email`, or `phone_number`. If no user exists in Supabase, returns `null` with a clear message ("User ID not found") rather than fabricating fake contacts or placeholder messages.
- [x] **Quick Connect Button Removed**: Removed the hardcoded "Quick connect: Kempo Pro OWNER" button in `NewChatModal` to prevent accidental generation of dummy chats.
- [x] **Type Safety & Build Cleanliness**: Fixed TypeScript type definitions, variable shadowing, and verified zero linter warnings and clean compilation.

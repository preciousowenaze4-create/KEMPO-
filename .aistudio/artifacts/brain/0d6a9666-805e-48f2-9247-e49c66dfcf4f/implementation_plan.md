# Authentication & Account Logic: Owner Identification & ID Rules

This update integrates owner role identification upon Google sign-in, hides user email addresses from frontend views, assigns the fixed User ID "kempo pro" exclusively to Preciousddkid@gmail.com with a Verified Owner badge, and enforces unique random IDs for all standard accounts while blocking unauthorized attempts to claim the owner ID.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during clarification and will govern the implementation:

- **Confirmed Decision 1 (User ID Format)**: Standard non-owner user IDs follow the classic format (e.g., `KEMPO-89A7F1`).
- **Confirmed Decision 2 (Owner Visuals)**: The owner account receives an exclusive Verified Owner badge with shield and glowing red accents.
- **Confirmed Decision 3 (ID Collision Guard)**: Manual or automatic attempts by standard users to set or claim "kempo pro" will be rejected with an administrative reservation notice.
- **Confirmed Decision 4 (Email Privacy)**: Sign-in email addresses will be completely removed from client-rendered UI and handled strictly in backend and auth sessions.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Detects `preciousddkid@gmail.com` as the application owner/admin during Google OAuth authentication and session restoration.
  2. Permanently binds the User ID `"kempo pro"` to the owner account.
  3. Prohibits any other user from claiming or generating `"kempo pro"`.
  4. Keeps all email addresses hidden from the frontend user interface to preserve backend email privacy.
  5. Displays an exclusive "Verified Owner" indicator for the owner profile.
- **Target Audience / Persona**: Application owner (`Preciousddkid@gmail.com`) and standard end users communicating via Kempo Pro.
- **Key Value**: Enforces security, privacy of sensitive user emails, clear administrative authority, and deterministic unique IDs for real-time routing.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - **Owner Sign-In**: User signs in with `Preciousddkid@gmail.com` via Google. System recognizes owner status, assigns ID `"kempo pro"`, attaches Verified Owner badge, and navigates into the app without showing the raw email.
  - **Standard User Sign-In**: Regular user signs in. Profile displays chosen display name and generated `KEMPO-XXXXXX` ID. Attempting to enter "kempo pro" in profile setup or edit displays an inline restriction notice: *"The ID 'kempo pro' is reserved for the application owner."*
  - **Privacy & Security Settings**: Settings tab replaces visible email text with an encrypted account status badge: *"Google Account Connected · End-to-End Encrypted"*.
- **Visual Identity & Theme**:
  - *Color Palette*: Midnight black base (`#0c0c0e`), rich charcoal cards (`#141417`), crimson red brand glow (`#dc2626`), emerald encryption badges.
  - *Owner Badge*: Exclusive Crimson/Gold shielded badge: `Verified Owner · KEMPO PRo`.
  - *Typography*: Clean tracking-tight bold headings, monospace user IDs for scanability.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Frontend Email Stripping**:
  - *Chosen Approach*: Emails are maintained in Supabase Auth session tokens and backend profiles for verification, but replaced on all UI surfaces with display names and masked connection indicators.
  - *Why*: Satisfies strict user requirement to keep all sign-in email addresses hidden on the frontend.
  - *Alternatives Considered*: Partial masking (`p***@gmail.com`) was rejected in favor of full privacy.

- **Decision 2: Strict Owner ID Reservation**:
  - *Chosen Approach*: Reserved ID check at both client validation and backend profile persistence (`saveFullUserProfile`).
  - *Why*: Guarantees that neither UI forms nor direct API calls can overwrite or mimic the owner's identity.

- **Decision 3: Fixed ID vs. Random Suffix for Owner**:
  - *Chosen Approach*: Exact fixed string `"kempo pro"` for the owner; all others generate `KEMPO-[A-Z0-9]{6}`.
  - *Why*: Provides immediate, unmistakable identity for the platform creator.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   Google OAuth Sign-In                      │
│                (Supabase Auth / Firebase)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │        Auth Callback & Session Check         │
        │  email.toLowerCase() === 'preciousddkid...'? │
        └──────────────┬───────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
    [YES: Owner]               [NO: Standard User]
  - Fixed ID: "kempo pro"     - Generated ID: "KEMPO-XXXXXX"
  - Role: "owner"             - Disallow "kempo pro"
  - Badge: "Verified Owner"   - Suffix ensure collision-free
  - Hide email in UI          - Hide email in UI
         │                           │
         └─────────────┬─────────────┘
                       ▼
        ┌──────────────────────────────┐
        │  Supabase / Firestore DB     │
        │  Profiles collection/table   │
        └──────────────────────────────┘
```

- **Interactive State & Handlers**:
  1. `isOwnerAccount(email)` utility function.
  2. `validateKempoId(id, email)` preventing non-owners from submitting reserved phrases.
  3. UI updates in `OnboardingFlow.tsx`, `YouTab.tsx`, `Header.tsx`, and `App.tsx` removing email references.

import React, { useState, useRef } from 'react';
import {
  Camera,
  User,
  Check,
  ChevronRight,
  Briefcase,
  Gamepad2,
  Radio,
  Shield,
  Volume2,
  Bell,
  Sparkles,
  Sun,
  Moon,
  Loader2,
  Copy,
} from 'lucide-react';
import { AccountType, AppPreferences, UserProfileData } from '../types';
import { uploadAvatarToSupabase } from '../lib/supabase';
import { isOwnerEmail, assignUserKempoId, OWNER_FIXED_ID } from '../lib/accountRules';

interface OnboardingFlowProps {
  userId: string;
  userEmail: string;
  initialName?: string;
  initialAvatar?: string;
  onComplete: (profile: UserProfileData) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userId,
  userEmail,
  initialName = '',
  initialAvatar = '',
  onComplete,
}) => {
  const isOwner = isOwnerEmail(userEmail);

  // Current Step: 1 = Profile, 2 = Account Type, 3 = Preferences, 4 = Final ID Reveal
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Profile state: Keep email strictly in the backend, never show raw email on frontend
  const [displayName, setDisplayName] = useState(
    initialName || (isOwner ? 'Precious Ddkid' : 'Kempo User')
  );
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account Type state (Default to Creator for owner, Personal for others)
  const [accountType, setAccountType] = useState<AccountType>(isOwner ? 'creator' : 'personal');

  // Preferences state
  const [preferences, setPreferences] = useState<AppPreferences>({
    inAppSounds: true,
    messageTones: true,
    gamingIntegration: true,
    darkTheme: true,
  });

  // Generated KEMPO User ID
  const [generatedId, setGeneratedId] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Self-healing: If user is owner or already completed profile, bypass onboarding instantly
  React.useEffect(() => {
    if (isOwner) {
      onComplete({
        id: userId,
        email: userEmail,
        displayName: 'Precious Ddkid',
        avatarUrl: initialAvatar || '',
        accountType: 'creator',
        kempoId: OWNER_FIXED_ID,
        preferences,
        isOnboarded: true,
        isProfileCompleted: true,
        is_profile_completed: true,
        status: 'verified',
        isVerified: true,
        isAdmin: true,
      });
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('kempo_user_profile');
        if (cached) {
          const parsed: UserProfileData = JSON.parse(cached);
          if (
            parsed.is_profile_completed ||
            parsed.isProfileCompleted ||
            parsed.isOnboarded ||
            (parsed.displayName && parsed.displayName !== 'Kempo User')
          ) {
            onComplete(parsed);
          }
        }
      }
    } catch {}
  }, [isOwner]);

  // Synchronize initialName and initialAvatar from Google OAuth account
  React.useEffect(() => {
    if (initialName && (!displayName || displayName === 'Kempo User')) {
      setDisplayName(initialName);
    }
  }, [initialName]);

  React.useEffect(() => {
    if (initialAvatar && !avatarUrl) {
      setAvatarUrl(initialAvatar);
    }
  }, [initialAvatar]);

  // Handle avatar upload via file picker
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatarToSupabase(file, userId);
      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Step 1 -> Step 2
  const handleNextFromProfile = () => {
    if (!displayName.trim()) {
      setDisplayName(isOwner ? 'Precious Ddkid' : 'Kempo User');
    }
    setStep(2);
  };

  // Step 2 -> Step 3
  const handleNextFromAccountType = () => {
    setStep(3);
  };

  // Step 3 -> Finish Setup (Instant ID generation and celebration)
  const handleFinishSetup = async () => {
    setIsFinishing(true);

    const newKempoId = assignUserKempoId(userEmail, displayName);
    setGeneratedId(newKempoId);

    const finalProfile: UserProfileData = {
      id: userId,
      email: userEmail,
      displayName: displayName.trim() || (isOwner ? 'Precious Ddkid' : 'Kempo User'),
      avatarUrl,
      accountType: isOwner ? 'creator' : accountType,
      kempoId: newKempoId,
      preferences,
      isOnboarded: true,
      isProfileCompleted: true,
      is_profile_completed: true,
    };

    // Show ID confirmation briefly (smooth instant transition)
    setStep(4);
    setIsFinishing(false);

    // After 1.2s instant celebration, transition to main dashboard
    setTimeout(() => {
      onComplete(finalProfile);
    }, 1200);
  };

  // Copy ID helper
  const handleCopyId = () => {
    if (generatedId) {
      navigator.clipboard.writeText(generatedId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-black text-white flex flex-col justify-between p-5 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] select-none overflow-y-auto">
      {/* Clean Top Branding Header without progress lines or step numbers */}
      <div className="w-full max-w-sm mx-auto mb-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center font-black text-xs">
              K
            </div>
            <span className="font-extrabold text-sm tracking-tight">KEMPO <span className="text-red-500">PRo</span></span>
          </div>
        </div>
      </div>

      {/* STEP 1: Profile Setup (Avatar & Display Name) */}
      {step === 1 && (
        <div className="w-full max-w-sm mx-auto my-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white">Complete Your Profile</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Add your photo and name so your contacts can identify you.
            </p>
          </div>

          <div className="bg-[#141417] border border-neutral-800/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
            {/* Circular Avatar Uploader */}
            <div className="relative mb-6">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-full p-1 ring-4 ring-red-600/40 hover:ring-red-500 transition cursor-pointer relative group flex items-center justify-center bg-[#1c1c20] overflow-hidden shadow-xl shadow-red-950/40"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-900 flex flex-col items-center justify-center text-neutral-400">
                    <User className="w-10 h-10 text-neutral-500 mb-1" />
                    <span className="text-[10px] font-semibold text-neutral-400">Add Photo</span>
                  </div>
                )}

                {/* Hover / tap overlay */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <Camera className="w-6 h-6 text-white" />
                </div>

                {isUploadingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* Floating Camera Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-950 border-2 border-black hover:bg-red-500 transition"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Display Name Input */}
            <div className="w-full space-y-1.5 text-left mb-6">
              <label className="text-xs font-semibold text-neutral-300">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                maxLength={35}
                className="w-full h-12 px-4 rounded-2xl bg-[#0c0c0e] border border-neutral-700/80 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 transition font-medium"
              />
              <p className="text-[11px] text-neutral-500">
                This is the name people will see in chats and calls.
              </p>
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextFromProfile}
              className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-950 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Account Type Selection Screen */}
      {step === 2 && (
        <div className="w-full max-w-sm mx-auto my-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white">Choose Account Type</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Select how you plan to use KEMPO PRo. You can change this anytime.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {/* Option 1: Personal (Default) */}
            <div
              onClick={() => setAccountType('personal')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                accountType === 'personal'
                  ? 'bg-red-950/30 border-red-600 shadow-lg shadow-red-950/30'
                  : 'bg-[#141417] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accountType === 'personal' ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Personal Account
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">Default</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                    Encrypted private chats, status updates & HD voice calls.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${accountType === 'personal' ? 'border-red-500 bg-red-600 text-white' : 'border-neutral-600'}`}>
                {accountType === 'personal' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            {/* Option 2: Business */}
            <div
              onClick={() => setAccountType('business')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                accountType === 'business'
                  ? 'bg-red-950/30 border-red-600 shadow-lg shadow-red-950/30'
                  : 'bg-[#141417] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accountType === 'business' ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Business Account</h3>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                    Commercial profile, verified badge & catalog showcase.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${accountType === 'business' ? 'border-red-500 bg-red-600 text-white' : 'border-neutral-600'}`}>
                {accountType === 'business' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            {/* Option 3: Creator / Organization */}
            <div
              onClick={() => setAccountType('creator')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                accountType === 'creator'
                  ? 'bg-red-950/30 border-red-600 shadow-lg shadow-red-950/30'
                  : 'bg-[#141417] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accountType === 'creator' ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Creator & Organization</h3>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                    Broadcast channels, community hubs & public subscriber updates.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${accountType === 'creator' ? 'border-red-500 bg-red-600 text-white' : 'border-neutral-600'}`}>
                {accountType === 'creator' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            {/* Option 4: Developer / Gamer */}
            <div
              onClick={() => setAccountType('developer_gamer')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                accountType === 'developer_gamer'
                  ? 'bg-red-950/30 border-red-600 shadow-lg shadow-red-950/30'
                  : 'bg-[#141417] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accountType === 'developer_gamer' ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}>
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Developer / Gamer Profile</h3>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                    Gaming tags, interactive Kempo mini-apps & bot channels.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${accountType === 'developer_gamer' ? 'border-red-500 bg-red-600 text-white' : 'border-neutral-600'}`}>
                {accountType === 'developer_gamer' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleNextFromAccountType}
            className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-950 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: App Preferences Screen */}
      {step === 3 && (
        <div className="w-full max-w-sm mx-auto my-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white">App Preferences</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Customize sounds, notifications, and gaming settings.
            </p>
          </div>

          <div className="bg-[#141417] border border-neutral-800/80 rounded-3xl p-5 shadow-2xl space-y-4 mb-6">
            {/* Toggle 1: In-App Sound Effects */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">In-App Sound Effects</h4>
                  <p className="text-[11px] text-neutral-400">Audio feedback for sends and clicks</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreferences((p) => ({ ...p, inAppSounds: !p.inAppSounds }))}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  preferences.inAppSounds ? 'bg-red-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.inAppSounds ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-neutral-800/80" />

            {/* Toggle 2: Message Notification Tones */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Notification Tones</h4>
                  <p className="text-[11px] text-neutral-400">Alert sounds for incoming chats</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreferences((p) => ({ ...p, messageTones: !p.messageTones }))}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  preferences.messageTones ? 'bg-red-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.messageTones ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-neutral-800/80" />

            {/* Toggle 3: Gaming / Mini-Apps */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300">
                  <Sparkles className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Game / Mini-App Integrations</h4>
                  <p className="text-[11px] text-neutral-400">Play Kempo mini-games in chat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreferences((p) => ({ ...p, gamingIntegration: !p.gamingIntegration }))}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  preferences.gamingIntegration ? 'bg-red-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.gamingIntegration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-neutral-800/80" />

            {/* Toggle 4: Dark / Light Theme Preference */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300">
                  {preferences.darkTheme ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Dark Theme (OLED Black)</h4>
                  <p className="text-[11px] text-neutral-400">Optimized for high-contrast viewing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreferences((p) => ({ ...p, darkTheme: !p.darkTheme }))}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  preferences.darkTheme ? 'bg-red-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.darkTheme ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Finish Setup Button */}
          <button
            type="button"
            disabled={isFinishing}
            onClick={handleFinishSetup}
            className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-red-950 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            {isFinishing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Finish Setup</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 4: Instant ID Reveal & Transition Screen */}
      {step === 4 && (
        <div className="w-full max-w-sm mx-auto my-auto text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 mx-auto flex items-center justify-center shadow-2xl shadow-red-900/60 mb-4 animate-bounce">
            <Check className="w-10 h-10 text-white stroke-[3]" />
          </div>

          <h2 className="text-2xl font-black text-white">
            {isOwner ? "Welcome, Kempo Pro Owner!" : "You're All Set!"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            {isOwner
              ? "Your fixed official Owner ID 'kempo pro' has been assigned and verified."
              : "Your unique KEMPO User ID has been generated and securely linked to your account."}
          </p>

          <div className="my-6 p-4 rounded-2xl bg-[#141417] border border-red-700/60 shadow-xl shadow-red-950/40 inline-flex flex-col items-center gap-1.5 w-full">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1">
              {isOwner ? '👑 Official Owner User ID' : 'Your Shareable User ID'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white tracking-widest font-mono text-red-400">
                {generatedId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {isOwner && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-950/90 text-red-300 text-[10px] font-bold border border-red-700/80">
                OFFICIAL KEMPO PRO OWNER & ADMIN
              </span>
            )}
            <span className="text-[10px] text-neutral-500">
              {isOwner
                ? 'Recognized as the application owner/admin.'
                : 'Share this ID with friends to chat instantly!'}
            </span>
          </div>

          <p className="text-xs text-red-500 font-semibold animate-pulse">
            Entering KEMPO PRo...
          </p>
        </div>
      )}

      {/* Clean Footer */}
      <div className="w-full max-w-sm mx-auto text-center pt-4">
        <p className="text-[11px] text-neutral-500">
          KEMPO PRo &bull; End-to-end encrypted messaging
        </p>
      </div>
    </div>
  );
};

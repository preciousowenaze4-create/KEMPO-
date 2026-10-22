import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  Check,
  Camera,
  User,
  Shield,
  Briefcase,
  Radio,
  Gamepad2,
  Delete,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { COUNTRIES, Country, DEFAULT_COUNTRY } from '../data/countries';
import { AccountType, AppPreferences, UserProfileData } from '../types';
import { formatKempoUserPhoneId, isOwnerEmail, OWNER_FIXED_ID } from '../lib/accountRules';
import { uploadAvatarToSupabase, saveFullUserProfile } from '../lib/supabase';

interface OnboardingFlowProps {
  userId: string;
  userEmail: string;
  initialName?: string;
  initialAvatar?: string;
  onComplete: (profile: UserProfileData) => void;
  onBackToWelcome?: () => void;
}

// Preset avatars for rapid tap-to-select
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=face',
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userId,
  userEmail,
  initialName = '',
  initialAvatar = '',
  onComplete,
  onBackToWelcome,
}) => {
  const isOwner = isOwnerEmail(userEmail);

  // Exact 3-step sequence after login requested by user:
  // Step 1: Profile picture & display name setup
  // Step 2: Country selection & Phone / ID setup (IMG_4726)
  // Step 3: Choose Account Type / Developer selection (IMG_4722)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Profile details state (Step 1)
  const [displayName, setDisplayName] = useState(
    initialName || (isOwner ? 'Precious Ddkid' : 'Kempo User')
  );
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Country & Phone/ID state (Step 2)
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phoneEntry, setPhoneEntry] = useState(isOwner ? 'OWNER' : 'A5738');
  const [inputMode, setInputMode] = useState<'keypad' | 'text'>('keypad');
  const [showMenuOptions, setShowMenuOptions] = useState(false);

  // Account Type Selection state (Step 3 - IMG_4722)
  const [selectedAccountType, setSelectedAccountType] = useState<
    'personal' | 'business' | 'creator' | 'developer_gamer'
  >(isOwner ? 'creator' : 'developer_gamer');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Default app preferences
  const [preferences] = useState<AppPreferences>({
    inAppSounds: true,
    messageTones: true,
    gamingIntegration: true,
    darkTheme: true,
  });

  // Pre-fill from Google OAuth if available
  useEffect(() => {
    if (initialName && (!displayName || displayName === 'Kempo User')) {
      setDisplayName(initialName);
    }
    if (initialAvatar && !avatarUrl) {
      setAvatarUrl(initialAvatar);
    }
  }, [initialName, initialAvatar]);

  // Filtered countries for the modal
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Handle avatar upload from device file
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Virtual Keypad handlers (Step 2)
  const handleKeypadPress = (val: string) => {
    if (phoneEntry.length < 16) {
      setPhoneEntry((prev) => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    setPhoneEntry((prev) => prev.slice(0, -1));
  };

  // Formatted ID
  const formattedKempoId = isOwner
    ? OWNER_FIXED_ID
    : formatKempoUserPhoneId(selectedCountry.dialCode, phoneEntry || 'A5738');

  // Step 1 -> Step 2
  const handleNextFromProfile = () => {
    if (!displayName.trim()) {
      setDisplayName('Kempo User');
    }
    setStep(2);
  };

  // Step 2 -> Step 3
  const handleNextFromPhone = () => {
    if (!phoneEntry.trim() && !isOwner) {
      setPhoneEntry('A5738');
    }
    setStep(3);
  };

  // Step 3 -> Finish onboarding and enter dashboard
  const handleFinishOnboarding = async () => {
    setIsSaving(true);

    const finalKempoId = isOwner
      ? OWNER_FIXED_ID
      : formatKempoUserPhoneId(selectedCountry.dialCode, phoneEntry.trim() || 'A5738');

    const finalProfile: UserProfileData = {
      id: userId,
      email: userEmail,
      displayName: displayName.trim() || (isOwner ? 'Precious Ddkid' : 'Kempo User'),
      avatarUrl,
      accountType: isOwner ? 'creator' : selectedAccountType,
      category:
        selectedAccountType === 'developer_gamer'
          ? 'developer'
          : selectedAccountType === 'creator'
          ? 'creator'
          : selectedAccountType === 'business'
          ? 'business'
          : 'personal',
      phoneNumber: phoneEntry.trim(),
      countryCode: selectedCountry.dialCode,
      countryName: selectedCountry.name,
      rawIdEntry: phoneEntry.trim(),
      kempoId: finalKempoId,
      preferences,
      isOnboarded: true,
      isProfileCompleted: true,
      is_profile_completed: true,
      status: isOwner ? 'verified' : 'active',
      isVerified: isOwner,
      isAdmin: isOwner,
    };

    try {
      // Save directly to Supabase profiles table, user metadata, and persistent local storage
      await saveFullUserProfile(finalProfile);
    } catch (err) {
      console.warn('Supabase profile save notice:', err);
    }

    setIsSaving(false);
    onComplete(finalProfile);
  };

  return (
    <div className="w-full h-full min-h-screen bg-black text-white flex flex-col justify-between select-none overflow-y-auto">
      {/* ========================================================================= */}
      {/* STEP 1: Profile Info (Profile Picture & Display Name)                      */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between p-6 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] animate-in fade-in duration-200">
          <div>
            {/* Header with back button */}
            <div className="flex items-center justify-between pb-6">
              <button
                type="button"
                onClick={() => {
                  if (onBackToWelcome) onBackToWelcome();
                }}
                className="p-2 -ml-2 text-white hover:text-red-400 active:scale-95 transition cursor-pointer flex items-center"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-red-950">
                  K
                </div>
                <span className="font-black text-sm tracking-tight text-white">
                  KEMPO <span className="text-red-500">PRO</span>
                </span>
              </div>

              <div className="w-7" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Profile info
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Please provide your name and an optional profile photo.
              </p>
            </div>

            {/* Avatar Upload Container */}
            <div className="flex flex-col items-center mb-8">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-28 h-28 rounded-full bg-neutral-900 border-2 border-dashed border-neutral-700 hover:border-red-500 transition cursor-pointer flex items-center justify-center overflow-hidden shadow-2xl group"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 group-hover:text-red-400 transition">
                    <User className="w-12 h-12 stroke-[1.5]" />
                  </div>
                )}

                {/* Upload Spinner */}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                  </div>
                )}

                {/* Camera Badge in Kempo Red */}
                <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-red-600 border-2 border-black flex items-center justify-center text-white shadow-lg shadow-red-950">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs font-bold text-red-400 hover:text-red-300 transition cursor-pointer"
              >
                {avatarUrl ? 'Change profile photo' : 'Add profile photo'}
              </button>

              {/* Quick Preset Avatars Row */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 font-medium">Or choose:</span>
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className={`w-8 h-8 rounded-full overflow-hidden border-2 transition active:scale-95 cursor-pointer ${
                      avatarUrl === preset
                        ? 'border-red-500 scale-110 shadow-md shadow-red-950'
                        : 'border-neutral-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Display Name Input */}
            <div className="bg-[#16161a] border border-neutral-800 rounded-2xl p-4 shadow-xl">
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Your Display Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Type your name here"
                  maxLength={32}
                  className="flex-1 bg-transparent text-base font-bold text-white placeholder-neutral-500 focus:outline-none"
                />
                {displayName && (
                  <button
                    type="button"
                    onClick={() => setDisplayName('')}
                    className="p-1 rounded-full bg-neutral-800 text-neutral-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Next Button */}
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleNextFromProfile}
              className="w-full h-13 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold text-sm shadow-xl shadow-red-950/60 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
            <p className="text-[11px] text-neutral-500 text-center font-medium">
              Step 1 of 3 • Profile Setup
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Country Selection & Phone / ID Setup (Exact replica of IMG_4726)  */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between p-6 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] animate-in slide-in-from-right duration-200">
          <div>
            {/* Top iOS Header matching IMG_4726 */}
            <div className="flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-2 -ml-2 text-white hover:text-red-400 active:scale-95 transition cursor-pointer flex items-center"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-red-950">
                  K
                </div>
                <span className="font-black text-sm tracking-tight text-white">
                  KEMPO <span className="text-red-500">PRO</span>
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenuOptions(!showMenuOptions)}
                  className="p-2 -mr-2 text-white hover:text-neutral-300 active:scale-95 transition cursor-pointer"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenuOptions && (
                  <div className="absolute right-0 top-10 w-44 rounded-2xl bg-[#1c1c20] border border-neutral-800 shadow-2xl py-1 z-50 animate-in fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenuOptions(false);
                        setShowCountryModal(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition"
                    >
                      Change Country
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenuOptions(false);
                        setInputMode(inputMode === 'keypad' ? 'text' : 'keypad');
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition"
                    >
                      Switch Keyboard Mode
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Title & Subtitle matching IMG_4726 */}
            <div className="text-center pt-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Enter your phone number
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Kempo Pro will link this to your account. Carrier charges may apply.
              </p>
            </div>

            {/* iOS WhatsApp Style Input Card matching IMG_4726 */}
            <div className="bg-[#18181c] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-2xl">
              {/* Row 1: Country Selector */}
              <button
                type="button"
                onClick={() => setShowCountryModal(true)}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{selectedCountry.flag}</span>
                  <span className="text-sm font-semibold text-white">
                    {selectedCountry.name}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>

              <div className="h-[1px] bg-neutral-800/80 mx-4" />

              {/* Row 2: Formatted Prefix & Entry Field */}
              {/* User instruction: "that place that is show plus something, there will be the name of my app. Then after the name of my app, it will now show plus, if it's +234 Nigeria or any country, it will show the plus first, it will first show the number like what is start +23 after that one, you will now write put the number ID join it like the ID." */}
              <div className="px-4 py-3 flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 shrink-0 bg-neutral-900/90 px-2.5 py-1.5 rounded-xl border border-neutral-750">
                  <span className="text-xs font-black text-red-500 tracking-tight">Kempo Pro</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {selectedCountry.dialCode}
                  </span>
                </div>

                <div className="h-6 w-[1px] bg-neutral-700/80" />

                <input
                  type="text"
                  value={phoneEntry}
                  onChange={(e) => setPhoneEntry(e.target.value)}
                  placeholder="your phone number"
                  maxLength={18}
                  className="flex-1 bg-transparent text-sm sm:text-base font-bold text-white placeholder-neutral-500 focus:outline-none font-mono"
                />

                {phoneEntry && (
                  <button
                    type="button"
                    onClick={() => setPhoneEntry('')}
                    className="p-1 rounded-full bg-neutral-800 text-neutral-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Live Shareable ID Preview Card */}
            <div className="mt-4 p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Your Full Kempo Shareable ID
                </span>
                <span className="text-xs sm:text-sm font-black text-white font-mono tracking-wide mt-0.5 block">
                  {formattedKempoId}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
                Official
              </span>
            </div>
          </div>

          {/* Bottom Area: Next Button & iOS Number Keypad matching IMG_4726 */}
          <div className="mt-6 space-y-4">
            <button
              type="button"
              disabled={!phoneEntry.trim() && !isOwner}
              onClick={handleNextFromPhone}
              className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-lg ${
                phoneEntry.trim() || isOwner
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/60'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

            {/* WhatsApp / iOS Style Number Keypad */}
            {inputMode === 'keypad' && (
              <div className="bg-[#151518] rounded-3xl p-3 border border-neutral-850 shadow-2xl">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { num: '1', letters: '' },
                    { num: '2', letters: 'ABC' },
                    { num: '3', letters: 'DEF' },
                    { num: '4', letters: 'GHI' },
                    { num: '5', letters: 'JKL' },
                    { num: '6', letters: 'MNO' },
                    { num: '7', letters: 'PQRS' },
                    { num: '8', letters: 'TUV' },
                    { num: '9', letters: 'WXYZ' },
                  ].map(({ num, letters }) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-12 rounded-2xl bg-[#222227] hover:bg-[#2c2c34] active:bg-red-600/20 active:border-red-500/50 border border-neutral-750 flex flex-col items-center justify-center transition cursor-pointer select-none"
                    >
                      <span className="text-lg font-bold text-white leading-none">{num}</span>
                      {letters && (
                        <span className="text-[9px] font-semibold text-neutral-400 tracking-widest mt-0.5">
                          {letters}
                        </span>
                      )}
                    </button>
                  ))}

                  {/* Alphanumeric mode toggle */}
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className="h-12 rounded-2xl bg-[#1c1c20] hover:bg-neutral-800 text-neutral-300 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                  >
                    ABC / 123
                  </button>

                  {/* 0 Key */}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 rounded-2xl bg-[#222227] hover:bg-[#2c2c34] active:bg-red-600/20 border border-neutral-750 flex flex-col items-center justify-center transition cursor-pointer select-none"
                  >
                    <span className="text-lg font-bold text-white leading-none">0</span>
                    <span className="text-[9px] font-semibold text-neutral-400 tracking-widest mt-0.5">
                      +
                    </span>
                  </button>

                  {/* Backspace Key */}
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-12 rounded-2xl bg-[#1c1c20] hover:bg-neutral-800 text-neutral-300 flex items-center justify-center transition cursor-pointer active:scale-95"
                  >
                    <Delete className="w-5 h-5 text-neutral-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Choose Account Type (Exact replica of IMG_4722)                   */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between p-6 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] animate-in slide-in-from-right duration-200">
          <div>
            {/* Top Bar with Kempo Pro Branding Logo (matching IMG_4722) */}
            <div className="flex items-center justify-between pb-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="p-2 -ml-2 text-white hover:text-red-400 active:scale-95 transition cursor-pointer flex items-center"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-red-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-red-950">
                  K
                </div>
                <span className="font-black text-base tracking-tight text-white">
                  KEMPO <span className="text-red-500">PRO</span>
                </span>
              </div>

              <div className="w-7" />
            </div>

            {/* Headline and Subtitle matching IMG_4722 */}
            <div className="text-center pt-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Choose Account Type
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Select how you plan to use KEMPO PRO. You can change this anytime.
              </p>
            </div>

            {/* The 4 Exact Cards from IMG_4722 */}
            <div className="space-y-3">
              {[
                {
                  id: 'personal' as const,
                  title: 'Personal Account',
                  badge: 'Default',
                  icon: Shield,
                  desc: 'Encrypted private chats, status updates & HD voice calls.',
                },
                {
                  id: 'business' as const,
                  title: 'Business Account',
                  badge: null,
                  icon: Briefcase,
                  desc: 'Commercial profile, verified badge & catalog showcase.',
                },
                {
                  id: 'creator' as const,
                  title: 'Creator & Organization',
                  badge: null,
                  icon: Radio,
                  desc: 'Broadcast channels, community hubs & public subscriber updates.',
                },
                {
                  id: 'developer_gamer' as const,
                  title: 'Developer / Gamer Profile',
                  badge: null,
                  icon: Gamepad2,
                  desc: 'Gaming tags, interactive Kempo mini-apps & bot channels.',
                },
              ].map(({ id, title, badge, icon: Icon, desc }) => {
                const isSelected = selectedAccountType === id;
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedAccountType(id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#181214] border-red-600 shadow-lg shadow-red-950/40 ring-1 ring-red-600/50'
                        : 'bg-[#141418] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md shadow-red-950'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
                          {badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {desc}
                        </p>
                      </div>
                    </div>

                    {/* Radio Checkmark Circle matching IMG_4722 */}
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-neutral-600 bg-neutral-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Area: Red "Continue >" button matching IMG_4722 */}
          <div className="mt-8 space-y-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinishOnboarding}
              className="w-full h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold text-base shadow-xl shadow-red-950/80 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Configuring Account...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>

            <p className="text-[11px] text-neutral-500 text-center font-medium">
              KEMPO PRO • End-to-end encrypted messaging
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COUNTRY SELECTION MODAL (Comprehensive Searchable List of 120+ Countries) */}
      {/* ========================================================================= */}
      {showCountryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#16161a] border border-neutral-800 rounded-t-3xl sm:rounded-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Select Country</h3>
              <button
                type="button"
                onClick={() => setShowCountryModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Country Search Bar */}
            <div className="p-3 border-b border-neutral-800/80">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country or dial code..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#202026] border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Country List */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-850">
              {filteredCountries.map((country) => {
                const isSelected = selectedCountry.code === country.code;
                return (
                  <button
                    key={`${country.code}-${country.dialCode}`}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country);
                      setShowCountryModal(false);
                      setCountrySearch('');
                    }}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-800/50 transition cursor-pointer text-left ${
                      isSelected ? 'bg-red-950/20 text-red-400' : 'text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none">{country.flag}</span>
                      <span className="text-sm font-semibold">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-neutral-400">
                        {country.dialCode}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-red-500 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

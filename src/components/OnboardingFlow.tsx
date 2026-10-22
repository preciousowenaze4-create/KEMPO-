import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  MoreVertical,
  ChevronRight,
  Search,
  Check,
  Camera,
  User,
  Gamepad2,
  Code,
  Briefcase,
  UserCheck,
  Radio,
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

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userId,
  userEmail,
  initialName = '',
  initialAvatar = '',
  onComplete,
  onBackToWelcome,
}) => {
  const isOwner = isOwnerEmail(userEmail);

  // Step 1: Country & Phone/ID Setup (Image 2 style)
  // Step 2: Account Category & Profile Details
  // Step 3: Instant Celebration / ID Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Country Selection State
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Phone / ID entry field (Starts with "Kempo Pro +234 " strictly)
  // Default entry e.g. "A5738" or empty for user entry
  const [phoneEntry, setPhoneEntry] = useState(isOwner ? 'OWNER' : 'A5738');
  const [inputMode, setInputMode] = useState<'keypad' | 'text'>('keypad');

  // Category Selection State
  const [selectedCategory, setSelectedCategory] = useState<
    'gamer' | 'developer' | 'business' | 'personal' | 'creator'
  >(isOwner ? 'creator' : 'gamer');

  // Profile Details
  const [displayName, setDisplayName] = useState(
    initialName || (isOwner ? 'Precious Ddkid' : 'Kempo User')
  );
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status and submission states
  const [isSaving, setIsSaving] = useState(false);
  const [showMenuOptions, setShowMenuOptions] = useState(false);

  // Default app preferences
  const [preferences] = useState<AppPreferences>({
    inAppSounds: true,
    messageTones: true,
    gamingIntegration: true,
    darkTheme: true,
  });

  // Filtered countries for the modal
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Auto-fill Google OAuth data if present
  useEffect(() => {
    if (initialName && (!displayName || displayName === 'Kempo User')) {
      setDisplayName(initialName);
    }
    if (initialAvatar && !avatarUrl) {
      setAvatarUrl(initialAvatar);
    }
  }, [initialName, initialAvatar]);

  // Handle avatar upload
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

  // Virtual Keypad click handler
  const handleKeypadPress = (val: string) => {
    if (phoneEntry.length < 16) {
      setPhoneEntry((prev) => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    setPhoneEntry((prev) => prev.slice(0, -1));
  };

  // Formatted Full Kempo ID preview
  const formattedKempoId = isOwner
    ? OWNER_FIXED_ID
    : formatKempoUserPhoneId(selectedCountry.dialCode, phoneEntry || 'A5738');

  // Step 1 -> Step 2
  const handleNextFromPhone = () => {
    if (!phoneEntry.trim() && !isOwner) {
      // Generate a default code if empty
      setPhoneEntry('A5738');
    }
    setStep(2);
  };

  // Step 2 -> Save to Supabase & Finalize Setup
  const handleFinishOnboarding = async () => {
    setIsSaving(true);

    const finalKempoId = isOwner
      ? OWNER_FIXED_ID
      : formatKempoUserPhoneId(selectedCountry.dialCode, phoneEntry.trim() || 'A5738');

    const mappedAccountType: AccountType =
      selectedCategory === 'developer' || selectedCategory === 'gamer'
        ? 'developer_gamer'
        : selectedCategory;

    const finalProfile: UserProfileData = {
      id: userId,
      email: userEmail,
      displayName: displayName.trim() || (isOwner ? 'Precious Ddkid' : 'Kempo User'),
      avatarUrl,
      accountType: isOwner ? 'creator' : mappedAccountType,
      category: selectedCategory,
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
      console.warn('Supabase save notice:', err);
    }

    // Step 3 celebration
    setStep(3);
    setIsSaving(false);

    // Smooth transition into the chat dashboard
    setTimeout(() => {
      onComplete(finalProfile);
    }, 1100);
  };

  return (
    <div className="w-full h-full min-h-screen bg-black text-white flex flex-col justify-between select-none overflow-y-auto">
      {/* Top iOS/WhatsApp Style Header */}
      <div className="w-full max-w-md mx-auto pt-[max(env(safe-area-inset-top),16px)] px-4 flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => {
            if (step === 2) {
              setStep(1);
            } else if (onBackToWelcome) {
              onBackToWelcome();
            }
          }}
          className="p-2 -ml-2 text-white hover:text-red-400 active:scale-95 transition cursor-pointer flex items-center"
        >
          <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Kempo Pro Branding Logo Header */}
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

      {/* ======================================================== */}
      {/* STEP 1: Country Selection & Phone / ID Setup (Image 2)    */}
      {/* ======================================================== */}
      {step === 1 && (
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between px-5 pb-6 animate-in fade-in duration-200">
          <div>
            {/* Title & Subtitle matching Image 2 */}
            <div className="text-center pt-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Enter your phone number
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Kempo Pro will link this to your account. Carrier charges may apply.
              </p>
            </div>

            {/* iOS WhatsApp Style Rounded Input Card */}
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
              {/* Formats strictly with "Kempo Pro" followed by selected country code, e.g. Kempo Pro +234 A5738 */}
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
                    className="p-1 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Live Shareable ID Preview Card with Signature Red Glow */}
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

          {/* Bottom Area: Next Button & iOS Number Keypad */}
          <div className="mt-6 space-y-4">
            {/* Next Button */}
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

            {/* WhatsApp / iOS Style Number Keypad (Image 2 Replica) */}
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

      {/* ======================================================== */}
      {/* STEP 2: Account Category Selection & Customization        */}
      {/* ======================================================== */}
      {step === 2 && (
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between px-5 pb-6 animate-in fade-in duration-200">
          <div>
            <div className="text-center pt-1 mb-5">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Select Account Category
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xs mx-auto">
                Choose your profile role on Kempo Pro to personalize your experience.
              </p>
            </div>

            {/* Profile Avatar & Name Customization */}
            <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-4 mb-4 flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-full ring-2 ring-red-600/50 hover:ring-red-500 transition cursor-pointer relative shrink-0 flex items-center justify-center bg-[#1c1c22] overflow-hidden"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-neutral-400" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  maxLength={30}
                  className="w-full mt-0.5 bg-transparent border-b border-neutral-700 text-white font-bold text-sm pb-1 focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Category Options List */}
            <div className="space-y-2.5">
              {[
                {
                  id: 'gamer' as const,
                  title: 'Gamer',
                  icon: Gamepad2,
                  desc: 'Gaming tags, squad voice calls, discord-style channels & live gaming status.',
                },
                {
                  id: 'developer' as const,
                  title: 'Developer',
                  icon: Code,
                  desc: 'Code sharing, bot channels, API hooks & tech community discussions.',
                },
                {
                  id: 'business' as const,
                  title: 'Business',
                  icon: Briefcase,
                  desc: 'Commercial profile, client chats, catalog showcase & verified badge.',
                },
                {
                  id: 'personal' as const,
                  title: 'Personal',
                  icon: UserCheck,
                  desc: 'Encrypted private messaging, family groups & status stories.',
                },
                {
                  id: 'creator' as const,
                  title: 'Creator',
                  icon: Radio,
                  desc: 'Broadcast channels, community hubs & public subscriber updates.',
                },
              ].map(({ id, title, icon: Icon, desc }) => {
                const isSelected = selectedCategory === id;
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedCategory(id)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-red-950/30 border-red-600 shadow-md shadow-red-950/40'
                        : 'bg-[#141418] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-red-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {title}
                          {id === 'gamer' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700/60">
                              Popular
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug line-clamp-1">
                          {desc}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                        isSelected ? 'border-red-500 bg-red-600 text-white' : 'border-neutral-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finish & Save to Supabase Button */}
          <div className="mt-6">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinishOnboarding}
              className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold text-sm shadow-xl shadow-red-950/60 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <>
                  <span>Complete Setup & Enter Kempo Pro</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: Instant Celebration & Launch Dashboard Screen     */}
      {/* ======================================================== */}
      {step === 3 && (
        <div className="w-full max-w-sm mx-auto my-auto text-center px-6 py-8 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 mx-auto flex items-center justify-center shadow-2xl shadow-red-900/60 mb-5 animate-bounce">
            <Sparkles className="w-10 h-10 text-white stroke-[2.5]" />
          </div>

          <h2 className="text-2xl font-black text-white">Welcome to Kempo Pro!</h2>
          <p className="text-xs text-neutral-300 mt-1 max-w-xs mx-auto">
            Your profile and account have been configured and securely saved to Supabase.
          </p>

          <div className="my-6 p-4 rounded-2xl bg-[#141418] border border-red-700/60 shadow-xl shadow-red-950/40 inline-flex flex-col items-center gap-1 w-full">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
              Your Shareable User ID
            </span>
            <span className="text-base sm:text-lg font-black text-white font-mono tracking-wide text-red-400">
              {formattedKempoId}
            </span>
            <span className="text-[10px] text-neutral-500 mt-1">
              Category: <strong className="text-neutral-300 capitalize">{selectedCategory}</strong>
            </span>
          </div>

          <p className="text-xs text-red-500 font-bold animate-pulse">
            Entering Kempo Pro Chats...
          </p>
        </div>
      )}

      {/* Country Selection Modal / Bottom Sheet */}
      {showCountryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#16161a] border border-neutral-800 rounded-3xl p-5 shadow-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">Select Your Country</h3>
              <button
                type="button"
                onClick={() => setShowCountryModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-3">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country or code (e.g. Nigeria, +234)"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#202026] border border-neutral-750 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Country List */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/80 pr-1">
              {filteredCountries.map((country) => {
                const isCurrent = selectedCountry.code === country.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country);
                      setShowCountryModal(false);
                    }}
                    className={`w-full py-3 px-2 flex items-center justify-between hover:bg-neutral-800/50 transition cursor-pointer text-left ${
                      isCurrent ? 'bg-red-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{country.flag}</span>
                      <span className="text-xs font-semibold text-white">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400 font-mono">
                        {country.dialCode}
                      </span>
                      {isCurrent && <Check className="w-4 h-4 text-red-500" />}
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

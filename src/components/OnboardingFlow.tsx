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
  Loader2,
  Sparkles,
  Upload,
  Phone,
  X,
} from 'lucide-react';
import { COUNTRIES, Country, DEFAULT_COUNTRY } from '../data/countries';
import { AccountType, AppPreferences, UserProfileData } from '../types';
import { formatKempoUserPhoneId, isOwnerEmail, OWNER_FIXED_ID, generateUniqueIdSuffix, isOwnerIdFormat } from '../lib/accountRules';
import { uploadAvatarToSupabase, saveFullUserProfile } from '../lib/supabase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

  // Exact 3-step sequence as requested by user:
  // Step 1: Country selection & Phone / Number input ("which you now select your number, like which you select your number")
  // Step 2: Put profile picture & display name ("put profile picture, you hit next")
  // Step 3: Choose Account Type ("then you put maybe business, maybe private, maybe game or etc.")
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Country & Phone Number State
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    if (typeof window !== 'undefined') {
      const savedCode = localStorage.getItem('kempo_country_code');
      if (savedCode) {
        const found = COUNTRIES.find((c) => c.dialCode === savedCode);
        if (found) return found;
      }
    }
    return DEFAULT_COUNTRY;
  });
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  
  // User phone number input (editable!)
  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    if (isOwner) return 'OWNER';
    if (typeof window !== 'undefined' && userEmail) {
      const cleanEmail = userEmail.toLowerCase().trim();
      const savedPhone = localStorage.getItem('kempo_user_phone_' + cleanEmail);
      if (savedPhone) return savedPhone;
      const cachedSuffix = localStorage.getItem('kempo_user_id_suffix_' + cleanEmail);
      if (cachedSuffix && cachedSuffix !== 'A5738' && cachedSuffix !== 'OWNER') {
        return cachedSuffix;
      }
      const fresh = generateUniqueIdSuffix(cleanEmail);
      localStorage.setItem('kempo_user_id_suffix_' + cleanEmail, fresh);
      return fresh;
    }
    return generateUniqueIdSuffix();
  });

  // Step 2: Profile Picture & Display Name State
  const [displayName, setDisplayName] = useState(
    initialName || (isOwner ? 'Precious Ddkid' : (userEmail?.split('@')[0] || 'Kempo User'))
  );
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Account Type Selection State (Private/Personal, Business, Creator, Developer/Game)
  const [selectedAccountType, setSelectedAccountType] = useState<
    'personal' | 'business' | 'creator' | 'developer_gamer'
  >(isOwner ? 'creator' : 'personal');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // App preferences
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

  // Filtered countries for country selection sheet
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Clean derived Kempo ID
  const cleanNumber = phoneNumber.trim().replace(/\s+/g, '');
  const finalDerivedKempoId = isOwner
    ? OWNER_FIXED_ID
    : `Kempo Pro ${selectedCountry.dialCode}${cleanNumber || 'USER'}`;

  // Handle avatar upload from device file
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cache local Data URL immediately so avatar displays offline instantly
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kempo_user_avatar', dataUrl);
      }
    };
    reader.readAsDataURL(file);

    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatarToSupabase(file, userId);
      if (publicUrl) {
        setAvatarUrl(publicUrl);
        if (typeof window !== 'undefined') {
          localStorage.setItem('kempo_user_avatar', publicUrl);
        }
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Step 1 -> Step 2
  const handleNextFromPhone = () => {
    if (typeof window !== 'undefined' && userEmail) {
      const cleanEmail = userEmail.toLowerCase().trim();
      localStorage.setItem('kempo_user_phone_' + cleanEmail, phoneNumber.trim());
      localStorage.setItem('kempo_country_code', selectedCountry.dialCode);
    }
    setStep(2);
  };

  // Step 2 -> Step 3
  const handleNextFromProfile = () => {
    if (!displayName.trim()) {
      setDisplayName(userEmail?.split('@')[0] || 'Kempo User');
    }
    setStep(3);
  };

  // Step 3 -> Finish onboarding and save permanently
  const handleFinishOnboarding = async () => {
    setIsSaving(true);

    const cleanNum = phoneNumber.trim().replace(/\s+/g, '');
    const finalKempoId = isOwner
      ? OWNER_FIXED_ID
      : `Kempo Pro ${selectedCountry.dialCode}${cleanNum || 'USER'}`;

    const finalProfile: UserProfileData = {
      id: userId || 'user-' + Date.now(),
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
      phoneNumber: `${selectedCountry.dialCode}${cleanNum}`,
      countryCode: selectedCountry.dialCode,
      countryName: selectedCountry.name,
      rawIdEntry: cleanNum,
      kempoId: finalKempoId,
      preferences,
      isOnboarded: true,
      isProfileCompleted: true,
      is_profile_completed: true,
      status: isOwner ? 'verified' : 'active',
      isVerified: isOwner,
      isAdmin: isOwner,
    };

    // 1. Save permanently to local storage
    if (typeof window !== 'undefined') {
      const cleanEmail = userEmail ? userEmail.toLowerCase().trim() : '';
      if (avatarUrl) {
        localStorage.setItem('kempo_user_avatar', avatarUrl);
      }
      localStorage.setItem('kempo_country_code', selectedCountry.dialCode);
      localStorage.setItem('kempo_user_phone', `${selectedCountry.dialCode}${cleanNum}`);
      if (cleanEmail) {
        localStorage.setItem('kempo_user_phone_' + cleanEmail, cleanNum);
      }
      localStorage.setItem('kempo_user_id', finalKempoId);
      localStorage.setItem('kempo_auth_name', finalProfile.displayName);
      localStorage.setItem('kempo_profile_completed', 'true');
      localStorage.setItem('kempo_onboarded_completed', 'true');
      localStorage.setItem('kempo_user_profile', JSON.stringify(finalProfile));
      if (cleanEmail) {
        localStorage.setItem('kempo_completed_' + cleanEmail, 'true');
      }
      sessionStorage.setItem('kempo_dashboard_active', 'true');
      sessionStorage.removeItem('kempo_google_auth_in_progress');

      try {
        const regRaw = localStorage.getItem('kempo_completed_accounts') || '{}';
        const reg = JSON.parse(regRaw);
        if (cleanEmail) reg[cleanEmail] = finalProfile;
        if (userId) reg[userId] = finalProfile;
        localStorage.setItem('kempo_completed_accounts', JSON.stringify(reg));
      } catch {}
    }

    // 2. Save permanently to Supabase profiles table
    try {
      await saveFullUserProfile(finalProfile);
    } catch (err) {
      console.warn('Supabase profile save notice:', err);
    }

    // 3. Save permanently to Firestore users collection
    try {
      const docId = finalProfile.id || userEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const userRef = doc(db, 'users', docId);
      await setDoc(
        userRef,
        {
          uid: finalProfile.id,
          email: finalProfile.email || '',
          displayName: finalProfile.displayName,
          avatarUrl: finalProfile.avatarUrl,
          phoneNumber: finalProfile.phoneNumber,
          countryCode: finalProfile.countryCode,
          countryName: finalProfile.countryName,
          kempoId: finalProfile.kempoId,
          accountType: finalProfile.accountType,
          category: finalProfile.category,
          isOnboarded: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (fbErr) {
      console.warn('Firestore profile save notice:', fbErr);
    }

    setIsSaving(false);
    onComplete(finalProfile);
  };

  return (
    <div className="w-full h-full min-h-screen bg-black text-white flex flex-col justify-between select-none overflow-y-auto">
      
      {/* ========================================================================= */}
      {/* STEP 1: Phone / Number Selection ("which you now select your number")     */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between p-6 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] animate-in fade-in duration-200">
          <div>
            {/* Top Bar with Kempo Pro Branding Logo */}
            <div className="flex items-center justify-between pb-3">
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

              <button
                type="button"
                onClick={() => setShowCountryModal(true)}
                className="p-2 -mr-2 text-white hover:text-red-400 active:scale-95 transition cursor-pointer"
                title="Select Country"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Headline and Subtitle */}
            <div className="text-center pt-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Enter your number
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Kempo Pro will link this number to your account. Select your country and enter your phone number.
              </p>
            </div>

            {/* Card: Country Picker & Phone Number Input */}
            <div className="bg-[#18181c] border-2 border-red-900/50 rounded-2xl overflow-hidden shadow-2xl">
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
                <ChevronRight className="w-4 h-4 text-red-400" />
              </button>

              <div className="h-[1px] bg-neutral-800/80 mx-4" />

              {/* Row 2: Editable Phone Number Input */}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0 bg-red-600 text-white px-3 py-1.5 rounded-xl shadow-md font-mono font-bold text-sm">
                  <span>{selectedCountry.dialCode}</span>
                </div>

                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  autoFocus
                  className="flex-1 bg-transparent text-base sm:text-lg font-bold text-white placeholder-neutral-500 font-mono tracking-wider focus:outline-none"
                />

                {phoneNumber && (
                  <button
                    type="button"
                    onClick={() => setPhoneNumber('')}
                    className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Full Kempo Shareable ID Preview Card */}
            <div className="mt-4 p-4 rounded-2xl bg-[#16161c] border border-red-900/40 flex items-center justify-between shadow-xl">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Your Full Kempo Shareable ID
                </span>
                <span className="text-sm sm:text-base font-black text-white font-mono tracking-wide mt-1 block truncate text-red-400">
                  {finalDerivedKempoId}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 shrink-0">
                {isOwner ? 'Owner / Admin' : 'Permanent'}
              </span>
            </div>
          </div>

          {/* Bottom Area: Next Button */}
          <div className="mt-8 space-y-3">
            <button
              type="button"
              disabled={!phoneNumber.trim()}
              onClick={handleNextFromPhone}
              className="w-full h-13 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-base shadow-xl shadow-red-950/70 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            <p className="text-[11px] text-neutral-500 text-center font-medium">
              Step 1 of 3 • Phone &amp; ID Setup
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Profile Picture & Display Name ("put profile picture, you hit next") */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between p-6 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] animate-in slide-in-from-right duration-200">
          <div>
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-6">
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

              <div className="w-7" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Profile info
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Put your real picture and display name so your contacts can identify you.
              </p>
            </div>

            {/* Picture Upload Straight Box Container */}
            <div className="flex flex-col items-center mb-6">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-[#141419] border-2 border-dashed border-red-500/80 hover:border-red-400 transition cursor-pointer flex flex-col items-center justify-center p-3 overflow-hidden shadow-2xl group shadow-red-950/40"
              >
                {avatarUrl ? (
                  <div className="w-full h-full relative rounded-2xl overflow-hidden group">
                    <img
                      src={avatarUrl}
                      alt="Profile Avatar"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition flex items-end justify-center p-3">
                      <div className="px-3.5 py-1.5 rounded-xl bg-red-600/90 text-white font-bold text-xs flex items-center gap-2 shadow-lg">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change Photo</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-600/15 border border-red-500/40 text-red-500 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition duration-300">
                      <Upload className="w-8 h-8 stroke-[2.2]" />
                    </div>
                    <span className="text-base font-extrabold text-white tracking-tight">
                      Put Your Real Picture
                    </span>
                    <p className="text-xs text-neutral-400 mt-1 max-w-[210px] leading-relaxed">
                      Tap anywhere to upload your photo straight from your device
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-3.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950 active:scale-95 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Picture</span>
                    </button>
                  </div>
                )}

                {/* Upload Spinner */}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                    <span className="text-xs font-bold text-white">Uploading picture...</span>
                  </div>
                )}

                {/* Badge on Top Right */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-red-600/20 border border-red-500/40 text-[10px] font-black text-red-400 uppercase tracking-wider">
                  Kempo Pro
                </div>
              </div>

              {/* Quick Preset Avatars Row */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[11px] text-neutral-400 font-semibold">Or pick avatar:</span>
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(preset);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('kempo_user_avatar', preset);
                      }
                    }}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition active:scale-95 cursor-pointer ${
                      avatarUrl === preset
                        ? 'border-red-500 scale-110 shadow-lg shadow-red-950'
                        : 'border-neutral-700 opacity-70 hover:opacity-100 hover:border-neutral-500'
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
              Step 2 of 3 • Profile Picture &amp; Name
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Choose Account Type ("maybe business, maybe private, maybe game")  */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between p-6 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] animate-in slide-in-from-right duration-200">
          <div>
            {/* Top Bar */}
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

            {/* Headline and Subtitle */}
            <div className="text-center pt-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Choose Account Type
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Select your account category: private, business, game, or creator.
              </p>
            </div>

            {/* The 4 Cards: Private, Business, Creator, Game */}
            <div className="space-y-3">
              {[
                {
                  id: 'personal' as const,
                  title: 'Private Account',
                  badge: 'Popular',
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
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
                              {badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {desc}
                        </p>
                      </div>
                    </div>

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

          {/* Bottom Area: Finish & Enter Kempo Pro Button */}
          <div className="mt-8 space-y-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinishOnboarding}
              className="w-full h-13 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-black text-base shadow-xl shadow-red-950/70 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving permanently...</span>
                </>
              ) : (
                <>
                  <span>Finish Setup &amp; Start Chatting</span>
                  <Check className="w-5 h-5 stroke-[3]" />
                </>
              )}
            </button>

            <p className="text-[11px] text-neutral-500 text-center font-medium">
              Step 3 of 3 • Account Category
            </p>
          </div>
        </div>
      )}

      {/* Country Selection Modal Sheet (Used in Step 1) */}
      {showCountryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
          <div className="w-full h-[85vh] bg-[#141418] rounded-t-[28px] border-t border-red-900/40 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
            <div className="h-14 px-5 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white">Select Country</h3>
              <button
                type="button"
                onClick={() => setShowCountryModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-red-600 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1c1c22] border border-neutral-700/80 text-white">
                <Search className="w-4 h-4 text-red-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search country name or code..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none placeholder-neutral-500 text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-850">
              {filteredCountries.map((c) => (
                <div
                  key={c.code}
                  onClick={() => {
                    setSelectedCountry(c);
                    setShowCountryModal(false);
                    setCountrySearch('');
                  }}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-red-950/30 active:bg-red-950/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl leading-none">{c.flag}</span>
                    <span className="text-sm font-semibold text-white">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-red-400 font-mono">
                    {c.dialCode}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Search,
  X,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Sparkles,
  Lock,
} from 'lucide-react';
import { UserProfileData } from '../types';
import { findUserByKempoId } from '../lib/supabase';
import { isOwnerIdFormat, formatNameFromEmail } from '../lib/accountRules';

interface CountryItem {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: CountryItem[] = [
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
];

interface NewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveContact: (contact: {
    firstName: string;
    lastName: string;
    username: string;
    countryDialCode: string;
    rawInputId: string;
    syncToPhone: boolean;
    verifiedProfile?: UserProfileData | null;
  }) => Promise<void>;
}

export const NewContactModal: React.FC<NewContactModalProps> = ({
  isOpen,
  onClose,
  onSaveContact,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(COUNTRIES[0]);
  const [phoneOrId, setPhoneOrId] = useState('');
  const [syncToPhone, setSyncToPhone] = useState(true);

  // Country Picker sheet modal
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Live lookup state
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    searched: boolean;
    found: boolean;
    profile: UserProfileData | null;
    message?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Reset fields when opened
  useEffect(() => {
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setUsername('');
      setPhoneOrId('');
      setLookupResult(null);
      setIsSearching(false);
      setIsSubmitting(false);
      setShowCountryPicker(false);
    }
  }, [isOpen]);

  // Real-time live verification as user types ID
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const cleanInput = phoneOrId.trim();
    if (!cleanInput || cleanInput.length < 2) {
      setLookupResult(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const dialPrefix = selectedCountry.dialCode;
        let queryCandidate = cleanInput;

        // If user didn't start with + or kempo or owner
        if (
          !cleanInput.startsWith('+') &&
          !cleanInput.toLowerCase().startsWith('kempo') &&
          !isOwnerIdFormat(cleanInput)
        ) {
          queryCandidate = `${dialPrefix}${cleanInput}`;
        }

        // 1. Search with dial code prefix
        let prof = await findUserByKempoId(queryCandidate);

        // 2. If not found, search raw input directly
        if (!prof && queryCandidate !== cleanInput) {
          prof = await findUserByKempoId(cleanInput);
        }

        // 3. If not found, search with space
        if (!prof && !cleanInput.startsWith('+')) {
          prof = await findUserByKempoId(`${dialPrefix} ${cleanInput}`);
        }

        if (prof) {
          setLookupResult({
            searched: true,
            found: true,
            profile: prof,
            message: `Verified Kempo Pro User: ${prof.displayName || formatNameFromEmail(prof.email)}`,
          });

          // Autofill custom name suggestion if user has not entered anything yet
          if (!firstName.trim() && !lastName.trim()) {
            const rawName = prof.displayName || formatNameFromEmail(prof.email);
            const parts = rawName.split(' ');
            if (parts.length > 1) {
              setFirstName(parts[0]);
              setLastName(parts.slice(1).join(' '));
            } else {
              setFirstName(rawName);
            }
          }
        } else {
          // Strictly not existing!
          setLookupResult({
            searched: true,
            found: false,
            profile: null,
            message: 'ID not existing',
          });
        }
      } catch (err) {
        setLookupResult({
          searched: true,
          found: false,
          profile: null,
          message: 'ID not existing',
        });
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [phoneOrId, selectedCountry]);

  if (!isOpen) return null;

  // STRICT REQUIREMENT: Only allow saving if ID is verified and real profile was found!
  const isProfileVerified = Boolean(lookupResult?.found && lookupResult.profile);

  const handleDone = async () => {
    if (!isProfileVerified || !lookupResult?.profile || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSaveContact({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        countryDialCode: selectedCountry.dialCode,
        rawInputId: phoneOrId.trim(),
        syncToPhone,
        verifiedProfile: lookupResult.profile,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch)
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Red-themed iOS Sheet Container */}
      <div className="w-full h-[94vh] max-h-[890px] bg-[#0c0c0e] rounded-t-[24px] flex flex-col overflow-hidden shadow-2xl border-t border-red-900/40 animate-in slide-in-from-bottom duration-250">
        
        {/* Top Navigation Bar with RED Styling */}
        <div className="h-14 px-4 bg-[#141417] border-b border-red-950/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-red-500 font-semibold text-[17px] hover:text-red-400 active:opacity-60 transition cursor-pointer"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              New contact
            </h2>
          </div>

          {/* CRITICAL: "Done" button is HIDDEN until real profile ID is verified! */}
          {isProfileVerified ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDone}
              className="text-red-500 font-bold text-[17px] hover:text-red-400 active:opacity-60 bg-red-600/15 hover:bg-red-600/25 px-3 py-1 rounded-full border border-red-600/40 flex items-center gap-1.5 transition cursor-pointer animate-in zoom-in-90"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              ) : (
                'Done'
              )}
            </button>
          ) : (
            /* Spacer to keep title centered when Done is hidden */
            <div className="w-14" />
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          
          {/* Card 1: First name & Last name */}
          <div className="bg-[#161619] rounded-2xl border border-neutral-800/80 focus-within:border-red-600/60 focus-within:ring-1 focus-within:ring-red-600/30 overflow-hidden divide-y divide-neutral-800 transition">
            <div className="px-4 py-3">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-transparent text-[16px] text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
            <div className="px-4 py-3">
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-transparent text-[16px] text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Card 2: Username */}
          <div className="bg-[#161619] rounded-2xl border border-neutral-800/80 focus-within:border-red-600/60 focus-within:ring-1 focus-within:ring-red-600/30 overflow-hidden px-4 py-3 flex items-center transition">
            <span className="text-[16px] font-semibold text-neutral-300 w-28 shrink-0">
              Username
            </span>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 bg-transparent text-[16px] text-white placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          {/* Card 3: RED-THEMED KEMPO PRO ID & PHONE SECTION */}
          <div className="relative rounded-2xl bg-gradient-to-b from-[#240e12] via-[#1a0c0f] to-[#120a0c] border-2 border-red-600/70 shadow-xl shadow-red-950/60 overflow-hidden">
            
            {/* Top red header badge */}
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-red-500" />
                <span>Kempo Pro ID Verification</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-600/30">
                Network Tracked
              </span>
            </div>

            <div className="divide-y divide-red-900/40">
              {/* Row 1: Country Picker */}
              <div
                onClick={() => setShowCountryPicker(true)}
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-red-950/40 transition"
              >
                <span className="text-[16px] font-bold text-red-300 w-28 shrink-0">
                  Phone
                </span>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-[15.5px] text-white font-semibold flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-red-900/50">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-red-400" />
                </div>
              </div>

              {/* Row 2: Mobile / ID Input with vibrant RED accents */}
              <div className="px-4 py-3.5 flex items-center">
                <span className="text-[16px] font-bold text-red-400 w-28 shrink-0">
                  Mobile
                </span>
                <div className="flex-1 flex items-center gap-2.5">
                  <span className="text-[15px] font-extrabold text-white bg-red-600 px-2.5 py-1 rounded-lg shrink-0 shadow-sm shadow-red-900/60">
                    {selectedCountry.dialCode}
                  </span>
                  <input
                    type="text"
                    placeholder="Enter Kempo Pro ID suffix"
                    value={phoneOrId}
                    onChange={(e) => setPhoneOrId(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent text-[16.5px] text-white placeholder:text-red-400/40 font-mono font-semibold focus:outline-none caret-red-500"
                  />
                  {phoneOrId && (
                    <button
                      type="button"
                      onClick={() => setPhoneOrId('')}
                      className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-red-600 text-neutral-400 hover:text-white flex items-center justify-center text-xs transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isSearching && (
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin shrink-0" />
                  )}
                </div>
              </div>
            </div>

            {/* Live Search Status & Real Profile Display inside the Red Section */}
            <div className="p-3 bg-black/40 border-t border-red-900/40">
              {isSearching ? (
                <div className="flex items-center gap-2 py-1 text-[13px] text-red-300">
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  <span>Searching Kempo Pro live directory...</span>
                </div>
              ) : lookupResult?.searched && !lookupResult.found ? (
                /* Strict: ID NOT EXISTING DISPLAY - NO ADD BUTTON SHOWN */
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-600/80 text-red-200 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-red-600/25 border border-red-500 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-red-400">
                        ID not existing
                      </h4>
                      <p className="text-[12px] text-red-300/90 leading-tight">
                        This Kempo Pro ID is not registered on the network. You cannot add an unverified account.
                      </p>
                    </div>
                  </div>
                </div>
              ) : lookupResult?.found && lookupResult.profile ? (
                /* Real Person's Live Profile Card with Real Profile Picture & Setting Full Picture (Cover) */
                <div className="rounded-2xl overflow-hidden bg-[#18181c] border-2 border-red-500/80 shadow-2xl animate-in zoom-in-95 duration-200">
                  {/* Contact Setting Full Picture / Wallpaper Banner */}
                  <div className="relative w-full h-32 bg-black/60 overflow-hidden">
                    {lookupResult.profile.coverUrl ? (
                      lookupResult.profile.coverType === 'video' || lookupResult.profile.coverUrl.includes('.mp4') ? (
                        <video
                          src={lookupResult.profile.coverUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={lookupResult.profile.coverUrl}
                          alt="Setting Wallpaper"
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-neutral-800 via-neutral-900 to-neutral-800 flex items-center justify-center text-xs text-neutral-400 font-medium">
                        Kempo Pro Setting Wallpaper
                      </div>
                    )}
                    {/* Ambient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    {/* Real Profile Picture & Header Info Overlaid on Setting Full Picture */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-end gap-3">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-900 ring-2 ring-white/90 shadow-2xl shrink-0">
                        {lookupResult.profile.avatarUrl ? (
                          <img
                            src={lookupResult.profile.avatarUrl}
                            alt={lookupResult.profile.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xl text-white bg-gradient-to-br from-neutral-700 to-neutral-900">
                            {lookupResult.profile.displayName?.charAt(0).toUpperCase() || 'K'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[16px] font-bold text-white truncate drop-shadow-md">
                            {lookupResult.profile.displayName}
                          </h4>
                          <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] shrink-0">
                            ✓
                          </span>
                        </div>
                        <p className="text-[12px] font-mono font-semibold text-red-300 truncate drop-shadow">
                          {lookupResult.profile.kempoId}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Details & Prominent Add to Contacts Button */}
                  <div className="p-3.5 space-y-3 bg-[#161619]">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>Account Category:</span>
                      <span className="font-semibold text-white capitalize bg-neutral-800/80 px-2 py-0.5 rounded-md border border-neutral-700/60">
                        {lookupResult.profile.category || lookupResult.profile.accountType || 'Personal'}
                      </span>
                    </div>

                    {/* PROMINENT ADD TO CONTACT BUTTON: ONLY APPEARS WHEN ID IS REAL & FOUND */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleDone}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.99] text-white font-bold text-[14.5px] shadow-lg shadow-red-950/70 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Add to Contacts &amp; Chat</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-red-300/70 py-1">
                  Type the person&apos;s Kempo Pro ID suffix (e.g. <code>81889P</code> or <code>OWNER</code>). The person&apos;s real profile will show before you can add them.
                </div>
              )}
            </div>

          </div>

          {/* Card 4: Sync contact to phone with RED TOGGLE */}
          <div className="bg-[#161619] rounded-2xl border border-neutral-800/80 px-4 py-3 flex items-center justify-between">
            <span className="text-[16px] font-medium text-white">
              Sync contact to phone
            </span>
            <button
              type="button"
              onClick={() => setSyncToPhone(!syncToPhone)}
              aria-label="Toggle sync contact to phone"
              className={`w-[51px] h-[31px] rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer relative ${
                syncToPhone ? 'bg-red-600 shadow-md shadow-red-900/50' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-in-out ${
                  syncToPhone ? 'translate-x-[20px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Name privacy explanation with red lock icon */}
          <div className="p-3 rounded-xl bg-red-950/20 border border-red-950/40 text-[12px] text-red-300/80 leading-relaxed flex items-start gap-2">
            <Lock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-red-400">Private Contact Name:</strong> Only you will see the name you save for this contact.
              The person&apos;s own registered profile name will continue showing on their device.
            </p>
          </div>

        </div>

      </div>

      {/* Country Selection Modal Sheet */}
      {showCountryPicker && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
          <div className="w-full h-[80vh] bg-[#141417] rounded-t-[22px] flex flex-col overflow-hidden shadow-2xl border-t border-red-900/40 animate-in slide-in-from-bottom">
            <div className="h-14 px-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white">Select Country</h3>
              <button
                onClick={() => setShowCountryPicker(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-red-600 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1c1c1f] text-white">
                <Search className="w-4 h-4 text-red-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search country or code..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500 text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-850">
              {filteredCountries.map((c) => (
                <div
                  key={c.code}
                  onClick={() => {
                    setSelectedCountry(c);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                  className="px-4 py-3 flex items-center justify-between hover:bg-red-950/30 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-[15px] font-medium text-white">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-[14px] font-bold text-red-400">
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

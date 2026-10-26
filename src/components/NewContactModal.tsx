import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Check, Loader2, AlertCircle, Search, X } from 'lucide-react';
import { UserProfileData } from '../types';
import { findUserByKempoId } from '../lib/supabase';
import { isOwnerIdFormat, isOwnerEmail, formatNameFromEmail } from '../lib/accountRules';

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

  // Real-time live verification as the user types
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
        // Construct lookup identifiers
        // 1. Dial code + input (e.g. +23481889P or +234 81889P)
        const dialPrefix = selectedCountry.dialCode;
        let queryCandidate = cleanInput;

        // If user already entered + or Kempo Pro or OWNER
        if (!cleanInput.startsWith('+') && !cleanInput.toLowerCase().startsWith('kempo') && !isOwnerIdFormat(cleanInput)) {
          queryCandidate = `${dialPrefix}${cleanInput}`;
        }

        // Search primary candidate
        let prof = await findUserByKempoId(queryCandidate);

        // If not found, search raw suffix (e.g. "81889P" or "OWNER")
        if (!prof && queryCandidate !== cleanInput) {
          prof = await findUserByKempoId(cleanInput);
        }

        // If still not found, search with space
        if (!prof && !cleanInput.startsWith('+')) {
          prof = await findUserByKempoId(`${dialPrefix} ${cleanInput}`);
        }

        if (prof) {
          setLookupResult({
            found: true,
            profile: prof,
            message: `Verified Kempo Pro User: ${prof.displayName || formatNameFromEmail(prof.email)}`,
          });

          // Autofill name if user hasn't typed anything yet
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
          setLookupResult({
            found: false,
            profile: null,
            message: 'Contact ID not registered yet. You can still save to invite & message.',
          });
        }
      } catch (err) {
        setLookupResult({
          found: false,
          profile: null,
          message: 'Unable to verify at the moment. You can still proceed.',
        });
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [phoneOrId, selectedCountry]);

  if (!isOpen) return null;

  const handleDone = async () => {
    if (!phoneOrId.trim() && !firstName.trim() && !lastName.trim()) return;
    setIsSubmitting(true);
    try {
      await onSaveContact({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        countryDialCode: selectedCountry.dialCode,
        rawInputId: phoneOrId.trim(),
        syncToPhone,
        verifiedProfile: lookupResult?.profile || null,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dialCode.includes(countrySearch)
  );

  const canSave = Boolean(phoneOrId.trim() || firstName.trim());

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* iOS Sheet Container matching IMG_4871_4f727047.png */}
      <div className="w-full h-[94vh] max-h-[850px] bg-[#f2f2f7] dark:bg-[#121214] rounded-t-[22px] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-250">
        
        {/* iOS Top Navigation Bar */}
        <div className="h-12 px-4 bg-[#f2f2f7] dark:bg-[#121214] border-b border-[#e5e5ea] dark:border-neutral-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-[#007aff] dark:text-[#38bdf8] text-[17px] font-normal hover:opacity-80 active:opacity-60 cursor-pointer"
          >
            Cancel
          </button>
          <h2 className="text-[17px] font-bold text-black dark:text-white tracking-tight">
            New contact
          </h2>
          <button
            type="button"
            disabled={!canSave || isSubmitting}
            onClick={handleDone}
            className="text-[#007aff] dark:text-[#38bdf8] text-[17px] font-semibold hover:opacity-80 active:opacity-60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#007aff]" />
            ) : (
              'Done'
            )}
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          
          {/* Card 1: First name & Last name */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e5e5ea] dark:border-neutral-800 overflow-hidden divide-y divide-[#e5e5ea] dark:divide-neutral-800">
            <div className="px-4 py-3">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-transparent text-[16px] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
            <div className="px-4 py-3">
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-transparent text-[16px] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Card 2: Username */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e5e5ea] dark:border-neutral-800 overflow-hidden px-4 py-3 flex items-center">
            <span className="text-[16px] font-semibold text-black dark:text-white w-28 shrink-0">
              Username
            </span>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 bg-transparent text-[16px] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none"
            />
          </div>

          {/* Card 3: Country & Kempo Pro ID / Phone */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e5e5ea] dark:border-neutral-800 overflow-hidden divide-y divide-[#e5e5ea] dark:divide-neutral-800">
            {/* Country Selector Row */}
            <div
              onClick={() => setShowCountryPicker(true)}
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
            >
              <span className="text-[16px] font-semibold text-black dark:text-white w-28 shrink-0">
                Phone
              </span>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[16px] text-black dark:text-white font-medium flex items-center gap-1.5">
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.name}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </div>
            </div>

            {/* Mobile / Kempo Pro ID Input Row */}
            <div className="px-4 py-3 flex items-center">
              <span className="text-[16px] font-semibold text-black dark:text-white w-28 shrink-0">
                Mobile
              </span>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[16px] font-semibold text-black dark:text-white shrink-0">
                  {selectedCountry.dialCode}
                </span>
                <input
                  type="text"
                  placeholder="Kempo Pro ID or Phone"
                  value={phoneOrId}
                  onChange={(e) => setPhoneOrId(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent text-[16px] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none font-medium"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-[#007aff] animate-spin shrink-0" />
                )}
                {lookupResult?.found && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-in zoom-in-75">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Search Status Banner */}
          {phoneOrId.trim().length >= 2 && (
            <div className="px-2 py-1">
              {isSearching ? (
                <div className="flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007aff]" />
                  <span>Searching Kempo Pro network in real time...</span>
                </div>
              ) : lookupResult?.found ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-[13px]">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-600/20 flex items-center justify-center shrink-0">
                    {lookupResult.profile?.avatarUrl ? (
                      <img
                        src={lookupResult.profile.avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[13.5px] truncate text-emerald-900 dark:text-emerald-300">
                      {lookupResult.profile?.displayName || 'Kempo Pro User'}
                    </p>
                    <p className="text-[11.5px] text-emerald-700 dark:text-emerald-400/80 truncate">
                      {lookupResult.profile?.kempoId || `${selectedCountry.dialCode} ${phoneOrId}`} • Ready to connect
                    </p>
                  </div>
                </div>
              ) : lookupResult ? (
                <div className="flex items-center gap-2 text-[12.5px] text-neutral-600 dark:text-neutral-400 bg-white/60 dark:bg-neutral-800/50 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{lookupResult.message}</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Card 4: Sync contact to phone toggle */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e5e5ea] dark:border-neutral-800 overflow-hidden px-4 py-3 flex items-center justify-between">
            <span className="text-[16px] font-normal text-black dark:text-white">
              Sync contact to phone
            </span>
            <button
              type="button"
              onClick={() => setSyncToPhone(!syncToPhone)}
              aria-label="Toggle sync contact to phone"
              className={`w-[51px] h-[31px] rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer relative ${
                syncToPhone ? 'bg-[#34c759]' : 'bg-[#e5e5ea] dark:bg-neutral-700'
              }`}
            >
              <div
                className={`w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-in-out ${
                  syncToPhone ? 'translate-x-[20px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Name privacy explanation note matching user request */}
          <div className="px-2 pt-2 text-[12px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            <p>
              🔒 <strong>Private Contact Name:</strong> Only you will see the name you save for this contact.
              Their own chosen profile name will remain untouched on their device.
            </p>
          </div>

        </div>

      </div>

      {/* Country Selection Modal Sheet */}
      {showCountryPicker && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
          <div className="w-full h-[80vh] bg-white dark:bg-[#1c1c1e] rounded-t-[20px] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
            <div className="h-14 px-4 border-b border-[#e5e5ea] dark:border-neutral-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-black dark:text-white">Select Country</h3>
              <button
                onClick={() => setShowCountryPicker(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-[#e5e5ea] dark:border-neutral-800">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search country or code..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#e5e5ea] dark:divide-neutral-800">
              {filteredCountries.map((c) => (
                <div
                  key={c.code}
                  onClick={() => {
                    setSelectedCountry(c);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                  className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-[15px] font-medium text-black dark:text-white">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-[14px] font-semibold text-neutral-500 dark:text-neutral-400">
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

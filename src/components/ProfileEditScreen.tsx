import React, { useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Upload,
  Check,
  Loader2,
  Sparkles,
  X,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { UserProfileData } from '../types';
import { uploadAvatarToSupabase, saveFullUserProfile } from '../lib/supabase';
import { isOwnerEmail, OWNER_FIXED_ID } from '../lib/accountRules';

interface ProfileEditScreenProps {
  userProfile: UserProfileData | null;
  currentUserEmail?: string;
  currentUserName?: string;
  onBack: () => void;
  onSaveSuccess: (updated: UserProfileData) => void;
}

// Preset avatars for instant switching
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&auto=format&fit=crop&q=80',
];

export const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({
  userProfile,
  currentUserEmail = '',
  currentUserName = '',
  onBack,
  onSaveSuccess,
}) => {
  const rawEmail = userProfile?.email || currentUserEmail || '';
  const isOwner = isOwnerEmail(rawEmail);

  // Country prefix & shareable ID calculation
  const countryPrefix =
    userProfile?.countryCode ||
    (typeof window !== 'undefined' ? localStorage.getItem('kempo_country_code') || '+234' : '+234');
  const cleanCode = countryPrefix.startsWith('+') ? countryPrefix : `+${countryPrefix}`;
  const rawSuffix =
    userProfile?.rawIdEntry ||
    (userProfile?.phoneNumber ? userProfile.phoneNumber.replace(cleanCode, '') : '') ||
    'A5738';

  const shareableKempoId =
    userProfile?.kempoId && userProfile.kempoId.includes('+')
      ? userProfile.kempoId
      : `Kempo Pro ${cleanCode}${rawSuffix}`;

  // Form states
  const [displayName, setDisplayName] = useState<string>(
    userProfile?.displayName || currentUserName || (isOwner ? 'Precious Ddkid' : 'Kempo User')
  );
  const [statusThought, setStatusThought] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kempo_status_thought') || "Right now I'm using Kempo Pro";
    }
    return "Right now I'm using Kempo Pro";
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        userProfile?.avatarUrl ||
        localStorage.getItem('kempo_user_avatar') ||
        ''
      );
    }
    return userProfile?.avatarUrl || '';
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [username, setUsername] = useState<string>(() => {
    return isOwner ? 'preciousddkid' : rawSuffix.toLowerCase();
  });
  const [links, setLinks] = useState<string>('');

  // UI modal states
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'about' | 'username' | 'links' | null>(null);
  const [fieldTempInput, setFieldTempInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload from device
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setShowPhotoOptions(false);

    // Read immediately as Base64 for instant preview and offline caching
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kempo_user_avatar', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open modal to edit specific text field
  const openFieldEditor = (field: 'name' | 'about' | 'username' | 'links') => {
    setEditingField(field);
    if (field === 'name') setFieldTempInput(displayName);
    else if (field === 'about') setFieldTempInput(statusThought);
    else if (field === 'username') setFieldTempInput(username);
    else if (field === 'links') setFieldTempInput(links);
  };

  const handleSaveFieldInput = () => {
    if (editingField === 'name') {
      setDisplayName(fieldTempInput.trim() || displayName);
    } else if (editingField === 'about') {
      setStatusThought(fieldTempInput.trim() || statusThought);
    } else if (editingField === 'username') {
      setUsername(fieldTempInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
    } else if (editingField === 'links') {
      setLinks(fieldTempInput.trim());
    }
    setEditingField(null);
  };

  // Save complete profile changes to Supabase and LocalStorage
  const handleSaveProfile = async () => {
    setIsSaving(true);
    let finalAvatarUrl = avatarUrl;

    // 1. Upload avatar to Supabase Storage if a new file was chosen
    if (avatarFile) {
      try {
        const uploadedUrl = await uploadAvatarToSupabase(avatarFile, userProfile?.id || 'user');
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
          setAvatarUrl(uploadedUrl);
        }
      } catch (err) {
        console.warn('Supabase avatar upload notice:', err);
      }
    }

    // 2. Build full updated profile object
    const finalProfile: UserProfileData = {
      id: userProfile?.id || 'user',
      email: rawEmail,
      accountType: userProfile?.accountType || (isOwner ? 'creator' : 'personal'),
      displayName: displayName.trim() || (isOwner ? 'Precious Ddkid' : 'Kempo User'),
      avatarUrl: finalAvatarUrl,
      kempoId: shareableKempoId,
      countryCode: cleanCode,
      phoneNumber: userProfile?.phoneNumber || `${cleanCode}${rawSuffix}`,
      rawIdEntry: rawSuffix,
      preferences: userProfile?.preferences || {
        inAppSounds: true,
        messageTones: true,
        gamingIntegration: true,
        darkTheme: true,
      },
      isOnboarded: true,
      isProfileCompleted: true,
      is_profile_completed: true,
      status: isOwner ? 'verified' : 'active',
      isVerified: isOwner,
      isAdmin: isOwner,
    };

    // 3. Cache locally for instant 0ms offline availability
    if (typeof window !== 'undefined') {
      if (finalAvatarUrl) {
        localStorage.setItem('kempo_user_avatar', finalAvatarUrl);
      }
      localStorage.setItem('kempo_user_profile', JSON.stringify(finalProfile));
      localStorage.setItem('kempo_auth_name', finalProfile.displayName);
      localStorage.setItem('kempo_status_thought', statusThought);
      localStorage.setItem('kempo_profile_completed', 'true');
      localStorage.setItem('kempo_onboarded_completed', 'true');
      localStorage.setItem('kempo_country_code', cleanCode);
      localStorage.setItem('kempo_user_id', shareableKempoId);

      // Register in permanent accounts registry
      try {
        const regRaw = localStorage.getItem('kempo_completed_accounts') || '{}';
        const reg = JSON.parse(regRaw);
        if (rawEmail) reg[rawEmail.toLowerCase()] = true;
        if (finalProfile.id) reg[finalProfile.id] = true;
        localStorage.setItem('kempo_completed_accounts', JSON.stringify(reg));
      } catch {}
    }

    // 4. Save to Supabase database & auth metadata
    try {
      await saveFullUserProfile(finalProfile);
    } catch (err) {
      console.warn('Supabase full profile save notice:', err);
    }

    setIsSaving(false);
    setSaveSuccessNotice(true);

    // Notify parent state immediately so bottom tab bar avatar updates in real-time
    onSaveSuccess(finalProfile);

    setTimeout(() => {
      setSaveSuccessNotice(false);
      onBack();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e] text-white flex flex-col justify-between overflow-y-auto select-none animate-in slide-in-from-right duration-200">
      {/* Hidden device file uploader */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Main Container */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col px-4 pt-[max(env(safe-area-inset-top),16px)] pb-6">
        {/* Navigation Bar */}
        <div className="h-12 flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 text-white hover:text-red-400 active:scale-95 transition cursor-pointer flex items-center"
            aria-label="Back to Settings"
          >
            <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
          </button>

          <h1 className="text-lg font-black tracking-tight text-white">Profile</h1>

          <div className="w-7" />
        </div>

        {/* Profile Picture Section (Matching Image 2) */}
        <div className="flex flex-col items-center mt-3 mb-6">
          <div
            onClick={() => setShowPhotoOptions(true)}
            className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-[#18181c] ring-3 ring-red-600/80 shadow-2xl shadow-red-950/40 cursor-pointer group flex items-center justify-center transition active:scale-98"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            ) : (
              <span className="text-4xl font-black text-neutral-300">
                {displayName.charAt(0).toUpperCase() || 'U'}
              </span>
            )}

            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Camera className="w-8 h-8 text-white drop-shadow-md" />
            </div>
          </div>

          {/* "Edit photo" Option in Kempo Pro Red */}
          <button
            type="button"
            onClick={() => setShowPhotoOptions(true)}
            className="mt-3.5 text-sm font-extrabold text-red-500 hover:text-red-400 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Edit photo</span>
          </button>
        </div>

        {/* iOS / WhatsApp Style Profile Items Card (Matching Image 2) */}
        <div className="bg-[#18181c] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-2xl divide-y divide-neutral-800/80 mb-6">
          {/* Row 1: Name */}
          <div
            onClick={() => openFieldEditor('name')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <span className="text-sm font-bold text-white">Name</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-neutral-300 truncate max-w-[180px]">
                {displayName}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
            </div>
          </div>

          {/* Row 2: About (Status) */}
          <div
            onClick={() => openFieldEditor('about')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <span className="text-sm font-bold text-white">About</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-red-500 truncate max-w-[180px]">
                {statusThought}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
            </div>
          </div>

          {/* Row 3: Username */}
          <div
            onClick={() => openFieldEditor('username')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <span className="text-sm font-bold text-white">Username</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-red-500 truncate max-w-[180px]">
                {username ? `@${username}` : 'Reserve username'}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
            </div>
          </div>

          {/* Row 4: Phone number / Permanent Shareable ID Format (e.g. Kempo Pro +234A5738) */}
          <div className="px-4 py-3.5 flex items-center justify-between select-text">
            <span className="text-sm font-bold text-white">Phone number</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-black text-neutral-200 font-mono tracking-wide truncate max-w-[210px]">
                {shareableKempoId}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
            </div>
          </div>

          {/* Row 5: Links */}
          <div
            onClick={() => openFieldEditor('links')}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-neutral-800/40 active:bg-neutral-800/70 transition cursor-pointer"
          >
            <span className="text-sm font-bold text-white">Links</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-red-500 truncate max-w-[180px]">
                {links || 'Add links'}
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
            </div>
          </div>
        </div>

        {/* Live ID Summary Tag */}
        <div className="px-4 py-3 rounded-xl bg-red-950/20 border border-red-900/30 flex items-center justify-between text-xs mb-4">
          <span className="text-neutral-400 font-medium">Permanent Kempo ID:</span>
          <span className="text-red-400 font-mono font-bold">{shareableKempoId}</span>
        </div>
      </div>

      {/* Prominent Red "Save" Button at Bottom */}
      <div className="w-full max-w-lg mx-auto p-4 pb-[max(env(safe-area-inset-bottom),16px)] bg-[#0c0c0e]/95 backdrop-blur-md border-t border-neutral-900">
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-98 text-white font-black text-base shadow-xl shadow-red-950/70 flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : saveSuccessNotice ? (
            <>
              <Check className="w-5 h-5 text-white stroke-[3]" />
              <span>Profile Saved!</span>
            </>
          ) : (
            <span>Save Profile</span>
          )}
        </button>
      </div>

      {/* Photo Options Modal */}
      {showPhotoOptions && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setShowPhotoOptions(false)}
        >
          <div
            className="w-full max-w-md bg-[#16161a] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
              <h3 className="text-base font-black text-white">Update Profile Photo</h3>
              <button
                onClick={() => setShowPhotoOptions(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Choose from device */}
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 mb-3 cursor-pointer active:scale-98 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload from Device / Camera</span>
            </button>

            {/* Instant Preset Avatars */}
            <div className="pt-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-3">
                Or pick an instant avatar:
              </span>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(preset);
                      setAvatarFile(null);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('kempo_user_avatar', preset);
                      }
                      setShowPhotoOptions(false);
                    }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition active:scale-95 cursor-pointer ${
                      avatarUrl === preset
                        ? 'border-red-500 scale-105 shadow-md shadow-red-950'
                        : 'border-neutral-700 hover:border-neutral-500 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field Editor Dialog Modal */}
      {editingField && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEditingField(null)}
        >
          <div
            className="w-full max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-white mb-1 capitalize">
              Edit {editingField}
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              {editingField === 'name' && 'Enter your full display name.'}
              {editingField === 'about' && 'Write a short thought or status.'}
              {editingField === 'username' && 'Choose a unique username handle.'}
              {editingField === 'links' && 'Add your social or website link.'}
            </p>

            <input
              type="text"
              autoFocus
              value={fieldTempInput}
              onChange={(e) => setFieldTempInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFieldInput();
              }}
              className="w-full px-4 py-3 bg-[#111114] border border-neutral-700 focus:border-red-500 rounded-xl text-white font-semibold text-sm outline-none transition mb-4"
              placeholder={`Enter ${editingField}...`}
            />

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFieldInput}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-950 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

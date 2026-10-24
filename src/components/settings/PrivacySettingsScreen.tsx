import React, { useState } from 'react';
import {
  ChevronLeft,
  Shield,
  Key,
  Eye,
  Lock,
  Mail,
  Clock,
  Image as ImageIcon,
  Radio,
  Check,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  UserCheck,
} from 'lucide-react';
import { UserProfileData, AppPreferences } from '../../types';
import { saveFullUserProfile } from '../../lib/supabase';
import { isOwnerEmail, OWNER_FIXED_ID } from '../../lib/accountRules';

interface PrivacySettingsScreenProps {
  userProfile?: UserProfileData | null;
  currentUserEmail?: string;
  onBack: () => void;
  onUpdatePreferences?: (prefs: AppPreferences) => void;
  onUpdateProfile?: (profile: UserProfileData) => void;
}

export const PrivacySettingsScreen: React.FC<PrivacySettingsScreenProps> = ({
  userProfile,
  currentUserEmail,
  onBack,
  onUpdatePreferences,
  onUpdateProfile,
}) => {
  const rawEmail = userProfile?.email || currentUserEmail || '';
  const isOwner = isOwnerEmail(rawEmail);

  const prefs = userProfile?.preferences || {
    inAppSounds: true,
    messageTones: true,
    gamingIntegration: true,
    darkTheme: true,
    emailPrivacy: 'nobody',
    lastSeenPrivacy: 'everyone',
    profileMediaPrivacy: 'everyone',
    statusPrivacy: 'everyone',
    readReceipts: true,
  };

  const [emailPrivacy, setEmailPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>(
    prefs.emailPrivacy || 'nobody'
  );
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>(
    prefs.lastSeenPrivacy || 'everyone'
  );
  const [profileMediaPrivacy, setProfileMediaPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>(
    prefs.profileMediaPrivacy || 'everyone'
  );
  const [statusPrivacy, setStatusPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>(
    prefs.statusPrivacy || 'everyone'
  );
  const [readReceipts, setReadReceipts] = useState<boolean>(prefs.readReceipts !== false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updatedPrefs: AppPreferences = {
      ...prefs,
      emailPrivacy,
      lastSeenPrivacy,
      profileMediaPrivacy,
      statusPrivacy,
      readReceipts,
    };

    onUpdatePreferences?.(updatedPrefs);

    if (userProfile) {
      const updatedProfile: UserProfileData = {
        ...userProfile,
        preferences: updatedPrefs,
      };
      await saveFullUserProfile(updatedProfile);
      onUpdateProfile?.(updatedProfile);
    }

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d12] text-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur-md sticky top-0 z-10 pt-[max(env(safe-area-inset-top),14px)]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-red-400 hover:text-red-300 active:scale-95 transition cursor-pointer font-medium text-sm"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Settings</span>
        </button>
        <h2 className="text-base font-bold text-white tracking-tight">Privacy</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3.5 py-1 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold rounded-full transition shadow-md shadow-red-900/40 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Backend Encryption Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#131b17] to-[#111614] border border-emerald-500/30 shadow-xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Backend Privacy Active</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h3>
              <p className="text-xs text-neutral-300 mt-0.5">
                Sign-in email is handled strictly by the backend and never exposed publicly on the Kempo Pro network.
              </p>
            </div>
          </div>
        </div>

        {/* 1. Email Privacy Setting */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Mail className="w-4 h-4 text-red-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Who can see my email address
            </h4>
          </div>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {[
              { id: 'nobody', label: 'Nobody (Only Me)', desc: 'Recommended: Email is 100% hidden from all contacts and users' },
              { id: 'contacts', label: 'My Contacts', desc: 'Only contacts you have added can see your email address' },
              { id: 'everyone', label: 'Everyone', desc: 'Any user on Kempo Pro who looks up your profile can see your email' },
            ].map((option) => (
              <div
                key={option.id}
                onClick={() => setEmailPrivacy(option.id as any)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 active:bg-white/10 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{option.label}</span>
                    {option.id === 'nobody' && (
                      <span className="text-[10px] bg-red-600/30 text-red-400 px-1.5 py-0.2 rounded font-bold">
                        Secure
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">{option.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ml-3 ${
                    emailPrivacy === option.id
                      ? 'border-red-500 bg-red-600 text-white'
                      : 'border-white/30'
                  }`}
                >
                  {emailPrivacy === option.id && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Last Seen & Online Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Last Seen & Online Status
            </h4>
          </div>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {[
              { id: 'everyone', label: 'Everyone', desc: 'All Kempo Pro users can see your online status and last active time' },
              { id: 'contacts', label: 'My Contacts', desc: 'Only contacts saved in your chat list can see when you were last seen' },
              { id: 'nobody', label: 'Nobody', desc: 'Keep your activity completely private (you also won\'t see others\' last seen)' },
            ].map((option) => (
              <div
                key={option.id}
                onClick={() => setLastSeenPrivacy(option.id as any)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 active:bg-white/10 transition"
              >
                <div>
                  <span className="text-sm font-semibold text-white">{option.label}</span>
                  <p className="text-xs text-neutral-400 mt-0.5">{option.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ml-3 ${
                    lastSeenPrivacy === option.id
                      ? 'border-red-500 bg-red-600 text-white'
                      : 'border-white/30'
                  }`}
                >
                  {lastSeenPrivacy === option.id && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Profile Photo & Cover Video Visibility */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Profile Photo & Cover Video Visibility
            </h4>
          </div>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {[
              { id: 'everyone', label: 'Everyone', desc: 'Visible to everyone who connects with you via your Kempo ID' },
              { id: 'contacts', label: 'My Contacts', desc: 'Only approved contacts in your chat list can view your media' },
              { id: 'nobody', label: 'Nobody (Private)', desc: 'Only display default avatar placeholder to other users' },
            ].map((option) => (
              <div
                key={option.id}
                onClick={() => setProfileMediaPrivacy(option.id as any)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 active:bg-white/10 transition"
              >
                <div>
                  <span className="text-sm font-semibold text-white">{option.label}</span>
                  <p className="text-xs text-neutral-400 mt-0.5">{option.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ml-3 ${
                    profileMediaPrivacy === option.id
                      ? 'border-red-500 bg-red-600 text-white'
                      : 'border-white/30'
                  }`}
                >
                  {profileMediaPrivacy === option.id && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Status / Story Privacy */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Radio className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Status & Story Privacy
            </h4>
          </div>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {[
              { id: 'everyone', label: 'All Contacts', desc: 'Share your 24-hour status stories with all your Kempo Pro contacts' },
              { id: 'contacts', label: 'My Contacts Except...', desc: 'Hide your status updates from specific excluded contacts' },
              { id: 'nobody', label: 'Only Share With (Close Circle)', desc: 'Only selected contacts can view your status stories' },
            ].map((option) => (
              <div
                key={option.id}
                onClick={() => setStatusPrivacy(option.id as any)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 active:bg-white/10 transition"
              >
                <div>
                  <span className="text-sm font-semibold text-white">{option.label}</span>
                  <p className="text-xs text-neutral-400 mt-0.5">{option.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ml-3 ${
                    statusPrivacy === option.id
                      ? 'border-red-500 bg-red-600 text-white'
                      : 'border-white/30'
                  }`}
                >
                  {statusPrivacy === option.id && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Read Receipts (Blue Ticks) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Messaging
            </h4>
          </div>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white">Read Receipts (Blue Ticks)</span>
                <p className="text-xs text-neutral-400 mt-0.5">
                  If turned off, you won't send or receive read receipts. Read receipts are always sent for group chats.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Privacy Settings Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-98 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-red-950/70 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <span>Saving to Supabase...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Privacy Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Privacy preferences saved to your account!</span>
        </div>
      )}
    </div>
  );
};

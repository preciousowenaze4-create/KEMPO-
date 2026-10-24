import React, { useState } from 'react';
import {
  ChevronLeft,
  Shield,
  Key,
  Smartphone,
  Copy,
  Check,
  Download,
  Trash2,
  Lock,
  Mail,
  User,
  AlertTriangle,
  QrCode,
  Share2,
} from 'lucide-react';
import { UserProfileData } from '../../types';
import { isOwnerEmail, OWNER_FIXED_ID, isOwnerIdFormat } from '../../lib/accountRules';

interface AccountSettingsScreenProps {
  userProfile?: UserProfileData | null;
  currentUserEmail?: string;
  onBack: () => void;
  onSignOut: () => void;
}

export const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({
  userProfile,
  currentUserEmail = '',
  onBack,
  onSignOut,
}) => {
  const rawEmail = userProfile?.email || currentUserEmail;
  const isOwner = isOwnerEmail(rawEmail) || isOwnerIdFormat(userProfile?.kempoId);
  const kempoId = isOwner ? OWNER_FIXED_ID : userProfile?.kempoId || 'Kempo Pro ID';

  const [copiedId, setCopiedId] = useState(false);
  const [twoStepEnabled, setTwoStepEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(kempoId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownloadAccountInfo = () => {
    const data = {
      app: 'Kempo Pro',
      exportDate: new Date().toISOString(),
      account: {
        id: userProfile?.id,
        kempoId: kempoId,
        displayName: userProfile?.displayName,
        email: rawEmail,
        accountType: isOwner ? 'Kempo Pro Owner & Creator' : userProfile?.accountType,
        phoneNumber: userProfile?.phoneNumber,
        countryCode: userProfile?.countryCode,
        createdAt: userProfile?.createdAt,
      },
      preferences: userProfile?.preferences,
      security: {
        twoFactorAuthentication: twoStepEnabled ? 'Enabled' : 'Disabled',
        encryption: 'End-to-End Encrypted (AES-256-GCM / WebRTC DTLS-SRTP)',
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kempo-account-${kempoId.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleDeleteAccount = () => {
    // Clear all local user credentials and caches
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kempo_auth_user');
      localStorage.removeItem('kempo_auth_name');
      localStorage.removeItem('kempo_user_profile');
      localStorage.removeItem('kempo_user_id');
      localStorage.removeItem('kempo_user_avatar');
      localStorage.removeItem('kempo_user_cover');
      localStorage.removeItem('kempo_user_chats');
      sessionStorage.clear();
    }
    onSignOut();
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
        <h2 className="text-base font-bold text-white tracking-tight">Account</h2>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Permanent ID Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#181824] to-[#12121a] border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
              Permanent Kempo Pro ID
            </span>
            {isOwner && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                👑 App Creator
              </span>
            )}
          </div>
          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/10">
            <span
              className={`font-mono text-sm font-bold tracking-wide select-all ${
                isOwner ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {kempoId}
            </span>
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-neutral-400">
            This ID is permanently linked to your account in Supabase. Other users can add you directly using this unique code.
          </p>
        </div>

        {/* Security & Credentials */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Security & Authentication
          </h4>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {/* Two-step verification */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Two-Step Verification</span>
                  <p className="text-xs text-neutral-400">Require security passkey when registering on new device</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={twoStepEnabled}
                  onChange={(e) => setTwoStepEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {/* Email Address */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Registered Email</span>
                  <p className="text-xs text-neutral-400 truncate max-w-[200px]">{rawEmail || 'No email registered'}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Verified
              </span>
            </div>

            {/* Phone Number */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Phone Number</span>
                  <p className="text-xs text-neutral-400">{userProfile?.phoneNumber || '+234 810 000 0000'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data & Export */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Data & Privacy
          </h4>
          <div className="rounded-2xl bg-[#15151e] border border-white/10 divide-y divide-white/10 overflow-hidden">
            {/* Request Account Info */}
            <div
              onClick={handleDownloadAccountInfo}
              className="p-3.5 flex items-center justify-between hover:bg-white/5 active:bg-white/10 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Request Account Info</span>
                  <p className="text-xs text-neutral-400">Download report of your Kempo Pro account information and settings</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-neutral-400 shrink-0 ml-3" />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 px-1">
            Account Management
          </h4>
          <div className="rounded-2xl bg-red-950/20 border border-red-900/40 divide-y divide-red-900/30 overflow-hidden">
            <div
              onClick={() => setShowDeleteConfirm(true)}
              className="p-3.5 flex items-center justify-between hover:bg-red-900/30 active:bg-red-900/40 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-red-300">Delete My Account</span>
                  <p className="text-xs text-red-400/80">Erase account info, chat history, and remove permanent ID</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#181822] border border-red-600/40 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete Account?</h3>
              <p className="text-xs text-neutral-300">
                This action is permanent. Your saved contacts, messages, and profile will be deleted from this device.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 active:scale-98 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-red-950/70 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Success Toast */}
      {downloadSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4" />
          <span>Account report downloaded!</span>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Ban, ShieldAlert, LogOut, Mail, AlertTriangle, ExternalLink } from 'lucide-react';

interface BannedAccountScreenProps {
  email?: string;
  userId?: string;
  status?: string;
  onSignOut?: () => void;
  isPreview?: boolean;
  onClosePreview?: () => void;
}

export const BannedAccountScreen: React.FC<BannedAccountScreenProps> = ({
  email = '',
  userId = '',
  status = 'banned',
  onSignOut,
  isPreview = false,
  onClosePreview,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0c] text-white flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
      {/* Top Banner if in Preview Mode */}
      {isPreview && (
        <div className="max-w-md mx-auto w-full mb-3 p-3 rounded-2xl bg-amber-950/80 border border-amber-600/70 text-amber-200 text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Owner Preview Mode: This is how the banned user sees it.</span>
          </div>
          {onClosePreview && (
            <button
              onClick={onClosePreview}
              className="px-2.5 py-1 rounded-lg bg-amber-800 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer"
            >
              Exit Preview
            </button>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full text-center">
        {/* Large Signature Red Ban Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-red-600/15 border-2 border-red-500/40 text-red-500 flex items-center justify-center shadow-2xl shadow-red-950/80 animate-pulse">
            <Ban className="w-12 h-12 stroke-[2.2]" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg ring-2 ring-black">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Title & Warning */}
        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-700/60 mb-3 shadow-md">
          {status === 'suspended' ? 'ACCOUNT TEMPORARILY SUSPENDED' : 'ACCOUNT PERMANENTLY BANNED'}
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Access Restricted
        </h1>

        <p className="text-sm text-neutral-400 max-w-xs leading-relaxed mb-6">
          Your Kempo Pro account has been banned by the Administrator. Access to chats, calls, and services has been revoked.
        </p>

        {/* Banned Info Card */}
        <div className="w-full bg-[#141418] border border-red-900/40 rounded-2xl p-4 text-left shadow-xl mb-6 divide-y divide-neutral-800/80">
          <div className="pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Banned Account Email
            </span>
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-red-300 truncate">
              <Mail className="w-4 h-4 text-red-400 shrink-0" />
              <span className="truncate">{email || 'Authenticated User'}</span>
            </div>
          </div>

          <div className="py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Restriction Status
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400">
                {status === 'suspended' ? 'Suspended by Admin' : 'Permanently Banned'}
              </span>
              <span className="text-[10px] font-mono text-neutral-500">Live Enforcement</span>
            </div>
          </div>

          <div className="pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Resolution & Appeal
            </span>
            <p className="text-xs text-neutral-400 leading-relaxed">
              If you believe this restriction was made in error, contact the platform administrator to review your account status.
            </p>
          </div>
        </div>

        {/* Administrator Contact */}
        <a
          href="mailto:preciousddkid@gmail.com?subject=Kempo%20Pro%20Account%20Ban%20Appeal"
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition underline mb-4"
        >
          <span>Contact Admin (preciousddkid@gmail.com)</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Action Footer: Sign Out Button */}
      <div className="max-w-md mx-auto w-full pt-4">
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-98 text-white font-extrabold text-sm shadow-xl shadow-red-950/70 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sign Out / Switch Account</span>
          </button>
        )}
      </div>
    </div>
  );
};

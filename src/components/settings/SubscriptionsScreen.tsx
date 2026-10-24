import React, { useState } from 'react';
import {
  ChevronLeft,
  Sparkles,
  Crown,
  Check,
  Shield,
  Zap,
  Video,
  Lock,
  Headphones,
  Award,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { UserProfileData } from '../../types';
import { isOwnerEmail, OWNER_FIXED_ID } from '../../lib/accountRules';

interface SubscriptionsScreenProps {
  userProfile?: UserProfileData | null;
  currentUserEmail?: string;
  onBack: () => void;
}

export const SubscriptionsScreen: React.FC<SubscriptionsScreenProps> = ({
  userProfile,
  currentUserEmail = '',
  onBack,
}) => {
  const rawEmail = userProfile?.email || currentUserEmail;
  const isOwner = isOwnerEmail(rawEmail);
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');
  const [upgradedToast, setUpgradedToast] = useState(false);

  const perks = [
    { icon: Video, title: '4K Ultra-HD Media & Video Calls', desc: 'Zero lag encrypted peer-to-peer WebRTC streaming with stereo audio' },
    { icon: Lock, title: 'Military-Grade End-to-End Encryption', desc: 'AES-256-GCM quantum-safe cipher locks every message and media asset' },
    { icon: Crown, title: 'Permanent Dedicated Kempo Pro ID', desc: 'Fixed personal identity tied forever to your verified email address' },
    { icon: Zap, title: 'Live Cover Video & Animated Banners', desc: 'Display full-height looping video backdrops on your personal profile' },
    { icon: Shield, title: 'Zero-Trace Backend Security', desc: 'Complete email cloaking so your contact information is never leaked' },
    { icon: Award, title: 'VIP Verified Profile Badge', desc: 'Official crimson and gold shield badges visible to all chat partners' },
  ];

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
        <h2 className="text-base font-bold text-white tracking-tight">Subscriptions</h2>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* Tier Card */}
        <div className="relative overflow-hidden rounded-3xl p-5 border shadow-2xl bg-gradient-to-br from-[#1a1216] via-[#120d13] to-[#0c090c] border-red-600/30">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/30 border border-red-500/50 text-red-300 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-red-400" />
                <span>{isOwner ? '👑 Creator VIP Lifetime' : 'Kempo Pro Active Member'}</span>
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active</span>
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {isOwner ? 'Kempo Pro Creator Elite' : 'Kempo Pro Unlimited'}
              </h3>
              <p className="text-xs text-neutral-300 mt-1">
                {isOwner
                  ? 'Founder & Lead Creator plan. Unrestricted system access, owner console, and real-time network authority.'
                  : 'Full access to high-speed encrypted messaging, voice calls, custom ID assignment, and video covers.'}
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-neutral-300">
              <span>Billing Cycle</span>
              <span className="font-bold text-white">
                {isOwner ? 'Lifetime VIP (No Expiry)' : 'Permanent Free Tier with Pro Access'}
              </span>
            </div>
          </div>
        </div>

        {/* Included Features */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            Unlocked Features & Capabilities
          </h4>
          <div className="grid grid-cols-1 gap-2.5">
            {perks.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#15151e] border border-white/10 flex items-start gap-3.5 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">{p.title}</h5>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setUpgradedToast(true);
              setTimeout(() => setUpgradedToast(false), 2500);
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-98 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-red-950/70 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>Manage VIP Tier Perks</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {upgradedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 to-amber-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <Sparkles className="w-4 h-4" />
          <span>All Kempo Pro privileges are permanently activated!</span>
        </div>
      )}
    </div>
  );
};

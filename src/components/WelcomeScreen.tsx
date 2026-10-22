import React, { useState } from 'react';
import {
  Shield,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from 'lucide-react';
import { FlowerIntroScreen } from './FlowerIntroScreen';
import {
  supabaseSignInWithGoogle,
  supabaseSignIn,
  supabaseSignUp,
} from '../lib/supabase';

interface WelcomeScreenProps {
  onAuthenticated: (userEmail: string, userName?: string, photoURL?: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAuthenticated }) => {
  // Step 1: Flower Intro Design Screen -> Step 2: Login Screen (IMG_4725)
  const [view, setView] = useState<'flower' | 'login'>('flower');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Email form states
  const [emailMode, setEmailMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Native Google Sign-In via Supabase triggered by "Agree and continue"
  const handleAgreeAndContinue = async () => {
    setErrorMsg('');
    setGoogleLoading(true);

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('kempo_google_auth_in_progress', 'true');
      }
      await supabaseSignInWithGoogle();
      // Browser redirects to Google OAuth and returns to app
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(err.message || 'Google sign-in could not be initiated.');
      setGoogleLoading(false);
      // If popup or redirect fails, open email modal as alternative
      setShowEmailModal(true);
    }
  };

  // Email Auth Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (emailMode === 'signup' && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setEmailLoading(true);

    try {
      if (emailMode === 'signup') {
        const user = await supabaseSignUp(email.trim(), password);
        setSuccessMsg('Account created successfully! Welcome to Kempo Pro.');
        setTimeout(() => {
          onAuthenticated(
            user?.email || email.trim(),
            user?.user_metadata?.display_name || email.split('@')[0]
          );
        }, 400);
      } else {
        const user = await supabaseSignIn(email.trim(), password);
        setSuccessMsg('Signed in successfully! Entering Kempo Pro...');
        setTimeout(() => {
          onAuthenticated(
            user?.email || email.trim(),
            user?.user_metadata?.display_name || email.split('@')[0]
          );
        }, 400);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      let msg = err.message || 'Authentication failed.';
      if (msg.toLowerCase().includes('already registered')) {
        msg = 'This email is already registered. Please switch to Sign In.';
        setEmailMode('signin');
      }
      setErrorMsg(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  if (view === 'flower') {
    return <FlowerIntroScreen onContinue={() => setView('login')} />;
  }

  return (
    <div className="w-full h-full min-h-screen bg-black text-white flex flex-col justify-between items-center p-6 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),24px)] select-none overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Top Header: Back to Flower Screen + Language Pill */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setView('flower')}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition py-1 -ml-1 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-red-500" />
          <span>Intro</span>
        </button>

        <button
          type="button"
          onClick={() => {}}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-neutral-300 text-xs font-medium hover:border-neutral-700 transition"
        >
          <span>English</span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        <div className="w-10" />
      </div>

      {/* Main Center Content */}
      <div className="w-full max-w-sm my-auto flex flex-col items-center text-center py-4">
        {/* Bespoke Kempo Pro Decorative Illustration with Floral Accents & Signature Red */}
        <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
          {/* Subtle Ambient Red Glow */}
          <div className="absolute inset-4 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

          {/* Custom SVG Illustration */}
          <svg
            className="w-full h-full drop-shadow-2xl"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background circular halo */}
            <circle cx="120" cy="120" r="94" fill="#18181b" stroke="#27272a" strokeWidth="2" />
            <circle cx="120" cy="120" r="92" fill="url(#bgGlow)" fillOpacity="0.12" />

            {/* Floral Accent 1 - Top Left Flower */}
            <g transform="translate(42, 42)">
              {/* 5 rounded petals */}
              <circle cx="12" cy="5" r="4.5" fill="#fecdd3" />
              <circle cx="19" cy="10" r="4.5" fill="#fecdd3" />
              <circle cx="17" cy="18" r="4.5" fill="#fecdd3" />
              <circle cx="7" cy="18" r="4.5" fill="#fecdd3" />
              <circle cx="5" cy="10" r="4.5" fill="#fecdd3" />
              {/* Flower Center in Kempo Red */}
              <circle cx="12" cy="12" r="4" fill="#dc2626" />
            </g>

            {/* Floral Accent 2 - Bottom Right Flower */}
            <g transform="translate(180, 168)">
              <circle cx="10" cy="4" r="4" fill="#fecdd3" />
              <circle cx="16" cy="8" r="4" fill="#fecdd3" />
              <circle cx="14" cy="15" r="4" fill="#fecdd3" />
              <circle cx="6" cy="15" r="4" fill="#fecdd3" />
              <circle cx="4" cy="8" r="4" fill="#fecdd3" />
              <circle cx="10" cy="10" r="3.5" fill="#ef4444" />
            </g>

            {/* Floral Accent 3 - Delicate Mini Flower Top Right */}
            <g transform="translate(182, 54)">
              <circle cx="6" cy="2" r="3" fill="#ffe4e6" />
              <circle cx="10" cy="5" r="3" fill="#ffe4e6" />
              <circle cx="9" cy="10" r="3" fill="#ffe4e6" />
              <circle cx="3" cy="10" r="3" fill="#ffe4e6" />
              <circle cx="2" cy="5" r="3" fill="#ffe4e6" />
              <circle cx="6" cy="6" r="2.5" fill="#b91c1c" />
            </g>

            {/* Little decorative stars & sparkles */}
            <path
              d="M38 118L40 124L46 126L40 128L38 134L36 128L30 126L36 124L38 118Z"
              fill="#ef4444"
              opacity="0.9"
            />
            <path
              d="M200 110L201.5 114L206 115.5L201.5 117L200 121L198.5 117L194 115.5L198.5 114L200 110Z"
              fill="#ffffff"
              opacity="0.85"
            />
            <path
              d="M62 176L63 179L66 180L63 181L62 184L61 181L58 180L61 179L62 176Z"
              fill="#ffffff"
              opacity="0.7"
            />

            {/* Globe Wireframe Symbol (Upper Left of Main Speech Bubble) */}
            <circle cx="86" cy="84" r="24" stroke="#ffffff" strokeWidth="2.2" strokeOpacity="0.85" />
            <ellipse cx="86" cy="84" rx="10" ry="24" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.85" />
            <line x1="62" y1="84" x2="110" y2="84" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.85" />

            {/* Main Central Chat Bubble (Kempo Pro Red & Crisp White) */}
            <path
              d="M80 82C80 70.9543 88.9543 62 100 62H150C161.046 62 170 70.9543 170 82V128C170 139.046 161.046 148 150 148H106L84 164V146.5C81.5 142 80 135 80 128V82Z"
              fill="url(#redCardGradient)"
              stroke="#ffffff"
              strokeWidth="2.5"
            />

            {/* Inner Grid / Showcase on Bubble (Like WhatsApp shopfront / gaming hub) */}
            <rect x="94" y="78" width="56" height="46" rx="8" fill="#ffffff" fillOpacity="0.12" stroke="#ffffff" strokeWidth="1.8" />
            <line x1="94" y1="94" x2="150" y2="94" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.8" />
            <line x1="94" y1="108" x2="150" y2="108" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.8" />
            <line x1="122" y1="78" x2="122" y2="124" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.8" />

            {/* Upward Growth Arrow (Like in WhatsApp illustration, in vibrant red-white) */}
            <path
              d="M136 68L164 40M164 40H148M164 40V56"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Heart Badge (Community & Connection) */}
            <path
              d="M172 136C172 126 182 120 190 128C198 120 208 126 208 136C208 149 190 162 190 162C190 162 172 149 172 136Z"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2.2"
            />

            {/* Paper Airplane (Instant messaging sending) */}
            <path
              d="M62 152L96 138L78 174L72 158L62 152Z"
              fill="#ffffff"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Signature Bold 'K' inside heart/shield */}
            <circle cx="122" cy="101" r="13" fill="#ffffff" />
            <text
              x="122"
              y="106"
              fill="#dc2626"
              fontSize="14"
              fontWeight="900"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              K
            </text>

            {/* Definitions */}
            <defs>
              <linearGradient id="bgGlow" x1="0" y1="0" x2="240" y2="240" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ef4444" />
                <stop offset="1" stopColor="#b91c1c" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="redCardGradient" x1="80" y1="62" x2="170" y2="164" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ef4444" />
                <stop offset="1" stopColor="#991b1b" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Bold Headline */}
        <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
          Welcome to <span className="text-white">Kempo </span>
          <span className="text-red-500">Pro</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm font-medium text-neutral-300 mt-3 max-w-xs leading-snug">
          A simple, secure and reliable way for you to connect with your community and contacts.
        </p>

        {/* Explanatory Context */}
        <p className="text-xs text-neutral-400 mt-3 max-w-xs leading-relaxed">
          To help sync your chats and profile seamlessly across devices, Kempo Pro securely encrypts and protects your data.
        </p>
      </div>

      {/* Bottom Action Section */}
      <div className="w-full max-w-sm flex flex-col items-center space-y-4 pb-2">
        {/* App Terms & Privacy Disclaimer */}
        <p className="text-xs text-neutral-400 text-center leading-relaxed px-2">
          Please read our{' '}
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="text-red-400 hover:text-red-300 underline font-semibold cursor-pointer"
          >
            Kempo Pro Privacy Policy
          </button>
          . By continuing, you agree to the{' '}
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="text-red-400 hover:text-red-300 underline font-semibold cursor-pointer"
          >
            Kempo Pro Terms of Service
          </button>
          .
        </p>

        {/* Primary Action Button: "Agree and continue" in Signature Red Theme */}
        <button
          type="button"
          onClick={handleAgreeAndContinue}
          disabled={googleLoading}
          className="w-full h-13 rounded-full bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold text-base shadow-xl shadow-red-950/60 flex items-center justify-center gap-3 transition cursor-pointer disabled:opacity-70"
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Opening Google Sign-In...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Agree and continue</span>
            </>
          )}
        </button>

        {/* Alternative Email Login / Sign Up */}
        <button
          type="button"
          onClick={() => setShowEmailModal(true)}
          className="text-xs text-neutral-400 hover:text-white transition font-medium flex items-center gap-1.5 cursor-pointer py-1"
        >
          <Mail className="w-3.5 h-3.5 text-neutral-400" />
          <span>Or continue with email</span>
        </button>
      </div>

      {/* Email Modal Dialog (Smooth slide-up sheet) */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center font-black text-xs text-white">
                  K
                </div>
                <h3 className="text-base font-bold text-white">
                  {emailMode === 'signup' ? 'Create Kempo Pro Account' : 'Sign In to Kempo Pro'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Toggle Mode */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0f0f12] border border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setEmailMode('signup');
                  setErrorMsg('');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  emailMode === 'signup'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode('signin');
                  setErrorMsg('');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  emailMode === 'signin'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#202026] border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#202026] border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-red-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {emailMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#202026] border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-700/80 flex items-start gap-2 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-tight">{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 flex items-start gap-2 text-emerald-300 text-xs">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span className="leading-tight">{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer mt-2"
              >
                {emailLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{emailMode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Privacy Policy
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed max-h-60 overflow-y-auto pr-1">
              Kempo Pro is built with end-to-end security and high-fidelity messaging. Your email address remains strictly stored in the secure backend authentication vault and is never broadcast publicly. Your conversations, photos, voice notes, and identifiers are protected by modern cryptographic protocols.
            </p>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-500" />
              Terms of Service
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed max-h-60 overflow-y-auto pr-1">
              By using Kempo Pro, you agree to treat community members respectfully. Abusive conduct, spamming, impersonation, or unauthorized access attempts may lead to immediate account suspension by the administrator.
            </p>
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Accept Terms
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

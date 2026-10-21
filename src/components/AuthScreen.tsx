import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  supabaseSignUp,
  supabaseSignIn,
  supabaseSignInWithGoogle,
} from '../lib/supabase';

interface AuthScreenProps {
  onAuthenticated: (userEmail: string, userName?: string, photoURL?: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup'); // Default to signup first as requested!
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password validation
  const passwordsMatch = mode === 'signin' || (password.length > 0 && password === confirmPassword);
  const passwordTooShort = password.length > 0 && password.length < 6;

  // Handle Email + Password submit
  const handleSubmit = async (e: React.FormEvent) => {
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

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please ensure both passwords are identical.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const user = await supabaseSignUp(email.trim(), password);
        setSuccessMsg('Account created successfully! Entering KEMPO PRo...');
        setTimeout(() => {
          onAuthenticated(
            user?.email || email.trim(),
            user?.user_metadata?.display_name || email.split('@')[0]
          );
        }, 400);
      } else {
        // Sign In
        const user = await supabaseSignIn(email.trim(), password);
        setSuccessMsg('Signed in successfully! Entering KEMPO PRo...');
        setTimeout(() => {
          onAuthenticated(
            user?.email || email.trim(),
            user?.user_metadata?.display_name || email.split('@')[0]
          );
        }, 400);
      }
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (msg.toLowerCase().includes('already registered')) {
        msg = 'This email is already registered. Please switch to Sign In.';
        setMode('signin');
      } else if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials')) {
        msg = 'Invalid email or password. Please check your credentials.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Real Native Google OAuth Login via Supabase
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setGoogleLoading(true);

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('kempo_google_auth_in_progress', 'true');
      }
      setSuccessMsg('Connecting to Google...');
      await supabaseSignInWithGoogle();
      // Browser redirects to Google OAuth and returns to app
    } catch (err: any) {
      console.error('Supabase Google OAuth error:', err);
      setErrorMsg(err.message || 'Google sign-in could not be initiated.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-black text-white flex flex-col justify-between p-5 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] select-none overflow-y-auto">
      {/* Top Branding Section */}
      <div className="flex flex-col items-center text-center pt-3">
        <div className="relative mb-3 group">
          <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-red-600 via-red-500 to-rose-900 p-0.5 shadow-2xl shadow-red-900/60 flex items-center justify-center ring-2 ring-red-500/50">
            <div className="w-full h-full rounded-[22px] bg-[#0c0c0e] flex items-center justify-center relative overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-950">
                <span className="text-white font-extrabold text-xl tracking-tight">K</span>
              </div>
            </div>
          </div>
          <div className="absolute -inset-1 rounded-3xl bg-red-600/30 blur-md pointer-events-none group-hover:opacity-100 transition"></div>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-1.5">
          KEMPO <span className="text-red-500">PRo</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Fast, encrypted messaging with Firebase Authentication
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-sm mx-auto my-auto bg-[#161619] rounded-3xl border border-neutral-800 p-5 shadow-2xl space-y-4">
        {/* Toggle: Create Account (First) vs Email Sign In */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#0f0f12] border border-neutral-850">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
            }}
            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
            }}
            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              mode === 'signin'
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Email Sign In
          </button>
        </div>

        {/* Real Native "Continue with Google" Sign In */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full h-11 px-4 rounded-2xl bg-[#222228] hover:bg-[#2a2a32] border border-neutral-700/80 text-white font-medium text-xs flex items-center justify-center gap-3 transition active:scale-98 cursor-pointer disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          )}
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="w-full border-t border-neutral-800"></div>
          <span className="absolute px-3 bg-[#161619] text-[11px] text-neutral-400 font-medium">
            or with email
          </span>
        </div>

        {/* Clean Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email field */}
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
                className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#202026] border border-neutral-750 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          {/* Password field */}
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
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#202026] border border-neutral-750 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-red-500 transition"
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

          {/* Confirm Password field (Only in Sign Up mode) */}
          {mode === 'signup' && (
            <div className="animate-in fade-in">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-neutral-300">
                  Confirm Password
                </label>
                {confirmPassword && (
                  <span
                    className={`text-[10px] font-semibold flex items-center gap-1 ${
                      passwordsMatch ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <Check className="w-3 h-3" /> Passwords Match
                      </>
                    ) : (
                      'Mismatch'
                    )}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full h-11 pl-10 pr-10 rounded-xl bg-[#202026] border text-white text-xs placeholder-neutral-500 focus:outline-none transition ${
                    confirmPassword
                      ? passwordsMatch
                        ? 'border-emerald-600 focus:border-emerald-500'
                        : 'border-red-600 focus:border-red-500'
                      : 'border-neutral-750 focus:border-red-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-neutral-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-700/80 flex items-start gap-2 text-red-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 flex items-start gap-2 text-emerald-300 text-xs animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-tight">{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (mode === 'signup' && (!passwordsMatch || passwordTooShort))}
            className="w-full h-11 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-950 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer mt-1"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create My Account' : 'Sign In to KEMPO PRo'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Clean Footer */}
      <div className="w-full max-w-sm mx-auto text-center pb-2">
        <p className="text-[11px] text-neutral-500">
          KEMPO PRo &bull; End-to-end encrypted messaging
        </p>
      </div>
    </div>
  );
};

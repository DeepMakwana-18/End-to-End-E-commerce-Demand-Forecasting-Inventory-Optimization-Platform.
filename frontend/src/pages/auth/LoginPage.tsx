/** Titan AI login and registration page. */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { authApi } from '@/services/api';
import { cn } from '@/lib/utils';
import { TitanMark } from '@/components/ui/TitanMark';
import '@/styles/titan-auth.css';

const inputClasses = cn(
  'w-full min-h-[44px] pl-11 pr-4 py-2.5 rounded-[12px] text-[15px]',
  'bg-white border border-[#d4d4d8]',
  'text-[#0a0a0a] placeholder:text-[#71717a]',
  'focus:outline-none focus:border-[#1e3fc8] focus:ring-2 focus:ring-[#1e3fc8]/20',
  'transition-colors duration-150'
);

export default function LoginPage() {
  const location = useLocation();
  const [isSignup, setIsSignup] = useState(location.pathname === '/auth/register');
  const [email, setEmail] = useState('admin@titan.demo');
  const [password, setPassword] = useState('admin123');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let response;
      if (isSignup) {
        response = await authApi.signup(email, password, name, orgName);
      } else {
        response = await authApi.login(email, password);
      }

      const data = response.data;
      setAuth(data.user, data.organization, data.access_token, data.refresh_token);
      navigate('/app');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | { message?: string } } } })
        ?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (detail?.message) {
        setError(detail.message);
      } else {
        setError(isSignup ? 'Signup failed. Please try again.' : 'Invalid email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#fafaf9] text-[#0a0a0a] flex flex-col items-center justify-center px-4 py-8 sm:px-6 font-sans">
      <div className="w-full max-w-[420px]">
        {/* Brand lockup */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-2.5 text-[#0a0a0a]">
            <TitanMark size={30} decorative />
            <span className="text-[15px] font-extrabold uppercase tracking-[0.08em] leading-none">
              TITAN AI
            </span>
          </div>
          <h1 className="mt-3 text-[22px] sm:text-[24px] font-bold tracking-[-0.02em] leading-[1.2] text-[#0a0a0a]">
            Titan Supply Chain AI
          </h1>
          <p className="mt-1.5 text-[14px] leading-[1.45] text-[#52525b]">
            Demand forecasting and inventory intelligence
          </p>
        </header>

        {/* Login / Signup card */}
        <main className="titan-auth-card p-6 sm:p-8 mr-1">
          <div className="mb-6">
            <h2 className="text-[20px] font-bold tracking-[-0.015em] leading-[1.25] text-[#0a0a0a]">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-[14px] leading-[1.45] text-[#52525b]">
              {isSignup ? 'Start your 14-day free trial' : 'Sign in to your account to continue'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 flex items-start gap-2.5 p-3.5 rounded-[12px] bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-[14px] font-medium leading-[1.4]"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-[13px] font-semibold text-[#0a0a0a] mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      required={isSignup}
                      autoComplete="name"
                      className={inputClasses}
                    />
                  </div>
                </div>

                {/* Organization Name */}
                <div>
                  <label
                    htmlFor="auth-org"
                    className="block text-[13px] font-semibold text-[#0a0a0a] mb-1.5"
                  >
                    Organization Name
                  </label>
                  <div className="relative">
                    <Building2
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-org"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Acme Corporation"
                      required={isSignup}
                      autoComplete="organization"
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="auth-email"
                className="block text-[13px] font-semibold text-[#0a0a0a] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="auth-password"
                className="block text-[13px] font-semibold text-[#0a0a0a] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className={cn(inputClasses, 'pr-12')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-[10px] text-[#52525b] hover:text-[#0a0a0a] focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-[-2px] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="titan-auth-btn w-full mt-2 px-5 py-3 text-[15px] font-semibold inline-flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <TitanMark size={18} mode="spin" decorative />
                  <span>{isSignup ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Toggle login/signup */}
          <p className="mt-6 text-center text-[14px] text-[#52525b]">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
              className="inline-flex items-center min-h-[44px] px-1 text-[#1e3fc8] hover:underline font-semibold focus-visible:outline-2 focus-visible:outline-[#1e3fc8] focus-visible:outline-offset-2 rounded"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

          {/* Demo credentials */}
          <div className="mt-4 pt-4 border-t border-[#e4e4e7] text-center">
            <span className="inline-block px-3 py-1.5 rounded-[10px] text-[12px] font-mono bg-[#f6f6f7] border border-[#e4e4e7] text-[#52525b]">
              Demo: admin@titan.demo / admin123
            </span>
          </div>
        </main>

        <footer className="mt-6 text-center">
          <p className="text-[12px] leading-[1.4] text-[#52525b]">
            © 2026 Titan Supply Chain AI. Enterprise-Grade Platform.
          </p>
        </footer>
      </div>
    </div>
  );
}

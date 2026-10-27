/** Premium login/signup page with glassmorphism card and gradient background. */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { authApi } from '@/services/api';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-ds-canvas transition-colors duration-300">
      {/* Animated background with Apple Modern subtle glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#007AFF]/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#5856D6]/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1.2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#007AFF]/5 rounded-full blur-[200px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(128,128,128,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.2) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
            className="w-16 h-16 rounded-2xl bg-ds-blue-action flex items-center justify-center mx-auto shadow-[var(--ds-raise-2)] text-white"
          >
            <BarChart3 className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="mt-5 text-2xl font-bold text-ds-text tracking-tight">
            Titan Supply Chain AI
          </h1>
          <p className="mt-1.5 text-sm text-ds-text-secondary">
            Enterprise AI-Powered Demand Forecasting Platform
          </p>
        </div>

        {/* Login/Signup card */}
        <div className="card-apple p-8 sm:p-10 shadow-[var(--ds-raise-3)] backdrop-blur-2xl">
          <h2 className="text-lg font-semibold text-ds-text mb-1">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-ds-text-secondary mb-6">
            {isSignup ? 'Start your 14-day free trial' : 'Sign in to your account to continue'}
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-ds-red-danger/10 border border-ds-red-danger/25 text-ds-red-danger text-sm font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isSignup && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-ds-text-secondary mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-secondary" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith"
                        required={isSignup}
                        className={cn(
                          'w-full pl-11 pr-4 py-3 rounded-full text-sm',
                          'bg-ds-surface-sunken border border-ds-border',
                          'text-ds-text placeholder:text-ds-text-secondary',
                          'focus:outline-none focus:ring-2 focus:ring-ds-blue-action/30 focus:border-ds-blue-action',
                          'transition-all duration-200'
                        )}
                      />
                    </div>
                  </div>

                  {/* Organization Name */}
                  <div>
                    <label className="block text-xs font-medium text-ds-text-secondary mb-1.5">Organization Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-secondary" />
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Corporation"
                        required={isSignup}
                        className={cn(
                          'w-full pl-11 pr-4 py-3 rounded-full text-sm',
                          'bg-ds-surface-sunken border border-ds-border',
                          'text-ds-text placeholder:text-ds-text-secondary',
                          'focus:outline-none focus:ring-2 focus:ring-ds-blue-action/30 focus:border-ds-blue-action',
                          'transition-all duration-200'
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-ds-text-secondary mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-secondary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className={cn(
                    'w-full pl-11 pr-4 py-3 rounded-full text-sm',
                    'bg-ds-surface-sunken border border-ds-border',
                    'text-ds-text placeholder:text-ds-text-secondary',
                    'focus:outline-none focus:ring-2 focus:ring-ds-blue-action/30 focus:border-ds-blue-action',
                    'transition-all duration-200'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-ds-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-secondary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className={cn(
                    'w-full pl-11 pr-12 py-3 rounded-full text-sm',
                    'bg-ds-surface-sunken border border-ds-border',
                    'text-ds-text placeholder:text-ds-text-secondary',
                    'focus:outline-none focus:ring-2 focus:ring-ds-blue-action/30 focus:border-ds-blue-action',
                    'transition-all duration-200'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ds-text-secondary hover:text-ds-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="btn-apple btn-apple-primary w-full py-3.5 text-sm font-semibold justify-center shadow-[var(--ds-raise-1)] mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignup ? 'Create Account' : 'Sign In'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Toggle login/signup */}
          <p className="mt-6 text-center text-sm text-ds-text-secondary">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              className="text-ds-blue-action hover:underline font-medium transition-colors"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

          <div className="mt-4 text-center">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono bg-ds-surface-sunken border border-ds-border text-ds-text-secondary">
              Demo: admin@titan.demo / admin123
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ds-text-secondary">
          © 2026 Titan Supply Chain AI. Enterprise-Grade Platform.
        </p>
      </motion.div>
    </div>
  );
}

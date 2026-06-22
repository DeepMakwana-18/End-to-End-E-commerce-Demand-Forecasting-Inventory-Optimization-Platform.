/** Premium login/signup page with glassmorphism card and gradient background. */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { authApi } from '@/services/api';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
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
      navigate('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-surface-950">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-[200px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-2xl shadow-primary-500/30"
          >
            <BarChart3 className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="mt-5 text-2xl font-bold text-white tracking-tight">
            Titan Supply Chain AI
          </h1>
          <p className="mt-1.5 text-sm text-surface-500">
            Enterprise AI-Powered Demand Forecasting Platform
          </p>
        </div>

        {/* Login/Signup card */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold text-surface-50 mb-1">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-surface-500 mb-6">
            {isSignup ? 'Start your 14-day free trial' : 'Sign in to your account to continue'}
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm"
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
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith"
                        required={isSignup}
                        className={cn(
                          'w-full pl-11 pr-4 py-3 rounded-xl text-sm',
                          'bg-surface-800/50 border border-surface-700/50',
                          'text-white placeholder:text-surface-600',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50',
                          'transition-all duration-200'
                        )}
                      />
                    </div>
                  </div>

                  {/* Organization Name */}
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">Organization Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Corporation"
                        required={isSignup}
                        className={cn(
                          'w-full pl-11 pr-4 py-3 rounded-xl text-sm',
                          'bg-surface-800/50 border border-surface-700/50',
                          'text-white placeholder:text-surface-600',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50',
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
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className={cn(
                    'w-full pl-11 pr-4 py-3 rounded-xl text-sm',
                    'bg-surface-800/50 border border-surface-700/50',
                    'text-white placeholder:text-surface-600',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50',
                    'transition-all duration-200'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className={cn(
                    'w-full pl-11 pr-12 py-3 rounded-xl text-sm',
                    'bg-surface-800/50 border border-surface-700/50',
                    'text-white placeholder:text-surface-600',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50',
                    'transition-all duration-200'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'w-full py-3 rounded-xl text-sm font-semibold text-white',
                'gradient-primary shadow-lg shadow-primary-500/25',
                'hover:shadow-xl hover:shadow-primary-500/30 transition-shadow',
                'flex items-center justify-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
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
          <p className="mt-6 text-center text-sm text-surface-500">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

          <p className="mt-3 text-center text-xs text-surface-600">
            Demo: admin@titan.demo / admin123
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-surface-600">
          © 2026 Titan Supply Chain AI. Enterprise-Grade Platform.
        </p>
      </motion.div>
    </div>
  );
}

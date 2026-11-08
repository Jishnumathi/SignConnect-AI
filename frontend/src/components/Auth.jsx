import { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleModeChange = (newMode) => {
    clearForm();
    setMode(newMode);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else if (mode === 'login') {
      if (!password) {
        setError('Please enter your password.');
        return;
      }
    }

    setLoading(true);

    try {
      let url = '/api/auth/login';
      let payload = { email, password };
      
      if (mode === 'register') {
        url = '/api/auth/register';
        payload = { name, email, password };
      } else if (mode === 'reset') {
        url = '/api/auth/reset-password';
        payload = { email, new_password: password }; // Use password field as new password
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      if (mode === 'register') {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => handleModeChange('login'), 2000);
      } else if (mode === 'reset') {
        setSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => handleModeChange('login'), 2000);
      } else {
        // Login success
        setSuccess('Login successful! Welcome.');
        setTimeout(() => {
          onLoginSuccess(data);
        }, 1000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="w-full max-w-md glass-panel bg-white/70 dark:bg-slate-900/50 p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800/60 relative overflow-hidden">
        
        {/* Glow Accent in corner */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {mode === 'login' && 'Translate sign language in real time'}
            {mode === 'register' && 'Join SignConnect to track translation analytics'}
            {mode === 'reset' && 'Enter your email to configure a new password'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-center gap-2 mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-100 dark:border-rose-900/50 animate-shake">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div className="flex items-center gap-2 mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-100 dark:border-emerald-900/50">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Field (Register mode only) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="name-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  id="name-input"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                id="email-input"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => handleModeChange('reset')}
                  className="text-[11px] text-indigo-500 hover:text-indigo-600 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field (Register mode only) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="confirm-password-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  id="confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-semibold text-sm hover:brightness-105 transition-all shadow-md shadow-indigo-500/20 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' && 'Sign In'}
                {mode === 'register' && 'Register Account'}
                {mode === 'reset' && 'Update Password'}
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Footer */}
        <div className="text-center mt-6 text-xs text-slate-500 dark:text-slate-400">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => handleModeChange('register')}
                className="text-indigo-500 hover:text-indigo-600 font-semibold cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => handleModeChange('login')}
                className="text-indigo-500 hover:text-indigo-600 font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <p>
              Back to{' '}
              <button
                onClick={() => handleModeChange('login')}
                className="text-indigo-500 hover:text-indigo-600 font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

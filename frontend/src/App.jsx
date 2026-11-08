import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import TranslatorStudio from './components/TranslatorStudio';
import Dashboard from './components/Dashboard';
import { User, Mail, Shield, Key, Check, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('translator');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' || 
      (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Profile status message on change
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Handle dark mode classes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Check user authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        if (response.ok) {
          const profileData = await response.json();
          setUser(profileData);
          // Set user ID header key in localStorage for fallback request handling
          localStorage.setItem('userId', profileData.user_id);
        } else {
          setUser(null);
          localStorage.removeItem('userId');
        }
      } catch (err) {
        console.error('Auto-login session check failed:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('userId', userData.user_id);
    setActiveTab('translator');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request error:', err);
    }
    setUser(null);
    localStorage.removeItem('userId');
    setActiveTab('translator');
  };

  // Helper trigger to refresh dashboard values when a translation gets saved
  const triggerMetricsUpdate = () => {
    setUpdateTrigger(prev => prev + 1);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (newPassword.length < 6) {
      setProfileError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, new_password: newPassword }),
      });

      if (response.ok) {
        setProfileSuccess('Password successfully updated!');
        setNewPassword('');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update password');
      }
    } catch (err) {
      setProfileError(err.message);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading profile session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Shared Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Contents Panel */}
      <main className="flex-1 flex flex-col">
        {!user ? (
          <Auth onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeTab === 'translator' && (
              <TranslatorStudio
                user={user}
                onNewTranslationAdded={triggerMetricsUpdate}
              />
            )}
            
            {activeTab === 'dashboard' && (
              <Dashboard
                user={user}
                updateTrigger={updateTrigger}
              />
            )}

            {activeTab === 'profile' && (
              <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">User Profile</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage your credentials, preferences and account security parameters.
                  </p>
                </div>

                {/* Profile Details Card */}
                <div className="glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Account details</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Full Name</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 block">{user.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-850 pt-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 block">{user.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-850 pt-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">User UID</span>
                        <span className="text-xs font-bold text-slate-400 mt-0.5 block font-mono">{user.user_id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password reset card */}
                <div className="glass-panel bg-white/70 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-md">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Security settings</h3>
                  
                  {profileSuccess && (
                    <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/50">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-100 dark:border-rose-900/50">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label htmlFor="profile-password-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Change Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                          <Key className="w-4.5 h-4.5" />
                        </span>
                        <input
                          id="profile-password-input"
                          type="password"
                          required
                          placeholder="Enter new password (min 6 characters)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs transition-all"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Accessibility layout footer */}
      <footer className="py-4 border-t border-slate-200/50 dark:border-slate-900 bg-white/40 dark:bg-slate-950/40 text-center text-[10px] text-slate-400">
        SignConnect AI &copy; {new Date().getFullYear()} - Empowerment Through Inclusive Design
      </footer>
      
    </div>
  );
}

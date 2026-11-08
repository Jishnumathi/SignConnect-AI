import { Sun, Moon, LogOut, Video, BarChart2, User, HelpCircle } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, darkMode, setDarkMode, user, onLogout }) {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('translator')}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                SignConnect AI
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-1 tracking-wider uppercase">
                Real-Time Interpreter
              </span>
            </div>
          </div>

          {/* Navigation Items (Visible for logged in users) */}
          {user && (
            <nav className="hidden md:flex space-x-1">
              <button
                id="nav-btn-translator"
                onClick={() => setActiveTab('translator')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === 'translator'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Video className="w-4 h-4" />
                Translator Studio
              </button>
              <button
                id="nav-btn-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                Dashboard
              </button>
              <button
                id="nav-btn-profile"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === 'profile'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <User className="w-4 h-4" />
                User Profile
              </button>
            </nav>
          )}

          {/* Controls Section */}
          <div className="flex items-center gap-2">
            
            {/* Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-200"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            {/* Profile Avatar / LogOut Button */}
            {user ? (
              <div className="flex items-center gap-3 border-l border-slate-200/60 dark:border-slate-800/60 pl-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {user.email}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all duration-200 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3">
                <HelpCircle className="w-4 h-4" />
                <span>Accessibility Mode</span>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}

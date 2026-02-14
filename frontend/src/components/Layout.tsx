/**
 * Main application layout with modern navigation bar.
 * Features: logo icon, nav with active states, theme toggle, user avatar.
 */

import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useCurrentUser, useLogout } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

/** SVG icons as inline components — keeps dependencies minimal */
const icons = {
  logo: (
    <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
      <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
      <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  ),
  dashboard: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  key: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  /** Sun icon (shown in dark mode to switch to light) */
  sun: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  /** Moon icon (shown in light mode to switch to dark) */
  moon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  /** Monitor icon (for system theme) */
  monitor: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

/** Navigation link with active state indicator */
function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function Layout() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const { mode, isDark, toggle } = useTheme();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/login"),
    });
  };

  // User avatar — first letter of email
  const avatarLetter = user?.email?.charAt(0)?.toUpperCase() || "?";

  // Theme icon based on current mode
  const themeIcon = mode === "dark" ? icons.sun : mode === "light" ? icons.moon : icons.monitor;
  const themeLabel = mode === "dark" ? "Dark" : mode === "light" ? "Light" : "System";

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      {/* Navigation bar */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and main nav */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Link to="/" className="flex items-center gap-2.5 mr-4 sm:mr-6">
                {icons.logo}
                <span className="text-lg font-bold text-gradient hidden sm:inline">
                  Swagger Aggregator
                </span>
              </Link>
              <NavLink to="/" icon={icons.dashboard} label="Explorer" />
              <NavLink to="/jwt" icon={icons.key} label="JWT" />
            </div>

            {/* Theme toggle, user info and logout */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={toggle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all"
                title={`Theme: ${themeLabel} (click to cycle)`}
              >
                {themeIcon}
                <span className="text-xs hidden sm:inline">{themeLabel}</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 ml-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                  {avatarLetter}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[160px] truncate">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-950 rounded-lg transition-all"
                title="Logout"
              >
                {icons.logout}
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content — flex-1 fills remaining height */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

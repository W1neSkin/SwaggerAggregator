/**
 * Main application layout with navigation bar.
 * Wraps all authenticated pages.
 */

import { Link, Outlet, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../hooks/useAuth";

export default function Layout() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/login"),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo and main nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Swagger Aggregator
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/jwt"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                JWT Generator
              </Link>
              <Link
                to="/settings"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Settings
              </Link>
            </div>
          </div>

          {/* User info and logout */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

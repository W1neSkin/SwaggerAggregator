/**
 * Login / Register page.
 * Modern design with animated gradient background and glassmorphism card.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin, useRegister } from "../hooks/useAuth";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const login = useLogin();
  const register = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const mutation = isRegister ? register : login;

    mutation.mutate(
      { email, password },
      {
        onSuccess: () => navigate("/"),
        onError: (err: any) => {
          const message =
            err?.response?.data?.detail || "Something went wrong. Please try again.";
          setError(message);
        },
      }
    );
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-animated p-4 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo + Header */}
        <div className="text-center mb-8">
          {/* Logo icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <svg viewBox="0 0 32 32" fill="none" className="w-10 h-10">
              <path d="M4 10h24M4 16h18M4 22h12" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Swagger Aggregator</h1>
          <p className="text-blue-100 mt-2 text-sm">
            Manage all your service APIs from one place
          </p>
        </div>

        {/* Form card — glassmorphism */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 p-8 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {isRegister ? "Create Account" : "Welcome back"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isRegister ? "Sign up to get started" : "Sign in to your account"}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm placeholder:text-gray-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm placeholder:text-gray-400"
                placeholder="Min 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </span>
              ) : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

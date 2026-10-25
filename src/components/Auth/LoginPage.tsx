"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, User, Mail, Lock, BookOpen } from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

export function LoginPage() {
  const router = useRouter();
  const { login } = usePharmacy();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillCredentials = (type: "superadmin" | "admin") => {
    if (type === "superadmin") {
      setEmail("superadmin@pharmacy.com");
      setPassword("superadmin123");
    } else {
      setEmail("admin@pharmacy.com");
      setPassword("admin123");
    }
    setError(null);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      login(
        email,
        email.includes("superadmin") ? "superadmin" : "admin"
      );
      router.push("/pharmacy");
    }, 400);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 scroll-gradient-bg overflow-hidden">
      <div className="w-full max-w-[440px] flex flex-col items-center relative z-10 glass-panel card-sheen p-7 sm:p-8 rounded-3xl shadow-xl shadow-emerald-950/5">
        {/* Brand Icon */}
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0f766e] to-[#14b8a6] flex items-center justify-center shadow-md mb-4 shadow-teal-900/10">
          <svg
            className="w-8 h-8 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M9 3a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3V5a2 2 0 0 0-2-2H9zm0 2h6v2H9V5zm2 5h2v3h3v2h-3v3h-2v-3H8v-2h3v-3z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center">
          PharmacyNext
        </h1>
        <p className="text-xs text-slate-600 mt-1 mb-6 text-center">
          Sign in to your multi-pharmacy SaaS dashboard
        </p>

        {/* Demo Mode Box */}
        <div className="w-full bg-[#f2f9f4] border border-[#a7d9be] rounded-xl p-3.5 mb-5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0c6246] mb-2.5">
            <span>✨</span>
            <span>Demo mode — click to fill credentials</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Card 1: Platform Admin */}
            <button
              type="button"
              onClick={() => fillCredentials("superadmin")}
              className="p-2.5 bg-white border border-slate-200/90 rounded-lg text-left hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                <span className="truncate">Platform Admin</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                Manage pharmacies, pri...
              </p>
              <p className="text-[10px] font-mono text-slate-600 truncate mt-1">
                superadmin@pharmacy.com
              </p>
            </button>

            {/* Card 2: Pharmacy Admin */}
            <button
              type="button"
              onClick={() => fillCredentials("admin")}
              className="p-2.5 bg-white border border-slate-200/90 rounded-lg text-left hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span className="truncate">Pharmacy Admin</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                Demo Pharmacy dashbo...
              </p>
              <p className="text-[10px] font-mono text-slate-600 truncate mt-1">
                admin@pharmacy.com
              </p>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 mt-2">
            Disable by removing DEMO=true from .env.local.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSignIn} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your email"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-xs"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#059669] hover:bg-[#047857] active:scale-[0.99] text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        {/* Documentation Link */}
        <div className="mt-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            <span>View Documentation</span>
          </a>
        </div>
      </div>
    </div>
  );
}

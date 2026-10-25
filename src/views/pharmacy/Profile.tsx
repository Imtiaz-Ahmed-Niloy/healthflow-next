"use client";

import React, { useState } from "react";
import { CheckCircle2, UserCheck } from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

export default function ProfilePage() {
  const { user } = usePharmacy();
  const [name, setName] = useState(user?.name || "Pharmacy Admin");
  const [email, setEmail] = useState(user?.email || "admin@pharmacy.com");
  const [password, setPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("Profile updated successfully!");
    setPassword("");
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <div className="min-h-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Profile</h1>
          <p className="text-xs text-gray-500 mt-1">Update your personal information</p>
        </div>

        {/* Role Pill Badge */}
        <div className="self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-xs rounded-full font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Pharmacy admin</span>
          </span>
        </div>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs text-gray-900 border border-gray-200 rounded-lg shadow-2xs focus:outline-hidden focus:border-blue-500 bg-white"
            />
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs text-gray-900 border border-gray-200 rounded-lg shadow-2xs focus:outline-hidden focus:border-blue-500 bg-white"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              New Password (leave blank to keep current)
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 text-xs text-gray-900 border border-gray-200 rounded-lg shadow-2xs focus:outline-hidden focus:border-blue-500 bg-white"
            />
          </div>

          {/* Success Notification */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Full-width Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 bg-[#18181b] hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs mt-2"
          >
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
}


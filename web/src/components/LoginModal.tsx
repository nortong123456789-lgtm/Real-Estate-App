'use client';

import React, { useState } from 'react';
import { X, Lock, User, Check, ShieldAlert, KeyRound } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: () => void;
}

// SHA-256 Hash for Admin Password: ApnaGharAdmin2026!
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = 'd739c9f28d227b36f1c4e723bb3fa4d1b8273634125b4fa66c3a110a1334863e';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function LoginModal({ isOpen, onClose, onSuccessLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const inputHash = await sha256(password);
      if (username.trim().toLowerCase() === ADMIN_USERNAME && inputHash === ADMIN_PASSWORD_HASH) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('apnaghar_role', 'admin');
        }
        onSuccessLogin();
        onClose();
      } else {
        setError('Invalid admin credentials. Please check username and password.');
      }
    } catch (err) {
      setError('Error validating credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-darkNav/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-50 rounded-2xl border border-brand-100 text-brand-500 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Lock className="w-6 h-6 text-brand-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Admin Portal Log In</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Log in as Admin to manage drafts, edit properties, and view private notes.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-brand-500" />
              <span>Username</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-semibold text-slate-800 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-brand-500" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-semibold text-slate-800 bg-slate-50/50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Authenticating...' : 'Log In as Admin'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

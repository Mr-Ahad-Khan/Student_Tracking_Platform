import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { Lock, Mail, ChevronRight, GraduationCap } from 'lucide-react';

export default function Login() {
  const { user, login, error } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If user is already authenticated, redirect them to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSubmitting(true);

    if (!email || !password) {
      setLocalError('Please fill out all fields.');
      setSubmitting(false);
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error is already set in AuthContext, but we can set local state or rely on it
      setLocalError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="relative w-full max-w-lg bg-slate-950/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl space-y-8">
        
        {/* Subtle glowing highlights in the background */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl" />

        {/* Branding header */}
        <div className="text-center space-y-3 relative">
          <div className="inline-flex p-3.5 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-2xl">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Student Tracker Platform</h1>
          <p className="text-sm text-slate-400">Class management and academic statistics center</p>
        </div>

        {/* Form panel */}
        <form onSubmit={handleSubmit} className="space-y-6 relative">
          {(localError || error) && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold animate-pulse">
              {localError || error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@platform.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg hover:shadow-blue-500/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>

        {/* Demo Credentials Drawer helper (highly human-built and helpful for testing!) */}
        <div className="pt-6 border-t border-slate-900 text-xs text-slate-500 relative space-y-2">
          <p className="font-semibold text-slate-400">Default Seeder Credentials:</p>
          <div className="p-3.5 bg-slate-950 border border-slate-900 rounded-2xl font-mono space-y-1">
            <p>Admin: <span className="text-blue-400">admin@platform.com</span> / <span className="text-slate-300">adminpassword</span></p>
          </div>
        </div>
        
      </div>
    </div>
  );
}

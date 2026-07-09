import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { LogOut, GraduationCap, User as UserIcon } from 'lucide-react';
import AdminDashboard from '../components/AdminDashboard.jsx';
import FacultyDashboard from '../components/FacultyDashboard.jsx';
import StudentDashboard from '../components/StudentDashboard.jsx';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if user is not authenticated after loading completes
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm font-semibold text-slate-500">Checking credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight hidden sm:block">
              Student Tracking Platform
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile Info */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <UserIcon className="h-4.5 w-4.5" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-700 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">
                  {user.role}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-2 border border-slate-200"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs font-semibold pr-1 hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {user.role === 'admin' && <AdminDashboard user={user} />}
        {user.role === 'faculty' && <FacultyDashboard user={user} />}
        {user.role === 'student' && <StudentDashboard user={user} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} Student Tracking Platform. All rights reserved.
      </footer>
    </div>
  );
}

import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, Film, Calendar, LayoutDashboard, LogOut, User, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <RouterLink to="/" className="flex items-center gap-2 text-indigo-400 font-bold text-xl tracking-tight hover:text-indigo-300 transition">
          <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30">
            <Ticket className="w-6 h-6 text-indigo-400" />
          </div>
          <span>CinePass</span>
        </RouterLink>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <RouterLink to="/events" className="hover:text-indigo-400 flex items-center gap-1.5 transition">
            <Film className="w-4 h-4" />
            <span>Browse Events</span>
          </RouterLink>
          {user && user.role === 'CUSTOMER' && (
            <RouterLink to="/my-bookings" className="hover:text-indigo-400 flex items-center gap-1.5 transition">
              <Calendar className="w-4 h-4" />
              <span>My Bookings</span>
            </RouterLink>
          )}
          {user && (user.role === 'ORGANISER' || user.role === 'ADMIN') && (
            <RouterLink to="/organiser/dashboard" className="hover:text-indigo-400 flex items-center gap-1.5 transition">
              <LayoutDashboard className="w-4 h-4" />
              <span>Organiser Hub</span>
            </RouterLink>
          )}
          {user && user.role === 'ADMIN' && (
            <RouterLink to="/admin/dashboard" className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Panel</span>
            </RouterLink>
          )}
        </div>

        {/* Right Auth Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-200">{user.name}</span>
                <span className="text-xs text-indigo-400 capitalize font-medium">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition border border-slate-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <RouterLink
                to="/login"
                className="text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition"
              >
                Log In
              </RouterLink>
              <RouterLink
                to="/register"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition shadow-lg shadow-indigo-600/20"
              >
                Register
              </RouterLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

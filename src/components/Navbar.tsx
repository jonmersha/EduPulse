import React from 'react';
import { Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { profile, logout } = useAuth();
  
  return (
    <nav className="h-16 border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold italic">E</div>
        <span className="font-bold text-xl tracking-tight">EduPulse</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search courses..." 
            className="pl-10 pr-4 py-2 bg-zinc-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all w-64"
          />
        </div>
        
        {profile && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{profile.displayName}</p>
              <p className="text-xs text-zinc-500 capitalize">{profile.role}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

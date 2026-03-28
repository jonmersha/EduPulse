import React, { useState } from 'react';
import { 
  Search, 
  LogOut,
  LayoutDashboard, 
  BookOpen, 
  Search as SearchIcon, 
  Settings, 
  GraduationCap, 
  Users, 
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { profile, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'marketplace', label: 'Marketplace', icon: SearchIcon },
    ...(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.email === 'beshegercom@gmail.com' ? [{ id: 'school', label: 'Admin Panel', icon: Settings }] : []),
    ...(profile?.role === 'teacher' || profile?.role === 'provider' ? [{ id: 'my-courses', label: 'Teaching', icon: GraduationCap }] : []),
    ...(profile?.role === 'parent' ? [{ id: 'parent', label: 'Parent Portal', icon: Users }] : []),
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <nav className="h-16 border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-8">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold italic">E</div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">EduPulse</span>
          </div>

          <div className="hidden xl:flex items-center gap-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === item.id 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "text-zinc-600 hover:bg-zinc-50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3 lg:gap-6">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search courses..." 
              className="pl-10 pr-4 py-2 bg-zinc-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all w-40 lg:w-64"
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

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="xl:hidden fixed inset-x-0 top-16 bg-white border-b border-black/5 z-40 p-4 shadow-xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    activeTab === item.id 
                      ? "bg-emerald-50 text-emerald-700" 
                      : "text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

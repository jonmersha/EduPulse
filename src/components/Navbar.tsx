import React, { useState } from 'react';
import { 
  Search, 
  LogOut,
  LayoutDashboard, 
  BookOpen, 
  Settings, 
  GraduationCap, 
  Users, 
  MessageSquare,
  Menu,
  X,
  Sun,
  Moon,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'courses', label: 'My Learning', icon: BookOpen },
    { id: 'marketplace', label: 'Discover', icon: Search },
    { id: 'messages', label: 'Messaging', icon: MessageSquare },
    ...(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.email === 'beshegercom@gmail.com' ? [{ id: 'school', label: 'Admin', icon: Settings }] : []),
    ...(profile?.role === 'teacher' || profile?.role === 'provider' ? [{ id: 'my-courses', label: 'Teaching', icon: GraduationCap }] : []),
    ...(profile?.role === 'parent' ? [{ id: 'parent', label: 'Parent', icon: Users }] : []),
  ];

  return (
    <>
      <nav className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          
          {/* Left: Logo & Search */}
          <div className="flex items-center gap-2 md:gap-4">
            <div 
              className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center text-white font-bold italic cursor-pointer shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              in
            </div>
            
            <div className="relative hidden md:block group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-zinc-700 dark:text-zinc-400 dark:group-focus-within:text-zinc-300" />
              </div>
              <input 
                type="text" 
                placeholder="Search" 
                className="block w-64 pl-10 pr-3 py-1.5 border-none rounded bg-[#EEF3F8] dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:text-white transition-all focus:w-80"
              />
            </div>
            <button className="md:hidden p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
              <Search className="w-5 h-5" />
            </button>
          </div>
          
          {/* Right: Navigation Icons */}
          <div className="flex items-center h-full">
            <div className="hidden md:flex items-center h-full gap-1 md:gap-4 lg:gap-6 mr-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center h-full min-w-[60px] border-b-2 transition-all px-1",
                    activeTab === item.id 
                      ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white" 
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 mb-1", activeTab === item.id ? "fill-current" : "")} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-4 h-full py-2">
              <button
                onClick={toggleTheme}
                className="flex flex-col items-center justify-center min-w-[50px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5 mb-1" /> : <Sun className="w-5 h-5 mb-1" />}
                <span className="text-[10px] font-medium hidden md:block">Theme</span>
              </button>

              {profile && (
                <div className="relative flex flex-col items-center justify-center min-w-[50px] cursor-pointer group">
                  <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-1 overflow-hidden">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      {profile.displayName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">
                    <span className="text-[10px] font-medium hidden md:block">Me</span>
                  </div>
                  
                  {/* Dropdown menu on hover */}
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                      <p className="font-bold text-sm dark:text-white truncate">{profile.displayName}</p>
                      <p className="text-xs text-zinc-500 truncate">{profile.email}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="w-full text-left px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                      >
                        Settings
                      </button>
                      <button 
                        onClick={logout}
                        className="w-full text-left px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden ml-2 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (LinkedIn style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-50 flex justify-around items-center h-14 pb-safe">
        {menuItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full",
              activeTab === item.id 
                ? "text-zinc-900 dark:text-white" 
                : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <item.icon className={cn("w-5 h-5 mb-1", activeTab === item.id ? "fill-current" : "")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Extended Menu (for items that don't fit in bottom bar) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-40 p-4 shadow-xl"
          >
            <div className="grid grid-cols-1 gap-2">
              {menuItems.slice(5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    activeTab === item.id 
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

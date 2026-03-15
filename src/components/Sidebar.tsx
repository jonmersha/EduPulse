import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Search, 
  Settings, 
  GraduationCap, 
  Users, 
  MessageSquare 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { profile } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'marketplace', label: 'Marketplace', icon: Search },
    ...(profile?.role === 'admin' ? [{ id: 'school', label: 'School Admin', icon: Settings }] : []),
    ...(profile?.role === 'teacher' || profile?.role === 'provider' ? [{ id: 'my-courses', label: 'Teaching', icon: GraduationCap }] : []),
    ...(profile?.role === 'parent' ? [{ id: 'parent', label: 'Parent Portal', icon: Users }] : []),
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-black/5 h-[calc(100vh-64px)] p-4 flex flex-col gap-2">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
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
    </aside>
  );
};

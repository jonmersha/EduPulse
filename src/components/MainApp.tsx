import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { LessonViewer } from './LessonViewer';
import { Dashboard } from '../pages/Dashboard';
import { Marketplace } from '../pages/Marketplace';
import { MyCourses } from '../pages/MyCourses';
import { CourseManagement } from '../pages/CourseManagement';
import { AdminView } from '../pages/AdminView';
import { ParentView } from '../pages/ParentView';
import { SettingsView } from '../pages/SettingsView';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  
  return (
    <div className="min-h-screen bg-[#F9F9F8] text-zinc-900 font-sans">
      <Navbar />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSelectedCourse(null); }} />
        <main className="flex-1 p-8 overflow-y-auto h-[calc(100vh-64px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedCourse || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedCourse ? (
                <LessonViewer courseId={selectedCourse} onBack={() => setSelectedCourse(null)} />
              ) : (
                <>
                  {activeTab === 'dashboard' && <Dashboard />}
                  {activeTab === 'marketplace' && <Marketplace onSelectCourse={setSelectedCourse} />}
                  {activeTab === 'courses' && <MyCourses onSelectCourse={setSelectedCourse} />}
                  {activeTab === 'my-courses' && <CourseManagement />}
                  {activeTab === 'school' && <AdminView />}
                  {activeTab === 'parent' && <ParentView />}
                  {activeTab === 'messages' && (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                      <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-medium">Messages will appear here</p>
                    </div>
                  )}
                  {activeTab === 'settings' && <SettingsView />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

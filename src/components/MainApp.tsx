import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { Navbar } from './Navbar';
import { LessonViewer } from './LessonViewer';
import { Dashboard } from '../pages/Dashboard';
import { Marketplace } from '../pages/Marketplace';
import { MyCourses } from '../pages/MyCourses';
import { CourseManagement } from '../pages/CourseManagement';
import { AdminView } from '../pages/AdminView';
import { ParentView } from '../pages/ParentView';
import { SettingsView } from '../pages/SettingsView';
import { SeedData } from './SeedData';

import { ExamViewer } from './ExamViewer';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  
  const handleTabChange = (t: string) => {
    setActiveTab(t);
    setSelectedCourse(null);
    setSelectedExam(null);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-zinc-900 font-sans">
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />
      <div className="flex">
        <main className="flex-1 p-8 overflow-y-auto h-[calc(100vh-64px)]">
          <SeedData />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedCourse || '') + (selectedExam || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedCourse ? (
                <LessonViewer courseId={selectedCourse} onBack={() => setSelectedCourse(null)} />
              ) : selectedExam ? (
                <ExamViewer examId={selectedExam} onBack={() => setSelectedExam(null)} />
              ) : (
                <>
                  {activeTab === 'dashboard' && <Dashboard onSelectCourse={setSelectedCourse} onSelectExam={setSelectedExam} />}
                  {activeTab === 'marketplace' && <Marketplace onSelectCourse={setSelectedCourse} onSelectExam={setSelectedExam} />}
                  {activeTab === 'courses' && <MyCourses onSelectCourse={setSelectedCourse} onSelectExam={setSelectedExam} />}
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

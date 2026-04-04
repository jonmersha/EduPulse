import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { Navbar } from './Navbar';
import { LessonViewer } from './LessonViewer';
import { ExamViewer } from './ExamViewer';
import { Dashboard } from '../pages/Dashboard';
import { Marketplace } from '../pages/Marketplace';
import { MyCourses } from '../pages/MyCourses';
import { CourseManagement } from '../pages/CourseManagement';
import { SuperAdminView } from '../pages/SuperAdminView';
import { SchoolManagerView } from '../pages/SchoolManagerView';
import { ParentView } from '../pages/ParentView';
import { SettingsView } from '../pages/SettingsView';
import { SchoolDirectoryView } from '../pages/SchoolDirectoryView';
import { SchoolProfileView } from '../pages/SchoolProfileView';

import { CourseEditorPage } from '../pages/CourseEditorPage';
import { ExamEditor } from './ExamEditor';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedExamForEdit, setSelectedExamForEdit] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  
  const handleTabChange = (t: string) => {
    setActiveTab(t);
    setSelectedCourse(null);
    setSelectedCourseForEdit(null);
    setSelectedExam(null);
    setSelectedExamForEdit(null);
    setSelectedSchool(null);
  };

  return (
    <div className="h-screen flex flex-col bg-[#F9F9F8] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 relative">
        <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedCourse || '') + (selectedCourseForEdit || '') + (selectedExam || '') + (selectedExamForEdit || '') + (selectedSchool || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedCourse ? (
                <LessonViewer courseId={selectedCourse} onBack={() => setSelectedCourse(null)} />
              ) : selectedCourseForEdit ? (
                <CourseEditorPage courseId={selectedCourseForEdit} onBack={() => setSelectedCourseForEdit(null)} />
              ) : selectedExam ? (
                <ExamViewer examId={selectedExam} onBack={() => setSelectedExam(null)} />
              ) : selectedExamForEdit ? (
                <ExamEditor examId={selectedExamForEdit} onBack={() => setSelectedExamForEdit(null)} />
              ) : selectedSchool ? (
                <SchoolProfileView schoolId={selectedSchool} onBack={() => setSelectedSchool(null)} />
              ) : (
                <>
                  {activeTab === 'dashboard' && <Dashboard onSelectCourse={setSelectedCourse} onSelectExam={setSelectedExam} />}
                  {activeTab === 'schools' && <SchoolDirectoryView onSelectSchool={setSelectedSchool} />}
                  {activeTab === 'marketplace' && <Marketplace onSelectCourse={setSelectedCourse} onSelectExam={setSelectedExam} />}
                  {activeTab === 'courses' && <MyCourses onSelectCourse={setSelectedCourse} onSelectExam={setSelectedExam} />}
                  {activeTab === 'my-courses' && <CourseManagement onEditCourse={setSelectedCourseForEdit} onEditExam={setSelectedExamForEdit} />}
                  {activeTab === 'super-admin' && <SuperAdminView />}
                  {activeTab === 'school' && <SchoolManagerView />}
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
  );
};

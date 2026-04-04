import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Dashboard } from '../pages/Dashboard';
import { Marketplace } from '../pages/Marketplace';
import { MyCourses } from '../pages/MyCourses';
import { SettingsView } from '../pages/SettingsView';
import { useAuth } from '../context/AuthContext';
import SuperAdminView from '../pages/SuperAdminView';
import { SchoolManagerView } from '../pages/SchoolManagerView';
import TeacherView from '../pages/TeacherView';
import { ParentView } from '../pages/ParentView';
import { LessonViewer } from './LessonViewer';
import { ExamViewer } from './ExamViewer';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const { profile } = useAuth();

  const handleSelectCourse = (id: string) => {
    setSelectedCourseId(id);
  };

  const handleSelectExam = (id: string) => {
    setSelectedExamId(id);
  };

  const renderContent = () => {
    if (selectedCourseId) {
      return <LessonViewer courseId={selectedCourseId} onBack={() => setSelectedCourseId(null)} />;
    }
    if (selectedExamId) {
      return <ExamViewer examId={selectedExamId} onBack={() => setSelectedExamId(null)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onSelectCourse={handleSelectCourse} onSelectExam={handleSelectExam} />;
      case 'courses':
        return <MyCourses onSelectCourse={handleSelectCourse} onSelectExam={handleSelectExam} />;
      case 'marketplace':
        return <Marketplace onSelectCourse={handleSelectCourse} onSelectExam={handleSelectExam} />;
      case 'settings':
        return <SettingsView />;
      case 'super-admin':
        return <SuperAdminView />;
      case 'school':
        return <SchoolManagerView />;
      case 'my-courses':
        return <TeacherView />;
      case 'parent':
        return <ParentView />;
      default:
        return <Dashboard onSelectCourse={handleSelectCourse} onSelectExam={handleSelectExam} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-zinc-950 transition-colors duration-300">
      <Navbar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedCourseId(null);
        setSelectedExamId(null);
      }} />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {renderContent()}
      </main>
    </div>
  );
};

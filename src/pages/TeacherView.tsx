import React from 'react';
import { BookOpen, Users, Calendar, CheckSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TeacherView: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Teacher Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your classes, students, and assignments.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-wider">My Students</h3>
          <p className="text-3xl font-bold mt-1 dark:text-white">0</p>
        </div>
        
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-wider">Active Classes</h3>
          <p className="text-3xl font-bold mt-1 dark:text-white">0</p>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-wider">Schedule</h3>
          <p className="text-3xl font-bold mt-1 dark:text-white">0</p>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-wider">To Grade</h3>
          <p className="text-3xl font-bold mt-1 dark:text-white">0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-bold mb-6 dark:text-white">Upcoming Classes</h2>
          <div className="text-center py-12 text-zinc-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No classes scheduled for today.</p>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-bold mb-6 dark:text-white">Recent Activity</h2>
          <div className="text-center py-12 text-zinc-400">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No recent activity to show.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TeacherView;

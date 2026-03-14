import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { BookOpen, CheckCircle2, GraduationCap } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ enrolled: 0, completed: 0, avgProgress: 0 });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      const enrolled = docs.length;
      const completed = docs.filter(d => d.progress === 100).length;
      const totalProgress = docs.reduce((acc, curr) => acc + (curr.progress || 0), 0);
      const avgProgress = enrolled > 0 ? Math.round(totalProgress / enrolled) : 0;
      setStats({ enrolled, completed, avgProgress });
    });
    return () => unsubscribe();
  }, [profile]);
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.displayName}</h1>
        <p className="text-zinc-500 mt-1">Here's what's happening with your learning today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Courses Enrolled</h3>
          <p className="text-3xl font-bold mt-1">{stats.enrolled}</p>
          <p className="text-xs text-emerald-600 mt-2 font-medium">Active learning</p>
        </div>
        
        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Courses Completed</h3>
          <p className="text-3xl font-bold mt-1">{stats.completed}</p>
          <p className="text-xs text-zinc-400 mt-2 font-medium">{stats.enrolled - stats.completed} in progress</p>
        </div>

        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Average Progress</h3>
          <p className="text-3xl font-bold mt-1">{stats.avgProgress}%</p>
          <p className="text-xs text-emerald-600 mt-2 font-medium">Overall completion</p>
        </div>
      </div>
    </div>
  );
};

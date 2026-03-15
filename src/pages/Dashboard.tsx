import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { BookOpen, CheckCircle2, GraduationCap, Trophy } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface DashboardProps {
  onSelectCourse: (id: string) => void;
  onSelectExam: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectCourse, onSelectExam }) => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ enrolled: 0, completed: 0, avgProgress: 0, examsTaken: 0 });
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      const enrolled = docs.filter(d => d.courseId).length;
      const completed = docs.filter(d => d.courseId && d.progress === 100).length;
      const totalProgress = docs.filter(d => d.courseId).reduce((acc, curr) => acc + (curr.progress || 0), 0);
      const avgProgress = enrolled > 0 ? Math.round(totalProgress / enrolled) : 0;
      
      // Fetch exam results for stats
      const resultsQ = query(collection(db, 'examResults'), where('studentId', '==', profile.uid));
      const resultsUnsub = onSnapshot(resultsQ, (resultsSnapshot) => {
        setStats({ enrolled, completed, avgProgress, examsTaken: resultsSnapshot.docs.length });
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'examResults'));

      // Fetch recent courses
      const courseEnrollments = docs.filter(d => d.courseId).slice(0, 3);
      const coursePromises = courseEnrollments.map(async (e) => {
        const d = await getDoc(doc(db, 'courses', e.courseId));
        return { id: d.id, ...d.data(), progress: e.progress };
      });
      const courses = await Promise.all(coursePromises);
      setRecentCourses(courses.filter((c: any) => c && c.title));

      // Fetch upcoming exams (subscribed but not taken)
      const examEnrollments = docs.filter(d => d.examId);
      const examPromises = examEnrollments.map(async (e) => {
        const resultDoc = await getDoc(doc(db, 'examResults', `${profile.uid}_${e.examId}`));
        if (!resultDoc.exists()) {
          const d = await getDoc(doc(db, 'exams', e.examId));
          return { id: d.id, ...d.data() };
        }
        return null;
      });
      const exams = await Promise.all(examPromises);
      setUpcomingExams(exams.filter(e => e !== null).slice(0, 3));

      return () => resultsUnsub();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));
    return () => unsubscribe();
  }, [profile]);
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.displayName}</h1>
        <p className="text-zinc-500 mt-1">Here's what's happening with your learning today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Courses</h3>
          <p className="text-3xl font-bold mt-1">{stats.enrolled}</p>
        </div>
        
        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Completed</h3>
          <p className="text-3xl font-bold mt-1">{stats.completed}</p>
        </div>

        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Avg Progress</h3>
          <p className="text-3xl font-bold mt-1">{stats.avgProgress}%</p>
        </div>

        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Exams Taken</h3>
          <p className="text-3xl font-bold mt-1">{stats.examsTaken}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Recent Courses</h2>
          <div className="space-y-3">
            {recentCourses.length > 0 ? recentCourses.map(course => (
              <div 
                key={course.id} 
                onClick={() => onSelectCourse(course.id)}
                className="p-4 bg-white border border-black/5 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-16 h-12 bg-zinc-100 rounded-lg overflow-hidden shrink-0">
                  <img src={`https://picsum.photos/seed/${course.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{course.title}</h4>
                  <div className="w-full bg-zinc-100 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
                <div className="text-xs font-bold text-zinc-400">{course.progress}%</div>
              </div>
            )) : (
              <p className="text-zinc-400 text-sm italic">No active courses.</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Upcoming Exams</h2>
          <div className="space-y-3">
            {upcomingExams.length > 0 ? upcomingExams.map(exam => (
              <div 
                key={exam.id} 
                onClick={() => onSelectExam(exam.id)}
                className="p-4 bg-white border border-black/5 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{exam.title}</h4>
                  <p className="text-xs text-zinc-500">{exam.category} • {exam.questions?.length || 0} Questions</p>
                </div>
                <button className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg">Start</button>
              </div>
            )) : (
              <p className="text-zinc-400 text-sm italic">No upcoming exams.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

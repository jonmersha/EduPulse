import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { BookOpen, GraduationCap, Trophy } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { CourseCard } from '../components/CourseCard';
import { motion } from 'motion/react';

interface MyCoursesProps {
  onSelectCourse: (id: string) => void;
  onSelectExam: (id: string) => void;
}

export const MyCourses: React.FC<MyCoursesProps> = ({ onSelectCourse, onSelectExam }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'exams'>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setCourses([]);
      setExams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const enrollmentData = snapshot.docs.map(doc => doc.data());
      
      const courseEnrollments = enrollmentData.filter(e => e.courseId);
      const examEnrollments = enrollmentData.filter(e => e.examId);

      // Fetch course details
      const coursePromises = courseEnrollments.map(async (enrollment) => {
        try {
          const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
          if (courseDoc.exists()) {
            return { id: courseDoc.id, ...courseDoc.data(), progress: enrollment.progress };
          }
        } catch (error) {
          console.error("Error fetching course details:", error);
        }
        return null;
      });

      // Fetch exam details
      const examPromises = examEnrollments.map(async (enrollment) => {
        try {
          const examDoc = await getDoc(doc(db, 'exams', enrollment.examId));
          if (examDoc.exists()) {
            const resultDoc = await getDoc(doc(db, 'examResults', `${profile.uid}_${examDoc.id}`));
            return { id: examDoc.id, ...examDoc.data(), result: resultDoc.exists() ? resultDoc.data() : null };
          }
        } catch (error) {
          console.error("Error fetching exam details:", error);
        }
        return null;
      });

      const [courseDetails, examDetails] = await Promise.all([
        Promise.all(coursePromises),
        Promise.all(examPromises)
      ]);

      setCourses(courseDetails.filter(c => c !== null));
      setExams(examDetails.filter(e => e !== null));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-80 bg-zinc-100 animate-pulse rounded-[2rem]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900">My Learning</h1>
          </div>
          <p className="text-zinc-500 font-medium ml-13">Track your progress and continue your journey.</p>
        </div>
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl self-start shadow-inner">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'courses' ? 'bg-white shadow-xl text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'exams' ? 'bg-white shadow-xl text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Exams ({exams.length})
          </button>
        </div>
      </header>

      {activeTab === 'courses' ? (
        courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl">
              <BookOpen className="w-12 h-12 text-zinc-200" />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">No courses yet</h2>
            <p className="text-zinc-500 mt-4 max-w-sm font-medium">You haven't enrolled in any courses. Explore the marketplace to start learning!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {courses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course} 
                onClick={() => onSelectCourse(course.id)}
                progress={course.progress || 0}
              />
            ))}
          </div>
        )
      ) : (
        exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl">
              <Trophy className="w-12 h-12 text-zinc-200" />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">No exams yet</h2>
            <p className="text-zinc-500 mt-4 max-w-sm font-medium">You haven't subscribed to any exams. Explore the marketplace to find exams!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {exams.map((exam) => (
              <div 
                key={exam.id} 
                onClick={() => onSelectExam(exam.id)}
                className="group bg-white border border-black/5 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col h-full"
              >
                <div className="aspect-video bg-zinc-900 relative flex items-center justify-center overflow-hidden">
                  <Trophy className="w-16 h-16 text-zinc-700 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors" />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg tracking-widest">Exam</span>
                    <span className="px-3 py-1 bg-zinc-50 text-zinc-500 text-[10px] font-black uppercase rounded-lg tracking-widest">{exam.category}</span>
                  </div>
                  <h3 className="font-black text-2xl leading-tight mb-6 line-clamp-2 group-hover:text-emerald-600 transition-colors">{exam.title}</h3>
                  
                  <div className="mt-auto">
                    {exam.result ? (
                      <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Completed</span>
                          <span className="text-lg font-black text-emerald-600">{exam.result.score.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${exam.result.score}%` }}
                            className="bg-emerald-600 h-full shadow-[0_0_10px_rgba(5,150,105,0.3)]" 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 text-center group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-all">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">Start Exam</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

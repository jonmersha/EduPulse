import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { BookOpen } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

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
    if (!profile) return;

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
            // Check if there's a result
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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));

    return () => unsubscribe();
  }, [profile]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-64 bg-zinc-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Learning</h1>
          <p className="text-zinc-500 mt-1">Continue where you left off.</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'courses' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'exams' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Exams ({exams.length})
          </button>
        </div>
      </header>

      {activeTab === 'courses' ? (
        courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-zinc-300" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">No courses yet</h2>
            <p className="text-zinc-500 mt-2 max-w-xs">You haven't enrolled in any courses. Explore the marketplace to start learning!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <div 
                key={course.id} 
                onClick={() => onSelectCourse(course.id)}
                className="group bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-video bg-zinc-100 relative">
                  <img 
                    src={`https://picsum.photos/seed/${course.id}/800/450`} 
                    alt={course.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md">{course.category}</span>
                  </div>
                  <h3 className="font-bold text-lg leading-tight mb-4 line-clamp-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                  
                  <div className="mt-auto">
                    <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mb-2">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${course.progress || 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      <span>{course.progress || 0}% Complete</span>
                      <span>By {course.teacherName}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-zinc-300" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">No exams yet</h2>
            <p className="text-zinc-500 mt-2 max-w-xs">You haven't subscribed to any exams. Explore the marketplace to find exams!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id} 
                onClick={() => onSelectExam(exam.id)}
                className="group bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-video bg-zinc-900 relative flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-zinc-700" />
                  <div className="absolute inset-0 bg-emerald-500/10" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-md">Exam</span>
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase rounded-md">{exam.category}</span>
                  </div>
                  <h3 className="font-bold text-lg leading-tight mb-4 line-clamp-2 group-hover:text-emerald-600 transition-colors">{exam.title}</h3>
                  
                  <div className="mt-auto">
                    {exam.result ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Completed</span>
                          <span className="text-sm font-black text-emerald-600">{exam.result.score.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-emerald-200 h-1 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full" style={{ width: `${exam.result.score}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ready to Start</span>
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

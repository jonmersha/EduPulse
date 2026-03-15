import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface MarketplaceProps {
  onSelectCourse: (id: string) => void;
  onSelectExam: (id: string) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectCourse, onSelectExam }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'exams'>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [enrolledExamIds, setEnrolledExamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch public courses
    const coursesQuery = query(collection(db, 'courses'), where('isPublic', '==', true));
    const unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));

    // Fetch public exams
    const examsQuery = query(collection(db, 'exams'), where('isPublic', '==', true));
    const unsubExams = onSnapshot(examsQuery, (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'exams'));

    // Fetch user's enrolled items
    if (profile) {
      const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
      const unsubEnroll = onSnapshot(enrollQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        setEnrolledCourseIds(data.filter(d => d.courseId).map(d => d.courseId));
        setEnrolledExamIds(data.filter(d => d.examId).map(d => d.examId));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));
      return () => {
        unsubCourses();
        unsubExams();
        unsubEnroll();
      };
    }

    return () => {
      unsubCourses();
      unsubExams();
    };
  }, [profile]);

  const handleEnroll = async (item: any, type: 'course' | 'exam') => {
    if (!profile) return;
    try {
      const enrollmentId = `${profile.uid}_${item.id}`;
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        studentId: profile.uid,
        [type === 'course' ? 'courseId' : 'examId']: item.id,
        title: item.title,
        enrolledAt: Timestamp.now(),
        progress: 0,
        status: 'active',
        paymentVerified: item.price === 0, // Auto-verify if free
        type: type
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `enrollments/${profile.uid}_${item.id}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-zinc-500 mt-1">Explore public courses and exams from top educators.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['All', 'Math', 'Science', 'Programming', 'Languages', 'Art'].map((cat) => (
            <button 
              key={cat}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                cat === 'All' ? "bg-zinc-900 text-white" : "bg-white border border-black/5 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="flex gap-4 border-b border-black/5 pb-4">
        <button 
          onClick={() => setActiveTab('courses')}
          className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'courses' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
        >
          Courses
        </button>
        <button 
          onClick={() => setActiveTab('exams')}
          className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'exams' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
        >
          Exams
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-zinc-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(activeTab === 'courses' ? courses : exams).map((item) => (
            <div key={item.id} className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="aspect-video bg-zinc-100 relative">
                <img 
                  src={`https://picsum.photos/seed/${item.id}/800/450`} 
                  alt={item.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-bold shadow-sm">
                  {item.price > 0 ? `$${item.price}` : 'FREE'}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase rounded-md",
                    activeTab === 'courses' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {activeTab === 'courses' ? item.category || 'General' : 'Exam'}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">By {item.teacherName}</span>
                </div>
                <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-zinc-500 line-clamp-2 mb-4 flex-1">{item.description}</p>
                
                {(activeTab === 'courses' ? enrolledCourseIds : enrolledExamIds).includes(item.id) ? (
                  <button 
                    onClick={() => activeTab === 'courses' ? onSelectCourse(item.id) : onSelectExam(item.id)}
                    className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                  >
                    {activeTab === 'courses' ? 'Open Course' : 'Open Exam'}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleEnroll(item, activeTab === 'courses' ? 'course' : 'exam')}
                    className={cn(
                      "w-full py-3 text-white rounded-xl font-bold transition-all shadow-lg",
                      activeTab === 'courses' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                    )}
                  >
                    {item.price > 0 ? 'Buy Now' : 'Enroll Now'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface MarketplaceProps {
  onSelectCourse: (id: string) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectCourse }) => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch public courses
    const q = query(collection(db, 'courses'), where('isPublic', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch user's enrolled courses to show "Open" instead of "Enroll"
    if (profile) {
      const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
      const unsubEnroll = onSnapshot(enrollQuery, (snapshot) => {
        setEnrolledCourseIds(snapshot.docs.map(doc => doc.data().courseId));
      });
      return () => {
        unsubscribe();
        unsubEnroll();
      };
    }

    return () => unsubscribe();
  }, [profile]);

  const handleEnroll = async (course: any) => {
    if (!profile) return;
    try {
      await setDoc(doc(db, 'enrollments', `${profile.uid}_${course.id}`), {
        studentId: profile.uid,
        courseId: course.id,
        courseTitle: course.title,
        enrolledAt: Timestamp.now(),
        progress: 0
      });
    } catch (error) {
      console.error("Enrollment failed:", error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Marketplace</h1>
          <p className="text-zinc-500 mt-1">Explore public courses from top educators worldwide.</p>
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-zinc-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="aspect-video bg-zinc-100 relative">
                <img 
                  src={`https://picsum.photos/seed/${course.id}/800/450`} 
                  alt={course.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-bold shadow-sm">
                  {course.price > 0 ? `$${course.price}` : 'FREE'}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md">{course.category}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">By {course.teacherName}</span>
                </div>
                <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                <p className="text-sm text-zinc-500 line-clamp-2 mb-4 flex-1">{course.description}</p>
                
                {enrolledCourseIds.includes(course.id) ? (
                  <button 
                    onClick={() => onSelectCourse(course.id)}
                    className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                  >
                    Open Course
                  </button>
                ) : (
                  <button 
                    onClick={() => handleEnroll(course)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    Enroll Now
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

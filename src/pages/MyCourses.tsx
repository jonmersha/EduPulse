import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { BookOpen } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface MyCoursesProps {
  onSelectCourse: (id: string) => void;
}

export const MyCourses: React.FC<MyCoursesProps> = ({ onSelectCourse }) => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const enrollmentData = snapshot.docs.map(doc => doc.data());
      
      if (enrollmentData.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Fetch course details for each enrollment
      const coursePromises = enrollmentData.map(async (enrollment) => {
        const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
        return { id: courseDoc.id, ...courseDoc.data(), progress: enrollment.progress };
      });

      const courseDetails = await Promise.all(coursePromises);
      setCourses(courseDetails);
      setLoading(false);
    });

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

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
          <BookOpen className="w-10 h-10 text-zinc-300" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">No courses yet</h2>
        <p className="text-zinc-500 mt-2 max-w-xs">You haven't enrolled in any courses. Explore the marketplace to start learning!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Learning</h1>
        <p className="text-zinc-500 mt-1">Continue where you left off.</p>
      </header>

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
    </div>
  );
};

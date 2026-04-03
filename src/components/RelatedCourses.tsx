import React, { useState, useEffect } from 'react';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { BookOpen } from 'lucide-react';

interface RelatedCoursesProps {
  courseId: string;
  category: string;
}

export const RelatedCourses: React.FC<RelatedCoursesProps> = ({ courseId, category }) => {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'courses'),
      where('category', '==', category),
      where('isPublic', '==', true),
      limit(3)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => c.id !== courseId));
    });
    return () => unsubscribe();
  }, [courseId, category]);

  if (courses.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="font-black text-zinc-900 dark:text-white uppercase tracking-widest text-sm flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-emerald-600" />
        Related Courses
      </h3>
      <div className="grid grid-cols-1 gap-4">
        {courses.map(course => (
          <div key={course.id} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl hover:shadow-xl transition-all">
            <h4 className="font-bold text-zinc-900 dark:text-white text-base">{course.title}</h4>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-1">{course.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

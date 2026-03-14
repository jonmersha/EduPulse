import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, Timestamp } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { CourseCard } from '../components/CourseCard';
import { LessonEditor } from '../components/LessonEditor';

export const CourseManagement: React.FC = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', category: 'General', isPublic: false, price: 0 });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'courses'), where('teacherId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const courseId = doc(collection(db, 'courses')).id;
    await setDoc(doc(db, 'courses', courseId), {
      ...newCourse,
      teacherId: profile.uid,
      teacherName: profile.displayName,
      createdAt: Timestamp.now()
    });
    setShowCreate(false);
    setNewCourse({ title: '', description: '', category: 'General', isPublic: false, price: 0 });
  };

  if (editingCourse) {
    return <LessonEditor courseId={editingCourse} onBack={() => setEditingCourse(null)} />;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teaching Dashboard</h1>
          <p className="text-zinc-500 mt-1">Manage your courses and student progress.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Create Course
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} onClick={() => setEditingCourse(course.id)} />
        ))}
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-black/5"
            >
              <h2 className="text-2xl font-bold mb-6">Create New Course</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Course Title</label>
                  <input 
                    required
                    value={newCourse.title}
                    onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g. Introduction to Biology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Description</label>
                  <textarea 
                    value={newCourse.description}
                    onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-24"
                    placeholder="What will students learn?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Category</label>
                    <select 
                      value={newCourse.category}
                      onChange={e => setNewCourse({...newCourse, category: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option>General</option>
                      <option>Math</option>
                      <option>Science</option>
                      <option>Programming</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Price ($)</label>
                    <input 
                      type="number"
                      value={newCourse.price}
                      onChange={e => setNewCourse({...newCourse, price: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox"
                    checked={newCourse.isPublic}
                    onChange={e => setNewCourse({...newCourse, isPublic: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label className="text-sm font-medium text-zinc-600">Publish to Marketplace</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

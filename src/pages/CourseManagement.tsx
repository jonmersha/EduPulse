import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, Timestamp } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { CourseCard } from '../components/CourseCard';
import { LessonEditor } from '../components/LessonEditor';
import { ExamEditor } from '../components/ExamEditor';

export const CourseManagement: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'exams'>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editingExam, setEditingExam] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', category: 'General', isPublic: false, price: 0 });
  const [newExam, setNewExam] = useState({ title: '', description: '', duration: 60, passingScore: 70, isPublic: false, price: 0 });

  useEffect(() => {
    if (!profile) return;
    
    const coursesQuery = query(collection(db, 'courses'), where('teacherId', '==', profile.uid));
    const unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const examsQuery = query(collection(db, 'exams'), where('teacherId', '==', profile.uid));
    const unsubExams = onSnapshot(examsQuery, (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubCourses();
      unsubExams();
    };
  }, [profile]);

  const handleCreateCourse = async (e: React.FormEvent) => {
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

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const examId = doc(collection(db, 'exams')).id;
    await setDoc(doc(db, 'exams', examId), {
      ...newExam,
      teacherId: profile.uid,
      teacherName: profile.displayName,
      questions: [],
      createdAt: Timestamp.now()
    });
    setShowCreate(false);
    setNewExam({ title: '', description: '', duration: 60, passingScore: 70, isPublic: false, price: 0 });
  };

  if (editingCourse) {
    return <LessonEditor courseId={editingCourse} onBack={() => setEditingCourse(null)} />;
  }

  if (editingExam) {
    return <ExamEditor examId={editingExam} onBack={() => setEditingExam(null)} />;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teaching Dashboard</h1>
          <p className="text-zinc-500 mt-1">Manage your courses, exams, and student progress.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Create {activeTab === 'courses' ? 'Course' : 'Exam'}
        </button>
      </header>

      <div className="flex gap-4 border-b border-black/5 pb-4">
        <button 
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'courses' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
        >
          Courses
        </button>
        <button 
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'exams' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
        >
          Exams
        </button>
      </div>

      {activeTab === 'courses' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} onClick={() => setEditingCourse(course.id)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {exams.map(exam => (
            <div 
              key={exam.id} 
              onClick={() => setEditingExam(exam.id)}
              className="bg-white border border-black/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-md">Exam</span>
                <span className="text-xs font-bold text-zinc-400">{exam.duration}m</span>
              </div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors">{exam.title}</h3>
              <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{exam.description}</p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5">
                <span className="text-sm font-bold">{exam.price > 0 ? `$${exam.price}` : 'FREE'}</span>
                <span className="text-xs font-bold text-blue-600 group-hover:underline">Edit Questions</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-black/5"
            >
              <h2 className="text-2xl font-bold mb-6">Create New {activeTab === 'courses' ? 'Course' : 'Exam'}</h2>
              <form onSubmit={activeTab === 'courses' ? handleCreateCourse : handleCreateExam} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Title</label>
                  <input 
                    required
                    value={activeTab === 'courses' ? newCourse.title : newExam.title}
                    onChange={e => activeTab === 'courses' ? setNewCourse({...newCourse, title: e.target.value}) : setNewExam({...newExam, title: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Description</label>
                  <textarea 
                    value={activeTab === 'courses' ? newCourse.description : newExam.description}
                    onChange={e => activeTab === 'courses' ? setNewCourse({...newCourse, description: e.target.value}) : setNewExam({...newExam, description: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-24"
                  />
                </div>
                
                {activeTab === 'courses' ? (
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
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Duration (min)</label>
                      <input 
                        type="number"
                        value={newExam.duration}
                        onChange={e => setNewExam({...newExam, duration: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Price ($)</label>
                      <input 
                        type="number"
                        value={newExam.price}
                        onChange={e => setNewExam({...newExam, price: parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox"
                    checked={activeTab === 'courses' ? newCourse.isPublic : newExam.isPublic}
                    onChange={e => activeTab === 'courses' ? setNewCourse({...newCourse, isPublic: e.target.checked}) : setNewExam({...newExam, isPublic: e.target.checked})}
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

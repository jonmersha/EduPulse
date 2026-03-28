import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { CourseCard } from '../components/CourseCard';
import { LessonEditor } from '../components/LessonEditor';
import { ExamEditor } from '../components/ExamEditor';
import { Modal } from '../components/Modal';

export const CourseManagement: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'exams' | 'results'>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', category: 'General', isPublic: false, price: 0 });
  const [newExam, setNewExam] = useState({ title: '', description: '', duration: 60, passingScore: 70, isPublic: false, price: 0, maxAttempts: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'course' | 'exam' } | null>(null);
  const [selectedExamSummary, setSelectedExamSummary] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;
    
    const coursesQuery = query(collection(db, 'courses'), where('teacherId', '==', profile.uid));
    const unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const examsQuery = query(collection(db, 'exams'), where('teacherId', '==', profile.uid));
    const unsubExams = onSnapshot(examsQuery, (snapshot) => {
      const examData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExams(examData);

      // Fetch results for these exams
      if (examData.length > 0) {
        const examIds = examData.map(e => e.id);
        // Firestore 'in' query is limited to 10 items
        const resultsQuery = query(collection(db, 'examResults'), where('examId', 'in', examIds.slice(0, 10)));
        const unsubResults = onSnapshot(resultsQuery, (resultsSnapshot) => {
          setStudentResults(resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubResults();
      }
    });

    return () => {
      unsubCourses();
      unsubExams();
    };
  }, [profile]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const courseId = editingItem?.id || doc(collection(db, 'courses')).id;
      await setDoc(doc(db, 'courses', courseId), {
        ...newCourse,
        teacherId: profile.uid,
        teacherName: profile.displayName,
        createdAt: editingItem?.createdAt || Timestamp.now()
      }, { merge: true });
      setShowCreate(false);
      setEditingItem(null);
      setNewCourse({ title: '', description: '', category: 'General', isPublic: false, price: 0 });
    } catch (error) {
      console.error("Error saving course:", error);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const examId = editingItem?.id || doc(collection(db, 'exams')).id;
      await setDoc(doc(db, 'exams', examId), {
        ...newExam,
        teacherId: profile.uid,
        teacherName: profile.displayName,
        questions: editingItem?.questions || [],
        createdAt: editingItem?.createdAt || Timestamp.now()
      }, { merge: true });
      setShowCreate(false);
      setEditingItem(null);
      setNewExam({ title: '', description: '', duration: 60, passingScore: 70, isPublic: false, price: 0, maxAttempts: 0 });
    } catch (error) {
      console.error("Error saving exam:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const collectionName = deleteConfirm.type === 'course' ? 'courses' : 'exams';
      await deleteDoc(doc(db, collectionName, deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error(`Error deleting ${deleteConfirm.type}:`, error);
    }
  };

  const startEditCourse = (course: any) => {
    setEditingItem(course);
    setNewCourse({
      title: course.title,
      description: course.description,
      category: course.category || 'General',
      isPublic: course.isPublic || false,
      price: course.price || 0
    });
    setShowCreate(true);
  };

  const startEditExam = (exam: any) => {
    setEditingItem(exam);
    setNewExam({
      title: exam.title,
      description: exam.description,
      duration: exam.duration || 60,
      passingScore: exam.passingScore || 70,
      isPublic: exam.isPublic || false,
      price: exam.price || 0,
      maxAttempts: exam.maxAttempts || 0
    });
    setShowCreate(true);
  };

  const getExamSummary = (examId: string) => {
    const results = studentResults.filter(r => r.examId === examId);
    if (results.length === 0) return null;

    const avgScore = results.reduce((acc, curr) => acc + curr.score, 0) / results.length;
    const passCount = results.filter(r => r.score >= (exams.find(e => e.id === examId)?.passingScore || 70)).length;
    const passRate = (passCount / results.length) * 100;

    return {
      avgScore,
      passRate,
      totalAttempts: results.length,
      uniqueStudents: new Set(results.map(r => r.studentId)).size
    };
  };

  if (editingCourseId) {
    return <LessonEditor courseId={editingCourseId} onBack={() => setEditingCourseId(null)} />;
  }

  if (editingExamId) {
    return <ExamEditor examId={editingExamId} onBack={() => setEditingExamId(null)} />;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teaching Dashboard</h1>
          <p className="text-zinc-500 mt-1">Manage your courses, exams, and student progress.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setShowCreate(true); }}
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
        <button 
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'results' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
        >
          Results
        </button>
      </div>

      {activeTab === 'courses' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map(course => (
            <div key={course.id} className="relative group">
              <CourseCard course={course} onClick={() => setEditingCourseId(course.id)} />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); startEditCourse(course); }}
                  className="p-2 bg-white/90 backdrop-blur-sm text-zinc-600 rounded-lg hover:text-emerald-600 shadow-sm"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: course.id, type: 'course' }); }}
                  className="p-2 bg-white/90 backdrop-blur-sm text-zinc-600 rounded-lg hover:text-red-600 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'exams' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {exams.map(exam => (
            <div 
              key={exam.id} 
              className="bg-white border border-black/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer relative"
              onClick={() => setEditingExamId(exam.id)}
            >
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); startEditExam(exam); }}
                  className="p-2 bg-zinc-100 text-zinc-600 rounded-lg hover:text-blue-600"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: exam.id, type: 'exam' }); }}
                  className="p-2 bg-zinc-100 text-zinc-600 rounded-lg hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-md">Exam</span>
                <span className="text-xs font-bold text-zinc-400">{exam.duration}m</span>
              </div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors">{exam.title}</h3>
              <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{exam.description}</p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{exam.price > 0 ? `$${exam.price}` : 'FREE'}</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">{exam.maxAttempts > 0 ? `${exam.maxAttempts} Attempts` : 'Unlimited'}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedExamSummary(exam); }}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-900"
                  >
                    Summary
                  </button>
                  <span className="text-xs font-bold text-blue-600 group-hover:underline">Edit Questions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-black/5 rounded-[2rem] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-black/5">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Exam</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {studentResults.length > 0 ? studentResults.map((result) => (
                <tr key={result.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-zinc-900">{result.studentName}</div>
                    <div className="text-xs text-zinc-500">{result.studentId.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-700">{result.examTitle || 'Unknown Exam'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-lg font-black ${result.score >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {result.score.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {new Date(result.completedAt?.toMillis()).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      result.score >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {result.score >= 70 ? 'Passed' : 'Failed'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">
                    No student results found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!selectedExamSummary}
        onClose={() => setSelectedExamSummary(null)}
        title={`Exam Summary: ${selectedExamSummary?.title}`}
      >
        {selectedExamSummary && (
          <div className="space-y-6">
            {getExamSummary(selectedExamSummary.id) ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Avg Score</p>
                    <p className="text-2xl font-black text-emerald-600">{getExamSummary(selectedExamSummary.id)?.avgScore.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Pass Rate</p>
                    <p className="text-2xl font-black text-blue-600">{getExamSummary(selectedExamSummary.id)?.passRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Attempts</p>
                    <p className="text-2xl font-black">{getExamSummary(selectedExamSummary.id)?.totalAttempts}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Unique Students</p>
                    <p className="text-2xl font-black">{getExamSummary(selectedExamSummary.id)?.uniqueStudents}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-black/5">
                  <h4 className="text-sm font-bold text-zinc-900 mb-3">Recent Performance</h4>
                  <div className="space-y-2">
                    {studentResults
                      .filter(r => r.examId === selectedExamSummary.id)
                      .sort((a, b) => (b.completedAt?.toMillis() || 0) - (a.completedAt?.toMillis() || 0))
                      .slice(0, 5)
                      .map(result => (
                        <div key={result.id} className="flex items-center justify-between text-sm p-2 hover:bg-zinc-50 rounded-lg">
                          <span className="font-medium">{result.studentName}</span>
                          <span className={`font-bold ${result.score >= (selectedExamSummary.passingScore || 70) ? 'text-emerald-600' : 'text-red-600'}`}>
                            {result.score.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-zinc-400 italic">
                No students have taken this exam yet.
              </div>
            )}
            <button 
              onClick={() => setSelectedExamSummary(null)}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all"
            >
              Close
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={`Delete ${deleteConfirm?.type === 'course' ? 'Course' : 'Exam'}`}
      >
        <div className="space-y-4">
          <p className="text-zinc-600">Are you sure you want to delete this {deleteConfirm?.type}? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-black/5"
            >
            <h2 className="text-2xl font-bold mb-6">{editingItem ? 'Edit' : 'Create New'} {activeTab === 'courses' ? 'Course' : 'Exam'}</h2>
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
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Max Attempts (0 for unlimited)</label>
                      <input 
                        type="number"
                        min="0"
                        value={newExam.maxAttempts}
                        onChange={e => setNewExam({...newExam, maxAttempts: parseInt(e.target.value)})}
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
                    onClick={() => { setShowCreate(false); setEditingItem(null); }}
                    className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    {editingItem ? 'Save Changes' : 'Create'}
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

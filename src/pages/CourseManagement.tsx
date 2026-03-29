import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, Settings, Search, Filter, BookOpen, Trophy, Users, Eye, CheckCircle, Clock, LayoutDashboard, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { CourseCard } from '../components/CourseCard';
import { LessonEditor } from '../components/LessonEditor';
import { ExamEditor } from '../components/ExamEditor';
import { Modal } from '../components/Modal';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const CourseManagement: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'exams' | 'results' | 'enrollments'>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', category: 'General', isPublic: false, price: 0 });
  const [newExam, setNewExam] = useState({ title: '', description: '', duration: 60, passingScore: 70, isPublic: false, price: 0, maxAttempts: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'course' | 'exam' } | null>(null);
  const [selectedExamSummary, setSelectedExamSummary] = useState<any>(null);

  useEffect(() => {
    if (!profile) {
      setCourses([]);
      setExams([]);
      setStudentResults([]);
      return;
    }
    
    const coursesQuery = query(collection(db, 'courses'), where('teacherId', '==', profile.uid));
    const unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));

    const examsQuery = query(collection(db, 'exams'), where('teacherId', '==', profile.uid));
    const unsubExams = onSnapshot(examsQuery, (snapshot) => {
      const examData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExams(examData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'exams'));

    return () => {
      unsubCourses();
      unsubExams();
    };
  }, [profile]);

  useEffect(() => {
    if (!profile || exams.length === 0) {
      setStudentResults([]);
      return;
    }

    const examIds = exams.map(e => e.id);
    // Firestore 'in' query is limited to 10 items
    // If there are more than 10 exams, we might need multiple queries or a different approach
    // For now, let's stick to the first 10 as per original logic but in a separate effect
    const resultsQuery = query(
      collection(db, 'examResults'), 
      where('examId', 'in', examIds.slice(0, 10))
    );

    const unsubResults = onSnapshot(resultsQuery, (resultsSnapshot) => {
      setStudentResults(resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'examResults'));

    return () => unsubResults();
  }, [profile, exams]);

  useEffect(() => {
    if (!profile) {
      setEnrollmentRequests([]);
      return;
    }

    const enrollQuery = query(
      collection(db, 'enrollments'),
      where('teacherId', '==', profile.uid)
    );

    const unsubEnroll = onSnapshot(enrollQuery, (snapshot) => {
      setEnrollmentRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));

    return () => unsubEnroll();
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

  const handleEnrollmentAction = async (requestId: string, status: 'approved' | 'denied') => {
    try {
      await setDoc(doc(db, 'enrollments', requestId), { status }, { merge: true });
    } catch (error) {
      console.error("Error updating enrollment status:", error);
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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Instructor Dashboard</h1>
          <p className="text-zinc-500 mt-1 font-medium">Create, manage, and track your educational content.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setEditingItem(null); setShowCreate(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-zinc-200"
          >
            <Plus className="w-5 h-5" />
            New {activeTab === 'courses' ? 'Course' : 'Exam'}
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 w-fit rounded-2xl">
        {[
          { id: 'courses', label: 'My Courses', count: courses.length },
          { id: 'exams', label: 'Exams', count: exams.length },
          { id: 'results', label: 'Student Results', count: studentResults.length },
          { id: 'enrollments', label: 'Student Enrollments', count: enrollmentRequests.length }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === tab.id ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            {tab.label}
            <span className={cn(
              "px-1.5 py-0.5 rounded-md text-[10px] font-black",
              activeTab === tab.id ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400" : "bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-400"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'courses' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map(course => (
                <div key={course.id} className="relative group">
                  <CourseCard course={course} onClick={() => setEditingCourseId(course.id)} />
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditCourse(course); }}
                      className="p-2.5 bg-white text-zinc-600 rounded-xl hover:text-emerald-600 shadow-xl border border-black/5"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: course.id, type: 'course' }); }}
                      className="p-2.5 bg-white text-zinc-600 rounded-xl hover:text-red-600 shadow-xl border border-black/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => { setEditingItem(null); setShowCreate(true); }}
                className="aspect-[4/5] border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-zinc-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-emerald-100">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Create New Course</span>
              </button>
            </div>
          ) : activeTab === 'exams' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {exams.map(exam => (
                <div 
                  key={exam.id} 
                  className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group cursor-pointer relative flex flex-col"
                  onClick={() => setEditingExamId(exam.id)}
                >
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditExam(exam); }}
                      className="p-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg hover:text-blue-600"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: exam.id, type: 'exam' }); }}
                      className="p-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-lg tracking-wider">Exam</span>
                    <span className="text-xs font-bold text-zinc-400">{exam.duration}m</span>
                  </div>
                  <h3 className="font-bold text-xl mb-2 group-hover:text-blue-600 transition-colors leading-tight dark:text-white">{exam.title}</h3>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-6 flex-1">{exam.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-zinc-900 dark:text-white">{exam.price > 0 ? `$${exam.price}` : 'FREE'}</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">{exam.maxAttempts > 0 ? `${exam.maxAttempts} Attempts` : 'Unlimited'}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedExamSummary(exam); }}
                      className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Stats
                    </button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => { setEditingItem(null); setShowCreate(true); }}
                className="aspect-[4/5] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-zinc-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-blue-100">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Create New Exam</span>
              </button>
            </div>
          ) : activeTab === 'results' ? (
            <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-black/5 dark:border-white/5">
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Student</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Exam</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Score</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {studentResults.length > 0 ? studentResults.map((result) => (
                      <tr key={result.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                              {result.studentName?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-white">{result.studentName}</div>
                              <div className="text-[10px] text-zinc-400 font-medium tracking-tight uppercase">{result.studentId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-zinc-700 dark:text-zinc-300">{result.examTitle || 'Unknown Exam'}</div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className={`text-xl font-black ${result.score >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {result.score.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-zinc-500">
                          {new Date(result.completedAt?.toMillis()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            result.score >= 70 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            {result.score >= 70 ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-2 text-zinc-400">
                            <Users className="w-8 h-8 opacity-20" />
                            <p className="italic font-medium">No student results found yet.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-black/5 dark:border-white/5">
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Student</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Course/Exam</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {enrollmentRequests.length > 0 ? enrollmentRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                              {req.studentName?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-white">{req.studentName}</div>
                              <div className="text-[10px] text-zinc-400 font-medium tracking-tight uppercase">{req.studentId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-zinc-700 dark:text-zinc-300">{req.title}</div>
                          <div className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{req.type}</div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-zinc-500">
                          {new Date(req.enrolledAt?.toMillis()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === 'pending' ? (
                              <>
                                <button 
                                  onClick={() => handleEnrollmentAction(req.id, 'approved')}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleEnrollmentAction(req.id, 'denied')}
                                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                                >
                                  Deny
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider",
                                  req.status === 'approved' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                                )}>
                                  {req.status}
                                </span>
                                <button 
                                  onClick={() => handleEnrollmentAction(req.id, req.status === 'approved' ? 'denied' : 'approved')}
                                  className="text-[10px] font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest underline underline-offset-4"
                                >
                                  Change to {req.status === 'approved' ? 'Denied' : 'Approved'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-2 text-zinc-400">
                            <Clock className="w-8 h-8 opacity-20" />
                            <p className="italic font-medium">No enrollments found.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

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

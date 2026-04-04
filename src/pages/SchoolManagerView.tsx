import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, Plus, BookOpen, UserPlus, Trash2, Upload, CheckCircle2, AlertCircle, DollarSign, Search } from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, Timestamp, where, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import Papa from 'papaparse';

export const SchoolManagerView: React.FC = () => {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'classes' | 'users' | 'courses' | 'exams' | 'payments'>('classes');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [addStudentOptionsContext, setAddStudentOptionsContext] = useState<{classId?: string} | null>(null);
  const [bulkUploadContext, setBulkUploadContext] = useState<{classId?: string} | null>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState('');
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkUploadRole, setBulkUploadRole] = useState<'student' | 'teacher'>('student');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newClass, setNewClass] = useState({ name: '', grade: '', year: '', teacherId: '', schoolId: '' });
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'student' as any, classId: '', specialization: '', schoolId: '', isIndependent: false });
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    if (!profile?.schoolId) return;

    const currentSchoolId = profile.schoolId;
    
    const classesQuery = query(collection(db, 'classes'), where('schoolId', '==', currentSchoolId));
    const unsubClasses = onSnapshot(classesQuery, (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));

    const usersQuery = query(collection(db, 'users'), where('schoolId', '==', currentSchoolId));
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const coursesQuery = query(collection(db, 'courses'), where('schoolId', '==', currentSchoolId));
    const unsubCourses = onSnapshot(coursesQuery, (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));

    const examsQuery = query(collection(db, 'exams'), where('schoolId', '==', currentSchoolId));
    const unsubExams = onSnapshot(examsQuery, (snap) => {
      setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'exams'));

    const unsubEnrollments = onSnapshot(collectionGroup(db, 'enrollments'), (snap) => {
      const schoolCourseIds = courses.map(c => c.id);
      setEnrollments(snap.docs
        .map(doc => ({ id: doc.id, courseId: doc.ref.parent.parent?.id, ...doc.data() }))
        .filter(e => schoolCourseIds.includes(e.courseId))
      );
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));

    return () => {
      unsubClasses();
      unsubUsers();
      unsubCourses();
      unsubExams();
      unsubEnrollments();
    };
  }, [profile, courses.length]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const schoolId = profile?.schoolId;
      if (!schoolId) return;
      
      const classId = editingItem?.id || doc(collection(db, 'classes')).id;
      await setDoc(doc(db, 'classes', classId), {
        ...newClass,
        schoolId: schoolId,
        createdAt: editingItem?.createdAt || Timestamp.now()
      }, { merge: true });
      setShowAddModal(false);
      setEditingItem(null);
      setNewClass({ name: '', grade: '', year: '', teacherId: '', schoolId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `classes/${editingItem?.id || 'new'}`);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const schoolId = profile?.schoolId;
      const userId = editingItem?.id || doc(collection(db, 'users')).id; 
      await setDoc(doc(db, 'users', userId), {
        ...newUser,
        schoolId: schoolId,
        status: 'active',
        uid: editingItem?.uid || userId,
        createdAt: editingItem?.createdAt || Timestamp.now()
      }, { merge: true });
      setShowAddModal(false);
      setEditingItem(null);
      setNewUser({ email: '', displayName: '', role: 'student', classId: '', specialization: '', schoolId: '', isIndependent: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${editingItem?.id || 'new'}`);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ collection: string, id: string } | null>(null);

  const handleDelete = async (collectionName: string, id: string) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, collectionName, id));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    if (activeSubTab === 'classes') setNewClass({ name: item.name, grade: item.grade, year: item.year || '', teacherId: item.teacherId || '', schoolId: item.schoolId || '' });
    if (activeSubTab === 'users') setNewUser({ email: item.email, displayName: item.displayName, role: item.role, classId: item.classId || '', specialization: item.specialization || '', schoolId: item.schoolId || '', isIndependent: item.isIndependent || false });
    setShowAddModal(true);
  };

  const openAddUserModal = (role?: 'student' | 'teacher' | 'admin', classId?: string) => {
    setEditingItem(null);
    setNewUser({ 
      email: '', 
      displayName: '', 
      role: role || 'student', 
      classId: classId || '', 
      specialization: '', 
      schoolId: profile?.schoolId || '', 
      isIndependent: false
    });
    setShowAddModal(true);
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile || !profile?.schoolId) return;
    
    setBulkUploadStatus('Parsing file...');
    setBulkUploadProgress(0);
    
    Papa.parse(bulkUploadFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        if (data.length === 0) {
          setBulkUploadStatus('Error: File is empty or invalid.');
          return;
        }
        
        const headers = Object.keys(data[0]).map(h => h.toLowerCase());
        if (!headers.includes('email') || !headers.includes('name')) {
          setBulkUploadStatus('Error: CSV must contain "email" and "name" columns.');
          return;
        }
        
        setBulkUploadStatus(`Found ${data.length} users. Uploading...`);
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email');
          const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
          const classKey = Object.keys(row).find(k => k.toLowerCase() === 'class');
          const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
          
          if (!emailKey || !nameKey || !row[emailKey] || !row[nameKey]) {
            errorCount++;
            continue;
          }
          
          try {
            let classId = '';
            if (bulkUploadRole === 'student') {
               if (bulkUploadContext?.classId) {
                 classId = bulkUploadContext.classId;
               } else if (classKey && row[classKey] && yearKey && row[yearKey]) {
                 const matchedClass = classes.find(c => c.name.toLowerCase() === row[classKey].toLowerCase() && c.year === row[yearKey]);
                 if (matchedClass) classId = matchedClass.id;
               }
            }
            
            const userId = doc(collection(db, 'users')).id;
            await setDoc(doc(db, 'users', userId), {
              email: row[emailKey].trim(),
              displayName: row[nameKey].trim(),
              role: bulkUploadRole,
              classId: classId,
              schoolId: profile.schoolId,
              status: 'active',
              uid: userId,
              createdAt: Timestamp.now()
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
          setBulkUploadProgress(Math.round(((i + 1) / data.length) * 100));
        }
        
        setBulkUploadStatus(`Upload complete! ${successCount} successful, ${errorCount} failed.`);
        setTimeout(() => {
          setShowBulkUploadModal(false);
          setBulkUploadFile(null);
          setBulkUploadStatus('');
          setBulkUploadProgress(0);
          setBulkUploadContext(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }, 4000);
      }
    });
  };

  if (!profile?.schoolId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">No school associated with your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            School Management
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your school, classes, and users.
          </p>
        </div>
        <div className="flex gap-3">
          {activeSubTab === 'users' ? (
            <>
              <button 
                onClick={() => openAddUserModal('teacher')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Add Teacher
              </button>
              <button 
                onClick={() => setAddStudentOptionsContext({})}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Add Student
              </button>
              <button 
                onClick={() => { setBulkUploadRole('student'); setBulkUploadContext(null); setShowBulkUploadModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-md"
              >
                <Upload className="w-4 h-4" />
                Bulk Upload
              </button>
            </>
          ) : activeSubTab === 'classes' ? (
            <button 
              onClick={() => { setEditingItem(null); setShowAddModal(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Class
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex gap-4 border-b border-black/5 pb-4 overflow-x-auto">
        <button 
          onClick={() => setActiveSubTab('classes')}
          className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'classes' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
        >
          Classes
        </button>
        <button 
          onClick={() => setActiveSubTab('users')}
          className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'users' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
        >
          Users
        </button>
        <button 
          onClick={() => setActiveSubTab('courses')}
          className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'courses' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
        >
          Courses
        </button>
        <button 
          onClick={() => setActiveSubTab('exams')}
          className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'exams' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
        >
          Exams
        </button>
        <button 
          onClick={() => setActiveSubTab('payments')}
          className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'payments' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
        >
          Payments
        </button>
        
        {activeSubTab === 'users' && (
          <div className="ml-auto flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(['all', 'admin', 'teacher', 'student'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  roleFilter === role ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {role === 'admin' ? 'Managers' : `${role}s`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'classes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
              <div key={cls.id} className="p-6 bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{cls.name}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Grade: {cls.grade} • Year: {cls.year}</p>
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <button 
                    onClick={() => setAddStudentOptionsContext({classId: cls.id})}
                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700"
                  >
                    <UserPlus className="w-3 h-3" />
                    Add Student
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(cls)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"><Settings className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteConfirm({ collection: 'classes', id: cls.id })} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-black/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Role</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Class / Specialization</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u => roleFilter === 'all' || u.role === roleFilter)
                  .map(user => (
                    <tr key={user.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                      <td className="px-6 py-4 font-bold">{user.displayName}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          user.role === 'teacher' ? "bg-blue-100 text-blue-700" : 
                          user.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                          "bg-purple-100 text-purple-700"
                        )}>
                          {user.role === 'admin' ? 'School Manager' : user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-sm">
                        {user.role === 'teacher' ? user.specialization : classes.find(c => c.id === user.classId)?.name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(user)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Settings className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteConfirm({ collection: 'users', id: user.id })} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'courses' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course.id} className="p-6 bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{course.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm line-clamp-2">{course.description}</p>
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">By {course.teacherName || 'Unknown'}</span>
                  <button onClick={() => setDeleteConfirm({ collection: 'courses', id: course.id })} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'exams' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(exam => (
              <div key={exam.id} className="p-6 bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{exam.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm line-clamp-2">{exam.description}</p>
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">{exam.questions?.length || 0} Questions</span>
                  <button onClick={() => setDeleteConfirm({ collection: 'exams', id: exam.id })} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-black/5">
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-black/5 rounded-xl px-3 py-2 w-full sm:w-96">
                <Search className="w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search by student name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm w-full"
                />
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-black/5 rounded-xl p-1">
                {(['all', 'verified', 'pending'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPaymentFilter(filter)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                      paymentFilter === filter ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-black/5">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Student</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Course</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Enrolled Date</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Payment</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments
                    .filter(e => {
                      const student = users.find(u => u.id === e.studentId);
                      const matchesSearch = !searchQuery || 
                        student?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        student?.email?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesFilter = paymentFilter === 'all' || 
                        (paymentFilter === 'verified' && e.paymentVerified) || 
                        (paymentFilter === 'pending' && !e.paymentVerified);
                      return matchesSearch && matchesFilter;
                    })
                    .map(enrollment => {
                      const student = users.find(u => u.id === enrollment.studentId);
                      const course = courses.find(c => c.id === enrollment.courseId);
                      return (
                        <tr key={enrollment.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold">{student?.displayName || 'Unknown Student'}</span>
                              <span className="text-[10px] text-zinc-500">{student?.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium">{course?.title || enrollment.courseTitle || 'Unknown Course'}</span>
                              {course?.price > 0 && <span className="text-[10px] text-emerald-600 font-bold">${course.price}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-500 text-sm">
                            {enrollment.enrolledAt?.toDate().toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                              enrollment.status === 'approved' ? "bg-emerald-100 text-emerald-700" : 
                              enrollment.status === 'denied' ? "bg-red-100 text-red-700" : 
                              "bg-amber-100 text-amber-700"
                            )}>
                              {enrollment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {enrollment.paymentVerified ? (
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-xs font-bold">Verified</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-amber-600">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-xs font-bold">Pending</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <button onClick={() => setDeleteConfirm({ collection: 'enrollments', id: enrollment.id })} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setEditingItem(null); }}
        title={editingItem ? `Edit ${activeSubTab === 'classes' ? 'Class' : 'User'}` : `Add New ${activeSubTab === 'classes' ? 'Class' : 'User'}`}
      >
        {activeSubTab === 'classes' ? (
          <form onSubmit={handleAddClass} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Class Name</label>
              <input 
                type="text" 
                required 
                value={newClass.name}
                onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Grade</label>
              <input 
                type="text" 
                required 
                value={newClass.grade}
                onChange={(e) => setNewClass({...newClass, grade: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Year</label>
              <input 
                type="text" 
                required 
                value={newClass.year}
                onChange={(e) => setNewClass({...newClass, year: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold shadow-lg">
                {editingItem ? 'Save Changes' : 'Create Class'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Display Name</label>
              <input 
                type="text" 
                required 
                value={newUser.displayName}
                onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Email Address</label>
              <input 
                type="email" 
                required 
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Role</label>
              <select 
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">School Manager</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold shadow-lg">
                {editingItem ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal 
        isOpen={showBulkUploadModal} 
        onClose={() => setShowBulkUploadModal(false)}
        title={`Bulk Upload ${bulkUploadRole}s`}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">Upload a CSV file with "email" and "name" columns.</p>
          <input 
            type="file" 
            accept=".csv"
            ref={fileInputRef}
            onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
          />
          {bulkUploadStatus && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-xs font-medium">
              {bulkUploadStatus}
              {bulkUploadProgress > 0 && bulkUploadProgress < 100 && (
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-purple-600 h-full transition-all" style={{ width: `${bulkUploadProgress}%` }} />
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowBulkUploadModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button>
            <button 
              onClick={handleBulkUpload}
              disabled={!bulkUploadFile || bulkUploadProgress > 0}
              className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
            >
              Start Upload
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-zinc-600 dark:text-zinc-400">Are you sure you want to delete this {deleteConfirm?.collection.slice(0, -1)}? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button>
            <button 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm.collection, deleteConfirm.id)}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold shadow-lg"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

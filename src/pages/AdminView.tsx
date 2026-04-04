import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, Plus, School as SchoolIcon, BookOpen, UserPlus, Trash2, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, Timestamp, where, getDocs, collectionGroup, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { CreditCard, DollarSign, Search, Filter } from 'lucide-react';
import Papa from 'papaparse';

export const AdminView: React.FC = () => {
  const { profile } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'schools' | 'classes' | 'users' | 'courses' | 'exams' | 'payments'>('schools');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'teacher' | 'student' | 'provider'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [addStudentOptionsContext, setAddStudentOptionsContext] = useState<{classId?: string, schoolId?: string} | null>(null);
  const [bulkUploadContext, setBulkUploadContext] = useState<{classId?: string, schoolId?: string} | null>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState('');
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkUploadRole, setBulkUploadRole] = useState<'student' | 'teacher'>('student');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  // Form states
  const [newSchool, setNewSchool] = useState({ name: '', address: '', adminEmail: '', contactPhone: '', academicStructure: 'K-12' });
  const [newClass, setNewClass] = useState({ name: '', grade: '', year: '', teacherId: '', schoolId: '' });
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'student' as any, classId: '', specialization: '', schoolId: '', schoolIds: [] as string[], isIndependent: false });
  const [editingItem, setEditingItem] = useState<any>(null);

  const isSuperAdmin = profile?.email === 'jonmersha@gmail.com' || profile?.role === 'super_admin';

  useEffect(() => {
    if (!profile) return;

    let unsubSchools: () => void = () => {};
    let unsubClasses: () => void = () => {};
    let unsubUsers: () => void = () => {};
    let unsubCourses: () => void = () => {};
    let unsubExams: () => void = () => {};
    let unsubEnrollments: () => void = () => {};

    if (isSuperAdmin) {
      // Super Admin manages platform: schools, platform users, global courses, global payments
      unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
        setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'schools'));
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
      unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
        setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));
      unsubEnrollments = onSnapshot(collectionGroup(db, 'enrollments'), (snap) => {
        setEnrollments(snap.docs.map(doc => ({ id: doc.id, courseId: doc.ref.parent.parent?.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));
    } else if (profile.schoolId) {
      // School Admin manages school operations: classes, users, courses, exams, payments
      const currentSchoolId = profile.schoolId;
      const classesQuery = query(collection(db, 'classes'), where('schoolId', '==', currentSchoolId));
      unsubClasses = onSnapshot(classesQuery, (snap) => {
        setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));

      const usersQuery = query(collection(db, 'users'), where('schoolId', '==', currentSchoolId));
      unsubUsers = onSnapshot(usersQuery, (snap) => {
        setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

      const coursesQuery = query(collection(db, 'courses'), where('schoolId', '==', currentSchoolId));
      unsubCourses = onSnapshot(coursesQuery, (snap) => {
        setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));

      const examsQuery = query(collection(db, 'exams'), where('schoolId', '==', currentSchoolId));
      unsubExams = onSnapshot(examsQuery, (snap) => {
        setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'exams'));

      unsubEnrollments = onSnapshot(collectionGroup(db, 'enrollments'), (snap) => {
        const schoolCourses = courses.filter(c => c.schoolId === currentSchoolId).map(c => c.id);
        setEnrollments(snap.docs
          .map(doc => ({ id: doc.id, courseId: doc.ref.parent.parent?.id, ...doc.data() }))
          .filter(e => schoolCourses.includes(e.courseId))
        );
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));

      if (profile.role === 'admin') {
        setActiveSubTab('classes');
      }
    }

    return () => {
      unsubSchools();
      unsubClasses();
      unsubUsers();
      unsubCourses();
      unsubExams();
      unsubEnrollments();
    };
  }, [profile, isSuperAdmin, selectedSchoolId]);

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const schoolId = editingItem?.id || doc(collection(db, 'schools')).id;
      await setDoc(doc(db, 'schools', schoolId), {
        ...newSchool,
        status: 'active',
        createdAt: editingItem?.createdAt || Timestamp.now()
      }, { merge: true });
      setShowAddModal(false);
      setEditingItem(null);
      setNewSchool({ name: '', address: '', adminEmail: '', contactPhone: '', academicStructure: 'K-12' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schools/${editingItem?.id || 'new'}`);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const schoolId = profile?.schoolId || newClass.schoolId;
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
      const schoolId = selectedSchoolId || profile?.schoolId || newUser.schoolId || (newUser.schoolIds.length > 0 ? newUser.schoolIds[0] : null);
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
      setNewUser({ email: '', displayName: '', role: 'student', classId: '', specialization: '', schoolId: '', schoolIds: [], isIndependent: false });
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
    if (activeSubTab === 'schools') setNewSchool({ name: item.name, address: item.address, adminEmail: item.adminEmail, contactPhone: item.contactPhone || '', academicStructure: item.academicStructure || 'K-12' });
    if (activeSubTab === 'classes') setNewClass({ name: item.name, grade: item.grade, year: item.year || '', teacherId: item.teacherId || '', schoolId: item.schoolId || '' });
    if (activeSubTab === 'users') setNewUser({ email: item.email, displayName: item.displayName, role: item.role, classId: item.classId || '', specialization: item.specialization || '', schoolId: item.schoolId || '', schoolIds: item.schoolIds || [], isIndependent: item.isIndependent || false });
    setShowAddModal(true);
  };

  const openAddUserModal = (role?: 'student' | 'teacher' | 'admin' | 'provider' | 'super_admin', classId?: string, schoolId?: string) => {
    setEditingItem(null);
    setNewUser({ 
      email: '', 
      displayName: '', 
      role: role || 'student', 
      classId: classId || '', 
      specialization: '', 
      schoolId: schoolId || selectedSchoolId || profile?.schoolId || '', 
      schoolIds: [],
      isIndependent: role === 'provider'
    });
    setShowAddModal(true);
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) return;
    
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
        
        // Check for required headers (case-insensitive)
        const headers = Object.keys(data[0]).map(h => h.toLowerCase());
        if (!headers.includes('email') || !headers.includes('name')) {
          setBulkUploadStatus('Error: CSV must contain "email" and "name" columns.');
          return;
        }
        if (bulkUploadRole === 'student' && !bulkUploadContext?.classId && (!headers.includes('class') || !headers.includes('year'))) {
          setBulkUploadStatus('Error: CSV must contain "class" and "year" columns for students when not uploading directly to a class.');
          return;
        }
        
        setBulkUploadStatus(`Found ${data.length} users. Uploading...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          // Find the actual keys matching 'email' and 'name' case-insensitively
          const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email');
          const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
          const classKey = Object.keys(row).find(k => k.toLowerCase() === 'class');
          const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
          const specializationKey = Object.keys(row).find(k => k.toLowerCase() === 'specialization');
          
          if (!emailKey || !nameKey || !row[emailKey] || !row[nameKey]) {
            errorCount++;
            continue;
          }
          
          try {
            let classId = '';
            if (bulkUploadRole === 'student') {
               if (bulkUploadContext?.classId) {
                 classId = bulkUploadContext.classId;
               } else {
                 if (!classKey || !row[classKey] || !yearKey || !row[yearKey]) {
                   errorCount++;
                   continue;
                 }
                 const matchedClass = classes.find(c => c.name.toLowerCase() === row[classKey].toLowerCase() && c.year === row[yearKey] && c.schoolId === (selectedSchoolId || profile?.schoolId));
                 if (matchedClass) {
                   classId = matchedClass.id;
                 } else {
                   errorCount++;
                   continue;
                 }
               }
            }
            
            const userId = doc(collection(db, 'users')).id;
            await setDoc(doc(db, 'users', userId), {
              email: row[emailKey].trim(),
              displayName: row[nameKey].trim(),
              role: bulkUploadRole,
              classId: classId,
              specialization: specializationKey && row[specializationKey] ? row[specializationKey].trim() : '',
              schoolId: selectedSchoolId || profile?.schoolId || '',
              status: 'active',
              uid: userId,
              createdAt: Timestamp.now()
            });
            successCount++;
          } catch (err) {
            console.error("Error creating user:", err);
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
      },
      error: (error) => {
        setBulkUploadStatus(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "text-3xl font-bold tracking-tight",
            isSuperAdmin ? "text-purple-900 dark:text-purple-400" : "text-zinc-900 dark:text-white"
          )}>
            {isSuperAdmin ? 'Global Administration' : 'School Management'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {isSuperAdmin ? 'Platform-wide oversight and infrastructure management.' : 'Manage your school, classes, and users.'}
          </p>
        </div>
        <div className="flex gap-3">
          {activeSubTab === 'users' ? (
            <>
              {!isSuperAdmin && (
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
              )}
              {isSuperAdmin && (
                <button 
                  onClick={() => openAddUserModal('super_admin')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Admin
                </button>
              )}
            </>
          ) : activeSubTab === 'schools' && isSuperAdmin ? (
            <button 
              onClick={() => { setEditingItem(null); setShowAddModal(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add School
            </button>
          ) : activeSubTab === 'classes' && !isSuperAdmin ? (
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

      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600">
                <SchoolIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Total Schools</p>
                <p className="text-2xl font-bold">{schools.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Total Courses</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Verified Revenue</p>
                <p className="text-2xl font-bold">
                  ${enrollments.filter(e => e.paymentVerified).reduce((acc, curr) => acc + (curr.price || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 border-b border-black/5 pb-4 overflow-x-auto">
        {isSuperAdmin ? (
          <>
            <button 
              onClick={() => setActiveSubTab('schools')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'schools' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
            >
              Schools
            </button>
            <button 
              onClick={() => setActiveSubTab('users')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'users' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
            >
              All Users
            </button>
            <button 
              onClick={() => setActiveSubTab('courses')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'courses' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
            >
              All Courses
            </button>
            <button 
              onClick={() => setActiveSubTab('payments')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'payments' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
            >
              All Payments
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
        
        {activeSubTab === 'users' && (
          <div className="ml-auto flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 p-1 rounded-xl">
            {(['all', 'super_admin', 'admin', 'teacher', 'student', 'provider'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  roleFilter === role ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:text-zinc-300"
                )}
              >
                {role === 'super_admin' ? 'Super Admins' : role === 'admin' ? 'School Managers' : `${role}s`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'schools' && isSuperAdmin && (
          <div className="bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border-b border-black/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">School Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Address</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Admin Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Structure</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(school => (
                  <tr key={school.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 transition-colors">
                    <td className="px-6 py-4 font-bold">{school.name}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{school.address}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{school.adminEmail}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{school.academicStructure}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(school)} className="text-zinc-400 hover:text-zinc-900 transition-colors"><Settings className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm({ collection: 'schools', id: school.id })} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'classes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
              <div key={cls.id} className="p-6 bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{cls.name}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm">Grade: {cls.grade} • Year: {cls.year}</p>
                {isSuperAdmin && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mt-1">
                    School: {schools.find(s => s.id === cls.schoolId)?.name || 'Unknown'}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <button 
                    onClick={() => setAddStudentOptionsContext({classId: cls.id, schoolId: cls.schoolId})}
                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700"
                  >
                    <UserPlus className="w-3 h-3" />
                    Add Student
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(cls)} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 rounded-lg text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500"><Settings className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteConfirm({ collection: 'classes', id: cls.id })} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
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
                <tr className="bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border-b border-black/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Role</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">School</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Class / Specialization</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u => roleFilter === 'all' || u.role === roleFilter)
                  .map(user => (
                    <tr key={user.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 transition-colors">
                      <td className="px-6 py-4 font-bold">{user.displayName}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          user.role === 'super_admin' ? "bg-zinc-900 text-white" :
                          user.role === 'teacher' ? "bg-blue-100 text-blue-700" : 
                          user.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                          user.role === 'provider' ? "bg-amber-100 text-amber-700" :
                          "bg-purple-100 text-purple-700"
                        )}>
                          {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'School Manager' : user.role}
                        </span>
                        {user.isIndependent && (
                          <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-[8px] font-black uppercase rounded">Independent</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm">
                        {schools.find(s => s.id === user.schoolId)?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm">
                        {user.role === 'teacher' ? (
                          <div>
                            <p className="font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{user.specialization || 'No specialization'}</p>
                            <p className="text-[10px]">{user.schoolIds?.length || 0} Schools</p>
                          </div>
                        ) : user.role === 'student' ? (
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3 h-3 text-purple-500" />
                            <span className="font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">
                              {classes.find(c => c.id === user.classId)?.name || 'Unassigned'}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(user)} className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-white dark:text-white transition-colors"><Settings className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteConfirm({ collection: 'users', id: user.id })} className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
                <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm line-clamp-2">{course.description}</p>
                {isSuperAdmin && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mt-1">
                    School: {schools.find(s => s.id === course.schoolId)?.name || 'Independent / Unknown'}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">By {course.teacherName || 'Unknown'}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm({ collection: 'courses', id: course.id })} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {courses.length === 0 && <p className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 italic text-sm col-span-full py-12 text-center">No courses found for this school.</p>}
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
                <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm line-clamp-2">{exam.description}</p>
                {isSuperAdmin && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mt-1">
                    School: {schools.find(s => s.id === exam.schoolId)?.name || 'Independent / Unknown'}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{exam.questions?.length || 0} Questions</span>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm({ collection: 'exams', id: exam.id })} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {exams.length === 0 && <p className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 italic text-sm col-span-full py-12 text-center">No exams found for this school.</p>}
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
                      paymentFilter === filter ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
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
                            <div className="flex gap-2">
                              {!enrollment.paymentVerified && (
                                <button 
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'courses', enrollment.courseId, 'enrollments', enrollment.id), {
                                        paymentVerified: true,
                                        status: 'approved'
                                      });
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.WRITE, `enrollments/${enrollment.id}`);
                                    }
                                  }}
                                  className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-all"
                                >
                                  Verify Payment
                                </button>
                              )}
                              {enrollment.status === 'pending' && (
                                <button 
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'courses', enrollment.courseId, 'enrollments', enrollment.id), {
                                        status: 'approved'
                                      });
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.WRITE, `enrollments/${enrollment.id}`);
                                    }
                                  }}
                                  className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg hover:bg-black transition-all"
                                >
                                  Approve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {enrollments.length === 0 && (
                <div className="py-12 text-center">
                  <DollarSign className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                  <p className="text-zinc-400 italic text-sm">No enrollments or payments found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {addStudentOptionsContext && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-black/5"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Add Student</h2>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    openAddUserModal('student', addStudentOptionsContext.classId, addStudentOptionsContext.schoolId);
                    setAddStudentOptionsContext(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md"
                >
                  <UserPlus className="w-5 h-5" />
                  Add Single Student
                </button>
                <button
                  onClick={() => {
                    setBulkUploadRole('student');
                    setBulkUploadContext(addStudentOptionsContext);
                    setShowBulkUploadModal(true);
                    setAddStudentOptionsContext(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-md"
                >
                  <Upload className="w-5 h-5" />
                  Bulk Upload Students
                </button>
              </div>
              <button 
                onClick={() => setAddStudentOptionsContext(null)}
                className="mt-6 w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkUploadModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-black/5"
            >
              <h2 className="text-2xl font-bold mb-2">Bulk Upload Users</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">Upload a CSV file to add multiple users at once.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Role to Upload</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBulkUploadRole('student')}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-bold text-sm transition-all",
                        bulkUploadRole === 'student' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-2 border-purple-500" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-2 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      )}
                    >
                      Students
                    </button>
                    <button
                      onClick={() => setBulkUploadRole('teacher')}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-bold text-sm transition-all",
                        bulkUploadRole === 'teacher' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-2 border-blue-500" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-2 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      )}
                    >
                      Teachers
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    CSV Format Requirements
                  </h3>
                  <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 list-disc list-inside">
                    <li>Must include <strong>name</strong> and <strong>email</strong> columns.</li>
                    {bulkUploadRole === 'student' && !bulkUploadContext?.classId && <li>Must include <strong>class</strong> and <strong>year</strong> columns (must match an existing class exactly).</li>}
                    {bulkUploadRole === 'student' && bulkUploadContext?.classId && <li>Students will be automatically added to the selected class.</li>}
                    {bulkUploadRole === 'teacher' && <li>Optional: <strong>specialization</strong> column.</li>}
                    <li>First row must be headers.</li>
                  </ul>
                  <div className="mt-3 p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                    <code className="text-[10px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      name,email{bulkUploadRole === 'student' && !bulkUploadContext?.classId ? ',class,year' : bulkUploadRole === 'teacher' ? ',specialization' : ''}<br/>
                      John Doe,john@example.com{bulkUploadRole === 'student' && !bulkUploadContext?.classId ? ',Grade 10A,2026' : bulkUploadRole === 'teacher' ? ',Mathematics' : ''}<br/>
                      Jane Smith,jane@example.com{bulkUploadRole === 'student' && !bulkUploadContext?.classId ? ',Grade 10B,2026' : bulkUploadRole === 'teacher' ? ',Physics' : ''}
                    </code>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Select CSV File</label>
                  <input 
                    type="file" 
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-zinc-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700 transition-all cursor-pointer"
                  />
                </div>

                {bulkUploadStatus && (
                  <div className={cn(
                    "p-3 rounded-xl text-sm font-medium flex items-center gap-2",
                    bulkUploadStatus.includes('Error') ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : 
                    bulkUploadStatus.includes('complete') ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" : 
                    "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  )}>
                    {bulkUploadStatus.includes('Error') ? <AlertCircle className="w-4 h-4" /> : 
                     bulkUploadStatus.includes('complete') ? <CheckCircle2 className="w-4 h-4" /> : 
                     <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                    {bulkUploadStatus}
                  </div>
                )}

                {bulkUploadProgress > 0 && bulkUploadProgress < 100 && (
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${bulkUploadProgress}%` }}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { setShowBulkUploadModal(false); setBulkUploadFile(null); setBulkUploadStatus(''); setBulkUploadContext(null); }} 
                    className="flex-1 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                    disabled={bulkUploadProgress > 0 && bulkUploadProgress < 100}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBulkUpload}
                    disabled={!bulkUploadFile || (bulkUploadProgress > 0 && bulkUploadProgress < 100)}
                    className="flex-1 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-black transition-all"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-black/5 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-2xl font-bold mb-6">
                {editingItem ? 'Edit' : 'Add'} {activeSubTab === 'schools' ? 'School' : activeSubTab === 'classes' ? 'Class' : 'User'}
              </h2>
              
              {activeSubTab === 'schools' && (
                <form onSubmit={handleAddSchool} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">School Name</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newSchool.name} onChange={e => setNewSchool({...newSchool, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Address</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newSchool.address} onChange={e => setNewSchool({...newSchool, address: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Admin Email</label>
                      <input required type="email" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newSchool.adminEmail} onChange={e => setNewSchool({...newSchool, adminEmail: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Contact Phone</label>
                      <input className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newSchool.contactPhone} onChange={e => setNewSchool({...newSchool, contactPhone: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Academic Structure</label>
                    <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newSchool.academicStructure} onChange={e => setNewSchool({...newSchool, academicStructure: e.target.value})}>
                      <option value="K-12">K-12</option>
                      <option value="Primary">Primary (K-6)</option>
                      <option value="Secondary">Secondary (7-12)</option>
                      <option value="Higher Ed">Higher Education</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 dark:text-zinc-300 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold">{editingItem ? 'Update' : 'Add'} School</button>
                  </div>
                </form>
              )}

              {activeSubTab === 'classes' && (
                <form onSubmit={handleAddClass} className="space-y-4">
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">School</label>
                      <select required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newClass.schoolId} onChange={e => setNewClass({...newClass, schoolId: e.target.value})}>
                        <option value="">Select School</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Class Name</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Grade</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newClass.grade} onChange={e => setNewClass({...newClass, grade: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Academic Year</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newClass.year} onChange={e => setNewClass({...newClass, year: e.target.value})} placeholder="e.g. 2026" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Assign Teacher</label>
                    <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newClass.teacherId} onChange={e => setNewClass({...newClass, teacherId: e.target.value})}>
                      <option value="">Select Teacher</option>
                      {users
                        .filter(u => u.role === 'teacher' && (!isSuperAdmin || !newClass.schoolId || u.schoolId === newClass.schoolId))
                        .map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)
                      }
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 dark:text-zinc-300 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold">{editingItem ? 'Update' : 'Add'} Class</button>
                  </div>
                </form>
              )}

              {activeSubTab === 'users' && (
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Display Name</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newUser.displayName} onChange={e => setNewUser({...newUser, displayName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Email</label>
                    <input required type="email" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Role</label>
                    <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any, isIndependent: e.target.value === 'provider'})}>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">School Manager</option>
                      {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                      <option value="provider">Independent Provider</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input 
                      type="checkbox" 
                      checked={newUser.isIndependent} 
                      onChange={e => setNewUser({...newUser, isIndependent: e.target.checked})}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <label className="text-sm font-medium text-zinc-600 dark:text-zinc-300 dark:text-zinc-300">Independent Account</label>
                  </div>
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Primary School</label>
                      <select required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newUser.schoolId} onChange={e => setNewUser({...newUser, schoolId: e.target.value})}>
                        <option value="">Select School</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  {newUser.role === 'teacher' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Specialization</label>
                        <input className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newUser.specialization} onChange={e => setNewUser({...newUser, specialization: e.target.value})} placeholder="e.g. Mathematics, Physics" />
                      </div>
                      {isSuperAdmin && (
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Link to Schools</label>
                          <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl">
                            {schools.map(s => (
                              <label key={s.id} className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={newUser.schoolIds.includes(s.id)} 
                                  onChange={e => {
                                    const ids = e.target.checked 
                                      ? [...newUser.schoolIds, s.id] 
                                      : newUser.schoolIds.filter(id => id !== s.id);
                                    setNewUser({...newUser, schoolIds: ids});
                                  }}
                                />
                                <span className="text-sm">{s.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {newUser.role === 'student' && (
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1">Assign to Class</label>
                      <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-xl" value={newUser.classId} onChange={e => setNewUser({...newUser, classId: e.target.value})}>
                        <option value="">No Class</option>
                        {classes
                          .filter(c => !newUser.schoolId || c.schoolId === newUser.schoolId || c.schoolId === profile?.schoolId)
                          .map(c => <option key={c.id} value={c.id}>{c.name} ({schools.find(s => s.id === c.schoolId)?.name || 'Unknown School'})</option>)
                        }
                      </select>
                    </div>
                  )}
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 dark:text-zinc-300 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold">{editingItem ? 'Update' : 'Add'} User</button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-6">
          <p className="text-zinc-600 dark:text-zinc-300 dark:text-zinc-300">Are you sure you want to delete this item? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-900 dark:text-white dark:text-white rounded-xl font-bold hover:bg-zinc-200 dark:bg-zinc-700 dark:bg-zinc-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm.collection, deleteConfirm.id)}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

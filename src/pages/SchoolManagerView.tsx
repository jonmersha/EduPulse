import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, Plus, BookOpen, UserPlus, Trash2, Upload, CheckCircle2, AlertCircle, DollarSign, Search, School as SchoolIcon } from 'lucide-react';
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
  const [activeSubTab, setActiveSubTab] = useState<'schools' | 'classes' | 'users' | 'courses' | 'exams' | 'payments' | 'profile'>('classes');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student' | 'parent'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingParent, setLinkingParent] = useState<any>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [addStudentOptionsContext, setAddStudentOptionsContext] = useState<{classId?: string} | null>(null);
  const [bulkUploadContext, setBulkUploadContext] = useState<{classId?: string} | null>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState('');
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkUploadRole, setBulkUploadRole] = useState<'student' | 'teacher' | 'school'>('student');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [managedSchools, setManagedSchools] = useState<any[]>([]);
  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);

  // Form states
  const [newClass, setNewClass] = useState({ name: '', grade: '', year: new Date().getFullYear().toString(), teacherId: '', schoolId: '' });
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'student' as any, classId: '', specialization: '', schoolId: '', isIndependent: false, studentIds: [] as string[] });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [schoolForm, setSchoolForm] = useState({ name: '', address: '', adminEmail: '', contactPhone: '', academicStructure: 'K-12', website: '', description: '', principalName: '', logoUrl: '' });

  useEffect(() => {
    if (!profile) return;
    
    setLoading(true);
    
    // Fetch all schools managed by this user
    const managedSchoolsQuery = query(collection(db, 'schools'), where('managerId', '==', profile.uid));
    const unsubManaged = onSnapshot(managedSchoolsQuery, (snap) => {
      setManagedSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schools'));

    if (!profile.schoolId) {
      setLoading(false);
      return () => unsubManaged();
    }

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

    const unsubSchool = onSnapshot(doc(db, 'schools', currentSchoolId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSchoolData({ id: snap.id, ...data });
        setSchoolForm({
          name: data.name || '',
          address: data.address || '',
          adminEmail: data.adminEmail || '',
          contactPhone: data.contactPhone || '',
          academicStructure: data.academicStructure || 'K-12',
          website: data.website || '',
          description: data.description || '',
          principalName: data.principalName || '',
          logoUrl: data.logoUrl || ''
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `schools/${currentSchoolId}`));

    return () => {
      unsubClasses();
      unsubUsers();
      unsubCourses();
      unsubExams();
      unsubEnrollments();
      unsubSchool();
      unsubManaged();
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
      setNewUser({ email: '', displayName: '', role: 'student', classId: '', specialization: '', schoolId: '', isIndependent: false, studentIds: [] });
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
    if (activeSubTab === 'users') setNewUser({ email: item.email, displayName: item.displayName, role: item.role, classId: item.classId || '', specialization: item.specialization || '', schoolId: item.schoolId || '', isIndependent: item.isIndependent || false, studentIds: item.studentIds || [] });
    setShowAddModal(true);
  };

  const openAddUserModal = (role?: 'student' | 'teacher' | 'admin' | 'parent', classId?: string) => {
    setEditingItem(null);
    setNewUser({ 
      email: '', 
      displayName: '', 
      role: role || 'student', 
      classId: classId || '', 
      specialization: '', 
      schoolId: profile?.schoolId || '', 
      isIndependent: false,
      studentIds: []
    });
    setShowAddModal(true);
  };

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchoolId = editingSchool?.id || profile?.schoolId;
    if (!targetSchoolId) return;
    try {
      await setDoc(doc(db, 'schools', targetSchoolId), {
        ...schoolForm,
        updatedAt: Timestamp.now()
      }, { merge: true });
      setShowEditSchoolModal(false);
      setEditingSchool(null);
      alert('School profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schools/${targetSchoolId}`);
    }
  };

  const handleToggleVisibility = async (school: any) => {
    try {
      const newStatus = school.status === 'active' ? 'inactive' : 'active';
      await setDoc(doc(db, 'schools', school.id), {
        status: newStatus,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schools/${school.id}`);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile || !profile) return;
    
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
        
        if (bulkUploadRole === 'school') {
          if (!headers.includes('name') || !headers.includes('address')) {
            setBulkUploadStatus('Error: CSV must contain "name" and "address" columns.');
            return;
          }
        } else {
          if (!headers.includes('email') || !headers.includes('name')) {
            setBulkUploadStatus('Error: CSV must contain "email" and "name" columns.');
            return;
          }
        }
        
        setBulkUploadStatus(`Found ${data.length} items. Uploading...`);
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            if (bulkUploadRole === 'school') {
              const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
              const addressKey = Object.keys(row).find(k => k.toLowerCase() === 'address');
              const academicKey = Object.keys(row).find(k => k.toLowerCase() === 'academicstructure');
              
              if (!nameKey || !addressKey || !row[nameKey] || !row[addressKey]) {
                errorCount++;
                continue;
              }

              const schoolId = doc(collection(db, 'schools')).id;
              await setDoc(doc(db, 'schools', schoolId), {
                name: row[nameKey].trim(),
                address: row[addressKey].trim(),
                academicStructure: academicKey ? row[academicKey].trim() : 'K-12',
                adminEmail: profile.email,
                managerId: profile.uid,
                status: 'pending',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              });
            } else {
              const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email');
              const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
              const classKey = Object.keys(row).find(k => k.toLowerCase() === 'class');
              const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
              
              if (!emailKey || !nameKey || !row[emailKey] || !row[nameKey]) {
                errorCount++;
                continue;
              }
              
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
            }
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

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      const schoolId = doc(collection(db, 'schools')).id;
      const now = Timestamp.now();
      
      // 1. Create the school
      await setDoc(doc(db, 'schools', schoolId), {
        ...schoolForm,
        adminEmail: profile.email,
        managerId: profile.uid,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      });
      
      // 2. Update the user's profile with the new schoolId and add to schoolIds
      const updatedSchoolIds = Array.from(new Set([...(profile.schoolIds || []), schoolId]));
      await setDoc(doc(db, 'users', profile.uid), {
        schoolId: schoolId, // Set as active school
        schoolIds: updatedSchoolIds,
        updatedAt: now
      }, { merge: true });
      
      alert('School created successfully! It is now pending approval from a Super Admin.');
      setShowCreateSchool(false);
      setSchoolForm({ name: '', address: '', adminEmail: '', contactPhone: '', academicStructure: 'K-12', website: '', description: '', principalName: '', logoUrl: '' });
      // The onSnapshot will update the managedSchools list
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schools/new');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchSchool = async (schoolId: string) => {
    if (!profile) return;
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        schoolId: schoolId,
        updatedAt: Timestamp.now()
      }, { merge: true });
      setActiveSubTab('classes');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
    }
  };

  const handleLinkStudents = async () => {
    if (!linkingParent) return;
    try {
      await setDoc(doc(db, 'users', linkingParent.id), {
        studentIds: selectedStudentIds,
        updatedAt: Timestamp.now()
      }, { merge: true });
      setShowLinkModal(false);
      setLinkingParent(null);
      setSelectedStudentIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${linkingParent.id}`);
    }
  };

  const openLinkModal = (parent: any) => {
    setLinkingParent(parent);
    setSelectedStudentIds(parent.studentIds || []);
    setShowLinkModal(true);
  };

  const startEditSchool = (school: any) => {
    setEditingSchool(school);
    setSchoolForm({
      name: school.name || '',
      address: school.address || '',
      adminEmail: school.adminEmail || '',
      contactPhone: school.contactPhone || '',
      academicStructure: school.academicStructure || 'K-12',
      website: school.website || '',
      description: school.description || '',
      principalName: school.principalName || '',
      logoUrl: school.logoUrl || ''
    });
    setShowEditSchoolModal(true);
  };

  if (!profile?.schoolId || showCreateSchool) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <SchoolIcon className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {profile?.schoolId ? 'Register Another School' : 'Create Your School'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            {profile?.schoolId ? 'Expand your educational network by adding a new school.' : "You don't have a school associated with your profile yet. Fill out the form below to register your school."}
          </p>
        </div>

        <form onSubmit={handleCreateSchool} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">School Name</label>
              <input
                type="text"
                required
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-emerald-600"
                placeholder="Enter school name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Address</label>
              <input
                type="text"
                required
                value={schoolForm.address}
                onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-emerald-600"
                placeholder="Enter school address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={schoolForm.contactPhone}
                  onChange={(e) => setSchoolForm({ ...schoolForm, contactPhone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Academic Structure</label>
                <select
                  value={schoolForm.academicStructure}
                  onChange={(e) => setSchoolForm({ ...schoolForm, academicStructure: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="K-12">K-12</option>
                  <option value="Primary Only">Primary Only</option>
                  <option value="Secondary Only">Secondary Only</option>
                  <option value="Higher Education">Higher Education</option>
                  <option value="Vocational">Vocational</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {profile?.schoolId && (
              <button
                type="button"
                onClick={() => setShowCreateSchool(false)}
                className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 dark:shadow-none disabled:opacity-50"
            >
              {loading ? 'Creating School...' : 'Register School'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (schoolData?.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center animate-pulse">
          <AlertCircle className="w-10 h-10 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Approval Pending</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Your school <strong>{schoolData.name}</strong> has been registered and is currently awaiting approval from a Super Admin.
          </p>
        </div>
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl w-full text-sm text-zinc-600 dark:text-zinc-300">
          Once approved, you will have full access to the school management dashboard.
        </div>
      </div>
    );
  }

  if (schoolData?.status === 'suspended') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Account Suspended</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Your school <strong>{schoolData.name}</strong> has been suspended. Please contact a Super Admin for more information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar: School Selection */}
      <aside className="w-full lg:w-72 shrink-0 space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl p-6 shadow-sm sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <SchoolIcon className="w-5 h-5 text-emerald-600" />
              My Schools
            </h2>
            <button 
              onClick={() => setShowCreateSchool(true)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-emerald-600 transition-all"
              title="Register New School"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
            {managedSchools.map(school => (
              <div key={school.id} className="group relative">
                <button
                  onClick={() => handleSwitchSchool(school.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left",
                    profile?.schoolId === school.id 
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100 dark:shadow-none" 
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )}
                >
                  <SchoolIcon className={cn("w-4 h-4 shrink-0", profile?.schoolId === school.id ? "text-white" : "text-zinc-400")} />
                  <span className="truncate flex-1">{school.name}</span>
                  {school.status !== 'active' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Pending Approval" />
                  )}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); startEditSchool(school); }}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                    profile?.schoolId === school.id ? "text-emerald-100 hover:text-white" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {managedSchools.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-4 italic">No schools registered yet.</p>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-black/5">
            <button 
              onClick={() => { setBulkUploadRole('school'); setShowBulkUploadModal(true); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all"
            >
              <Upload className="w-4 h-4" />
              Bulk Upload Schools
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-8 min-w-0">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {schoolData?.name || 'School Management'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  schoolData?.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  {schoolData?.status || 'pending'}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">• {schoolData?.academicStructure}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">• {activeSubTab}</span>
              </div>
            </div>
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
          <button 
            onClick={() => setActiveSubTab('profile')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'profile' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
          >
            School Profile
          </button>
          
          {activeSubTab === 'users' && (
            <div className="ml-auto flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(['all', 'admin', 'teacher', 'student', 'parent'] as const).map((role) => (
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
            <div className="p-4 border-b border-black/5 flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  onClick={() => openAddUserModal('teacher')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                >
                  Add Teacher
                </button>
                <button 
                  onClick={() => openAddUserModal('student')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
                >
                  Add Student
                </button>
                <button 
                  onClick={() => openAddUserModal('parent')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all"
                >
                  Add Parent
                </button>
              </div>
            </div>
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
                          user.role === 'parent' ? "bg-amber-100 text-amber-700" :
                          "bg-purple-100 text-purple-700"
                        )}>
                          {user.role === 'admin' ? 'School Manager' : user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-sm">
                        {user.role === 'teacher' ? user.specialization : 
                         user.role === 'parent' ? `${(user.studentIds || []).length} Linked Students` :
                         classes.find(c => c.id === user.classId)?.name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {user.role === 'parent' && (
                            <button 
                              onClick={() => openLinkModal(user)}
                              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-emerald-600"
                              title="Link Students"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
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

        {activeSubTab === 'profile' && (
          <div className="max-w-2xl bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center">
                <SchoolIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">School Profile</h2>
                <p className="text-zinc-500 text-sm">Update your school's public information.</p>
              </div>
              <div className="ml-auto">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  schoolData?.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  Status: {schoolData?.status || 'pending'}
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdateSchool} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">School Name</label>
                  <input 
                    type="text" 
                    required 
                    value={schoolForm.name}
                    onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Academic Structure</label>
                  <select 
                    value={schoolForm.academicStructure}
                    onChange={(e) => setSchoolForm({...schoolForm, academicStructure: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
                  >
                    <option value="K-12">K-12</option>
                    <option value="Primary">Primary Only</option>
                    <option value="Secondary">Secondary Only</option>
                    <option value="Higher Education">Higher Education</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Address</label>
                <input 
                  type="text" 
                  required 
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({...schoolForm, address: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Admin Email</label>
                  <input 
                    type="email" 
                    required 
                    value={schoolForm.adminEmail}
                    onChange={(e) => setSchoolForm({...schoolForm, adminEmail: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Contact Phone</label>
                  <input 
                    type="text" 
                    value={schoolForm.contactPhone}
                    onChange={(e) => setSchoolForm({...schoolForm, contactPhone: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Principal Name</label>
                  <input 
                    type="text" 
                    value={schoolForm.principalName}
                    onChange={(e) => setSchoolForm({...schoolForm, principalName: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Website</label>
                  <input 
                    type="url" 
                    value={schoolForm.website}
                    onChange={(e) => setSchoolForm({...schoolForm, website: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Logo URL</label>
                <input 
                  type="url" 
                  value={schoolForm.logoUrl}
                  onChange={(e) => setSchoolForm({...schoolForm, logoUrl: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
                  placeholder="https://www.example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">School Description</label>
                <textarea 
                  value={schoolForm.description}
                  onChange={(e) => setSchoolForm({...schoolForm, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent min-h-[100px] resize-y"
                  placeholder="Tell us about your school..."
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full md:w-auto px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
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
              <select 
                required 
                value={newClass.year}
                onChange={(e) => setNewClass({...newClass, year: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
              >
                <option value="">Select Year</option>
                {[...Array(10)].map((_, i) => {
                  const year = new Date().getFullYear() + i - 2;
                  return <option key={year} value={year.toString()}>{year}</option>;
                })}
              </select>
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

      {/* Edit School Modal */}
      <Modal
        isOpen={showEditSchoolModal}
        onClose={() => { setShowEditSchoolModal(false); setEditingSchool(null); }}
        title={`Edit ${editingSchool?.name || 'School'}`}
      >
        <form onSubmit={handleUpdateSchool} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">School Name</label>
            <input 
              type="text" 
              required 
              value={schoolForm.name}
              onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Address</label>
            <input 
              type="text" 
              required 
              value={schoolForm.address}
              onChange={(e) => setSchoolForm({...schoolForm, address: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Contact Phone</label>
            <input 
              type="tel" 
              required 
              value={schoolForm.contactPhone}
              onChange={(e) => setSchoolForm({...schoolForm, contactPhone: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Academic Structure</label>
            <select 
              value={schoolForm.academicStructure}
              onChange={(e) => setSchoolForm({...schoolForm, academicStructure: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent"
            >
              <option value="K-12">K-12</option>
              <option value="Primary Only">Primary Only</option>
              <option value="Secondary Only">Secondary Only</option>
              <option value="Higher Education">Higher Education</option>
              <option value="Vocational">Vocational</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowEditSchoolModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Link Students Modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => { setShowLinkModal(false); setLinkingParent(null); }}
        title={`Link Students to ${linkingParent?.displayName}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">Select students to link to this parent account.</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {users.filter(u => u.role === 'student').map(student => (
              <label key={student.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-100 transition-colors">
                <input 
                  type="checkbox"
                  checked={selectedStudentIds.includes(student.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudentIds([...selectedStudentIds, student.id]);
                    } else {
                      setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                    }
                  }}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div>
                  <p className="text-sm font-bold">{student.displayName}</p>
                  <p className="text-xs text-zinc-500">{student.email}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button>
            <button 
              onClick={handleLinkStudents}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg"
            >
              Save Links
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
  </div>
);
};

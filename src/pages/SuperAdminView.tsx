import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, Plus, School as SchoolIcon, BookOpen, UserPlus, Trash2, Upload, CheckCircle2, AlertCircle, DollarSign, Search, MessageSquare } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, Timestamp, collectionGroup, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const SuperAdminView: React.FC = () => {
  const { profile } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'schools' | 'users' | 'courses' | 'payments'>('schools');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'teacher' | 'student' | 'provider'>('all');
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newSchool, setNewSchool] = useState({ name: '', address: '', adminEmail: '', contactPhone: '', academicStructure: 'K-12' });
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'super_admin' as any, schoolId: '', schoolIds: [] as string[], isIndependent: false });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [courseComment, setCourseComment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const isSuperAdmin = profile?.email === 'jonmersha@gmail.com' || profile?.role === 'super_admin';

  useEffect(() => {
    if (!profile || !isSuperAdmin) return;

    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schools'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));

    const unsubEnrollments = onSnapshot(collectionGroup(db, 'enrollments'), (snap) => {
      setEnrollments(snap.docs.map(doc => ({ id: doc.id, courseId: doc.ref.parent.parent?.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));

    return () => {
      unsubSchools();
      unsubUsers();
      unsubCourses();
      unsubEnrollments();
    };
  }, [profile, isSuperAdmin]);

  const handleUpdateSchoolStatus = async (schoolId: string, status: 'active' | 'pending' | 'suspended') => {
    try {
      await setDoc(doc(db, 'schools', schoolId), {
        status: status,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schools/${schoolId}`);
    }
  };

  const handleAddCourseComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    try {
      await setDoc(doc(db, 'courses', selectedCourse.id), {
        adminComments: courseComment,
        commentedAt: Timestamp.now()
      }, { merge: true });
      setShowCommentModal(false);
      setCourseComment('');
      setSelectedCourse(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `courses/${selectedCourse.id}`);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = editingItem?.id || doc(collection(db, 'users')).id; 
      await setDoc(doc(db, 'users', userId), {
        ...newUser,
        status: 'active',
        uid: editingItem?.uid || userId,
        createdAt: editingItem?.createdAt || Timestamp.now()
      }, { merge: true });
      setShowAddModal(false);
      setEditingItem(null);
      setNewUser({ email: '', displayName: '', role: 'super_admin', schoolId: '', schoolIds: [], isIndependent: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${editingItem?.id || 'new'}`);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ collection: string, id: string } | null>(null);

  const handleDelete = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    if (activeSubTab === 'schools') setNewSchool({ name: item.name, address: item.address, adminEmail: item.adminEmail, contactPhone: item.contactPhone || '', academicStructure: item.academicStructure || 'K-12' });
    if (activeSubTab === 'users') setNewUser({ email: item.email, displayName: item.displayName, role: item.role, schoolId: item.schoolId || '', schoolIds: item.schoolIds || [], isIndependent: item.isIndependent || false });
    setShowAddModal(true);
  };

  const openAddUserModal = (role: 'super_admin' | 'admin') => {
    setEditingItem(null);
    setNewUser({ 
      email: '', 
      displayName: '', 
      role: role, 
      schoolId: '', 
      schoolIds: [],
      isIndependent: false
    });
    setShowAddModal(true);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">Access Denied. Super Admin only.</p>
      </div>
    );
  }

  const wipeDatabase = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete EVERYTHING? This cannot be undone.')) {
      return;
    }

    const collectionsToWipe = [
      'users', 'schools', 'classes', 'courses', 'lessons', 'exams', 
      'examResults', 'resources', 'questions', 'answers', 'sections',
      'assignments', 'submissions', 'enrollments', 'chatMessages', 
      'conversations', 'directMessages'
    ];

    try {
      for (const colName of collectionsToWipe) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => {
          batch.delete(document.ref);
        });
        await batch.commit();
        console.log(`Deleted ${snapshot.size} documents from ${colName}`);
      }
      alert('Database wiped successfully!');
    } catch (error) {
      console.error('Error wiping database:', error);
      alert('Error wiping database. Check console.');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-purple-900 dark:text-purple-400">
            Global Administration
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Platform-wide oversight and infrastructure management.
          </p>
        </div>
        <div className="flex gap-3">
          {activeSubTab === 'users' && (
            <button 
              onClick={() => openAddUserModal('super_admin')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              Add Global Admin
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Danger Zone</p>
              <button 
                onClick={wipeDatabase}
                className="text-red-600 font-bold hover:text-red-700"
              >
                Wipe Database
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-black/5 pb-4 overflow-x-auto">
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
        
        {activeSubTab === 'schools' && (
          <div className="ml-auto flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(['all', 'active', 'pending', 'suspended'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSchoolFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  schoolFilter === status ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        )}
        {activeSubTab === 'users' && (
          <div className="ml-auto flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(['all', 'super_admin', 'admin', 'teacher', 'student', 'provider'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  roleFilter === role ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {role === 'super_admin' ? 'Super Admins' : role === 'admin' ? 'School Managers' : `${role}s`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'schools' && (
          <div className="bg-white dark:bg-zinc-900 border border-black/5 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-black/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">School Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Admin Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools
                  .filter(s => schoolFilter === 'all' || (s.status || 'pending') === schoolFilter)
                  .map(school => (
                  <tr key={school.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{school.name}</span>
                        <span className="text-[10px] text-zinc-500">{school.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{school.adminEmail}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        school.status === 'active' ? "bg-emerald-100 text-emerald-700" : 
                        school.status === 'suspended' ? "bg-red-100 text-red-700" : 
                        "bg-amber-100 text-amber-700"
                      )}>
                        {school.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {school.status !== 'active' && (
                          <button 
                            onClick={() => handleUpdateSchoolStatus(school.id, 'active')}
                            className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                        {school.status === 'active' && (
                          <button 
                            onClick={() => handleUpdateSchoolStatus(school.id, 'suspended')}
                            className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700"
                          >
                            Suspend
                          </button>
                        )}
                        <button onClick={() => setDeleteConfirm({ collection: 'schools', id: school.id })} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">School</th>
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
                          user.role === 'super_admin' ? "bg-zinc-900 text-white" :
                          user.role === 'teacher' ? "bg-blue-100 text-blue-700" : 
                          user.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                          user.role === 'provider' ? "bg-amber-100 text-amber-700" :
                          "bg-purple-100 text-purple-700"
                        )}>
                          {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'School Manager' : user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-sm">
                        {schools.find(s => s.id === user.schoolId)?.name || '-'}
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
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  School: {schools.find(s => s.id === course.schoolId)?.name || 'Independent / Unknown'}
                </p>
                {course.adminComments && (
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <p className="text-[10px] font-bold text-purple-600 uppercase mb-1">Admin Comment</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 italic">"{course.adminComments}"</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <button 
                    onClick={() => { setSelectedCourse(course); setCourseComment(course.adminComments || ''); setShowCommentModal(true); }}
                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Comment
                  </button>
                  <button onClick={() => setDeleteConfirm({ collection: 'courses', id: course.id })} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
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
                      const matchesSearch = !searchQuery || 
                        e.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        e.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesFilter = paymentFilter === 'all' || 
                        (paymentFilter === 'verified' && e.paymentVerified) || 
                        (paymentFilter === 'pending' && !e.paymentVerified);
                      return matchesSearch && matchesFilter;
                    })
                    .map(enrollment => (
                      <tr key={enrollment.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold">{enrollment.studentName || 'Unknown Student'}</span>
                            <span className="text-[10px] text-zinc-500">{enrollment.studentEmail}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{enrollment.courseTitle || 'Unknown Course'}</span>
                            {enrollment.price > 0 && <span className="text-[10px] text-emerald-600 font-bold">${enrollment.price}</span>}
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
                    ))}
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
        title={editingItem ? `Edit User` : `Add New User`}
      >
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
              <option value="super_admin">Super Admin</option>
              <option value="admin">School Manager</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold shadow-lg">
              {editingItem ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        title="Course Feedback"
      >
        <form onSubmit={handleAddCourseComment} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Admin Comments</label>
            <textarea 
              required 
              value={courseComment}
              onChange={(e) => setCourseComment(e.target.value)}
              placeholder="Provide feedback or comments on this course..."
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent h-32 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCommentModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold shadow-lg">
              Save Comment
            </button>
          </div>
        </form>
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

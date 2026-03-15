import React, { useState, useEffect } from 'react';
import { Users, Settings, Plus, School as SchoolIcon, BookOpen, UserPlus, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, Timestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const AdminView: React.FC = () => {
  const { profile } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'schools' | 'classes' | 'users' | 'courses' | 'exams'>('schools');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student' | 'provider'>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  // Form states
  const [newSchool, setNewSchool] = useState({ name: '', address: '', adminEmail: '', contactPhone: '', academicStructure: 'K-12' });
  const [newClass, setNewClass] = useState({ name: '', grade: '', teacherId: '', schoolId: '' });
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'student' as any, classId: '', specialization: '', schoolId: '', schoolIds: [] as string[], isIndependent: false });
  const [editingItem, setEditingItem] = useState<any>(null);

  const isSuperAdmin = profile?.email === 'beshegercom@gmail.com';

  useEffect(() => {
    if (!profile) return;

    let unsubSchools: () => void = () => {};
    let unsubClasses: () => void = () => {};
    let unsubUsers: () => void = () => {};
    let unsubCourses: () => void = () => {};
    let unsubExams: () => void = () => {};

    const currentSchoolId = selectedSchoolId || profile.schoolId;

    if (isSuperAdmin && !selectedSchoolId) {
      // Super Admin sees all schools, all users, and all classes (for assignment)
      unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
        setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'schools'));
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
      unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
        setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));
    } else if (currentSchoolId) {
      // School Admin or Super Admin managing a specific school
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

      if (!selectedSchoolId && profile.role === 'admin') {
        setActiveSubTab('classes');
      }
    }

    return () => {
      unsubSchools();
      unsubClasses();
      unsubUsers();
      unsubCourses();
      unsubExams();
    };
  }, [profile, isSuperAdmin, selectedSchoolId]);

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = editingItem?.id || doc(collection(db, 'schools')).id;
    await setDoc(doc(db, 'schools', schoolId), {
      ...newSchool,
      status: 'active',
      createdAt: editingItem?.createdAt || Timestamp.now()
    }, { merge: true });
    setShowAddModal(false);
    setEditingItem(null);
    setNewSchool({ name: '', address: '', adminEmail: '', contactPhone: '', academicStructure: 'K-12' });
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setNewClass({ name: '', grade: '', teacherId: '', schoolId: '' });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, collectionName, id));
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    if (activeSubTab === 'schools') setNewSchool({ name: item.name, address: item.address, adminEmail: item.adminEmail, contactPhone: item.contactPhone || '', academicStructure: item.academicStructure || 'K-12' });
    if (activeSubTab === 'classes') setNewClass({ name: item.name, grade: item.grade, teacherId: item.teacherId || '', schoolId: item.schoolId || '' });
    if (activeSubTab === 'users') setNewUser({ email: item.email, displayName: item.displayName, role: item.role, classId: item.classId || '', specialization: item.specialization || '', schoolId: item.schoolId || '', schoolIds: item.schoolIds || [], isIndependent: item.isIndependent || false });
    setShowAddModal(true);
  };

  const openAddUserModal = (role?: 'student' | 'teacher' | 'admin' | 'provider', classId?: string, schoolId?: string) => {
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

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {selectedSchoolId && (
              <button 
                onClick={() => { setSelectedSchoolId(null); setActiveSubTab('schools'); }}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-900 flex items-center gap-1"
              >
                ← Back to Schools
              </button>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {selectedSchoolId ? schools.find(s => s.id === selectedSchoolId)?.name : (isSuperAdmin ? 'Global Administration' : 'School Administration')}
          </h1>
          <p className="text-zinc-500 mt-1">
            {selectedSchoolId ? 'Manage this school\'s resources and users.' : (isSuperAdmin ? 'Manage schools and platform-wide settings.' : 'Manage your school, classes, and users.')}
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
                onClick={() => openAddUserModal('student')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Add Student
              </button>
            </>
          ) : activeSubTab === 'schools' ? (
            <button 
              onClick={() => { setEditingItem(null); setShowAddModal(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add School
            </button>
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
        {isSuperAdmin && !selectedSchoolId && (
          <button 
            onClick={() => setActiveSubTab('schools')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'schools' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            Schools
          </button>
        )}
        
        {(selectedSchoolId || !isSuperAdmin) && (
          <>
            <button 
              onClick={() => setActiveSubTab('classes')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'classes' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
            >
              Classes
            </button>
            <button 
              onClick={() => setActiveSubTab('users')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'users' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
            >
              Users
            </button>
            <button 
              onClick={() => setActiveSubTab('courses')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'courses' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
            >
              Courses
            </button>
            <button 
              onClick={() => setActiveSubTab('exams')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'exams' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
            >
              Exams
            </button>
          </>
        )}

        {isSuperAdmin && !selectedSchoolId && (
          <>
            <button 
              onClick={() => setActiveSubTab('classes')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'classes' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
            >
              All Classes
            </button>
            <button 
              onClick={() => setActiveSubTab('users')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeSubTab === 'users' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
            >
              All Users
            </button>
          </>
        )}
        
        {activeSubTab === 'users' && (
          <div className="ml-auto flex items-center gap-2 bg-zinc-100 p-1 rounded-xl">
            {(['all', 'admin', 'teacher', 'student', 'provider'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  roleFilter === role ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                {role}s
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'schools' && isSuperAdmin && (
          <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-black/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">School Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Address</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Admin Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Structure</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(school => (
                  <tr key={school.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-bold">{school.name}</td>
                    <td className="px-6 py-4 text-zinc-500">{school.address}</td>
                    <td className="px-6 py-4 text-zinc-500">{school.adminEmail}</td>
                    <td className="px-6 py-4 text-zinc-500">{school.academicStructure}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setSelectedSchoolId(school.id); setActiveSubTab('classes'); }}
                          className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg hover:bg-black transition-all"
                        >
                          Manage
                        </button>
                        <button onClick={() => startEdit(school)} className="text-zinc-400 hover:text-zinc-900 transition-colors"><Settings className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete('schools', school.id)} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
              <div key={cls.id} className="p-6 bg-white border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{cls.name}</h3>
                <p className="text-zinc-500 text-sm">Grade: {cls.grade}</p>
                {isSuperAdmin && (
                  <p className="text-[10px] text-zinc-400 mt-1">
                    School: {schools.find(s => s.id === cls.schoolId)?.name || 'Unknown'}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <button 
                    onClick={() => openAddUserModal('student', cls.id, cls.schoolId)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <UserPlus className="w-3 h-3" />
                    Add Student
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(cls)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400"><Settings className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('classes', cls.id)} className="p-2 hover:bg-zinc-100 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-black/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Role</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">School</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Class / Specialization</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u => roleFilter === 'all' || u.role === roleFilter)
                  .map(user => (
                    <tr key={user.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-bold">{user.displayName}</td>
                      <td className="px-6 py-4 text-zinc-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          user.role === 'teacher' ? "bg-blue-100 text-blue-700" : 
                          user.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                          user.role === 'provider' ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {user.role}
                        </span>
                        {user.isIndependent && (
                          <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 text-zinc-500 text-[8px] font-black uppercase rounded">Independent</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">
                        {schools.find(s => s.id === user.schoolId)?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">
                        {user.role === 'teacher' ? (
                          <div>
                            <p className="font-medium text-zinc-700">{user.specialization || 'No specialization'}</p>
                            <p className="text-[10px]">{user.schoolIds?.length || 0} Schools</p>
                          </div>
                        ) : user.role === 'student' ? (
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3 h-3 text-emerald-500" />
                            <span className="font-medium text-zinc-700">
                              {classes.find(c => c.id === user.classId)?.name || 'Unassigned'}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(user)} className="text-zinc-400 hover:text-zinc-900 transition-colors"><Settings className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete('users', user.id)} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
              <div key={course.id} className="p-6 bg-white border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{course.title}</h3>
                <p className="text-zinc-500 text-sm line-clamp-2">{course.description}</p>
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">By {course.teacherName}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete('courses', course.id)} className="p-2 hover:bg-zinc-100 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {courses.length === 0 && <p className="text-zinc-400 italic text-sm col-span-full py-12 text-center">No courses found for this school.</p>}
          </div>
        )}

        {activeSubTab === 'exams' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(exam => (
              <div key={exam.id} className="p-6 bg-white border border-black/5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{exam.title}</h3>
                <p className="text-zinc-500 text-sm line-clamp-2">{exam.description}</p>
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">{exam.questions?.length || 0} Questions</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete('exams', exam.id)} className="p-2 hover:bg-zinc-100 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {exams.length === 0 && <p className="text-zinc-400 italic text-sm col-span-full py-12 text-center">No exams found for this school.</p>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-black/5 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-2xl font-bold mb-6">
                {editingItem ? 'Edit' : 'Add'} {activeSubTab === 'schools' ? 'School' : activeSubTab === 'classes' ? 'Class' : 'User'}
              </h2>
              
              {activeSubTab === 'schools' && (
                <form onSubmit={handleAddSchool} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">School Name</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newSchool.name} onChange={e => setNewSchool({...newSchool, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Address</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newSchool.address} onChange={e => setNewSchool({...newSchool, address: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Admin Email</label>
                      <input required type="email" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newSchool.adminEmail} onChange={e => setNewSchool({...newSchool, adminEmail: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Contact Phone</label>
                      <input className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newSchool.contactPhone} onChange={e => setNewSchool({...newSchool, contactPhone: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Academic Structure</label>
                    <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newSchool.academicStructure} onChange={e => setNewSchool({...newSchool, academicStructure: e.target.value})}>
                      <option value="K-12">K-12</option>
                      <option value="Primary">Primary (K-6)</option>
                      <option value="Secondary">Secondary (7-12)</option>
                      <option value="Higher Ed">Higher Education</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">{editingItem ? 'Update' : 'Add'} School</button>
                  </div>
                </form>
              )}

              {activeSubTab === 'classes' && (
                <form onSubmit={handleAddClass} className="space-y-4">
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">School</label>
                      <select required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newClass.schoolId} onChange={e => setNewClass({...newClass, schoolId: e.target.value})}>
                        <option value="">Select School</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Class Name</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Grade</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newClass.grade} onChange={e => setNewClass({...newClass, grade: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Assign Teacher</label>
                    <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newClass.teacherId} onChange={e => setNewClass({...newClass, teacherId: e.target.value})}>
                      <option value="">Select Teacher</option>
                      {users
                        .filter(u => u.role === 'teacher' && (!isSuperAdmin || !newClass.schoolId || u.schoolId === newClass.schoolId))
                        .map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)
                      }
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">{editingItem ? 'Update' : 'Add'} Class</button>
                  </div>
                </form>
              )}

              {activeSubTab === 'users' && (
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Display Name</label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newUser.displayName} onChange={e => setNewUser({...newUser, displayName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Email</label>
                    <input required type="email" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Role</label>
                    <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any, isIndependent: e.target.value === 'provider'})}>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">School Admin</option>
                      <option value="provider">Independent Provider</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input 
                      type="checkbox" 
                      checked={newUser.isIndependent} 
                      onChange={e => setNewUser({...newUser, isIndependent: e.target.checked})}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label className="text-sm font-medium text-zinc-600">Independent Account</label>
                  </div>
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Primary School</label>
                      <select required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newUser.schoolId} onChange={e => setNewUser({...newUser, schoolId: e.target.value})}>
                        <option value="">Select School</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  {newUser.role === 'teacher' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Specialization</label>
                        <input className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newUser.specialization} onChange={e => setNewUser({...newUser, specialization: e.target.value})} placeholder="e.g. Mathematics, Physics" />
                      </div>
                      {isSuperAdmin && (
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 mb-1">Link to Schools</label>
                          <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-zinc-200 rounded-xl">
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
                      <label className="block text-sm font-bold text-zinc-700 mb-1">Assign to Class</label>
                      <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newUser.classId} onChange={e => setNewUser({...newUser, classId: e.target.value})}>
                        <option value="">No Class</option>
                        {classes
                          .filter(c => !newUser.schoolId || c.schoolId === newUser.schoolId || c.schoolId === profile?.schoolId)
                          .map(c => <option key={c.id} value={c.id}>{c.name} ({schools.find(s => s.id === c.schoolId)?.name || 'Unknown School'})</option>)
                        }
                      </select>
                    </div>
                  )}
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">{editingItem ? 'Update' : 'Add'} User</button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

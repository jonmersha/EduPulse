import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Users, UserPlus, BookOpen, Trash2, Edit2, Upload, Link as LinkIcon, Search, ChevronRight, X, Check, MoreVertical, LayoutDashboard, GraduationCap, Users2, UserCircle, School } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';

interface UserData {
  uid: string;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'parent';
  schoolId: string;
  studentIds?: string[];
  parentIds?: string[];
}

interface ClassData {
  id: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
}

const SchoolManagerView: React.FC = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('');
  const [teachers, setTeachers] = useState<UserData[]>([]);
  const [students, setStudents] = useState<UserData[]>([]);
  const [parents, setParents] = useState<UserData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'teachers' | 'students' | 'parents' | 'classes'>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState<{role: 'teacher' | 'student' | 'parent', classId?: string} | null>(null);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState<{studentId: string} | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadRole, setBulkUploadRole] = useState<'teacher' | 'student' | 'parent'>('student');
  const [showEnrollStudentModal, setShowEnrollStudentModal] = useState<{classId: string} | null>(null);
  
  // Form States
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  const [newClass, setNewClass] = useState({ name: '', teacherId: '' });
  const [linkParentEmail, setLinkParentEmail] = useState('');
  
  // Bulk Upload
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkUploadStatus, setBulkUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!schoolId) return;

    // Fetch School Info
    const schoolUnsub = onSnapshot(doc(db, 'schools', schoolId), (doc) => {
      if (doc.exists()) setSchoolName(doc.data().name);
    });

    // Fetch Teachers
    const teachersQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'teacher'));
    const teachersUnsub = onSnapshot(teachersQuery, (snapshot) => {
      setTeachers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
    });

    // Fetch Students
    const studentsQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'student'));
    const studentsUnsub = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
    });

    // Fetch Parents
    const parentsQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'parent'));
    const parentsUnsub = onSnapshot(parentsQuery, (snapshot) => {
      setParents(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
    });

    // Fetch Classes
    const classesUnsub = onSnapshot(collection(db, 'schools', schoolId, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassData)));
      setLoading(false);
    });

    return () => {
      schoolUnsub();
      teachersUnsub();
      studentsUnsub();
      parentsUnsub();
      classesUnsub();
    };
  }, [schoolId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddUserModal || !schoolId) return;

    try {
      // In a real app, we'd use a Cloud Function to create the Auth user
      // For this demo, we'll just create a placeholder document in 'users'
      // The user would then sign in with Google and it would link up
      const userRef = doc(collection(db, 'users'));
      await setDoc(userRef, {
        uid: userRef.id,
        name: newUser.name,
        email: newUser.email,
        role: showAddUserModal.role,
        schoolId: schoolId,
        classId: showAddUserModal.classId || null,
        createdAt: new Date().toISOString()
      });

      setNewUser({ name: '', email: '' });
      setShowAddUserModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      const teacher = teachers.find(t => t.uid === newClass.teacherId);
      await addDoc(collection(db, 'schools', schoolId, 'classes'), {
        name: newClass.name,
        teacherId: newClass.teacherId || null,
        teacherName: teacher?.name || null,
        createdAt: new Date().toISOString()
      });

      setNewClass({ name: '', teacherId: '' });
      setShowAddClassModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `schools/${schoolId}/classes`);
    }
  };

  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLinkModal || !schoolId) return;

    try {
      // Find parent by email
      const parentQuery = query(collection(db, 'users'), where('email', '==', linkParentEmail), where('role', '==', 'parent'));
      const parentSnap = await getDocs(parentQuery);

      if (parentSnap.empty) {
        alert('Parent not found with that email.');
        return;
      }

      const parentDoc = parentSnap.docs[0];
      const parentId = parentDoc.id;
      const studentId = showLinkModal.studentId;

      // Update Parent's studentIds
      const parentData = parentDoc.data() as UserData;
      const currentStudentIds = parentData.studentIds || [];
      if (!currentStudentIds.includes(studentId)) {
        await updateDoc(doc(db, 'users', parentId), {
          studentIds: [...currentStudentIds, studentId]
        });
      }

      // Update Student's parentIds
      const studentDoc = students.find(s => s.uid === studentId);
      const currentParentIds = studentDoc?.parentIds || [];
      if (!currentParentIds.includes(parentId)) {
        await updateDoc(doc(db, 'users', studentId), {
          parentIds: [...currentParentIds, parentId]
        });
      }

      setLinkParentEmail('');
      setShowLinkModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleBulkUpload = () => {
    if (!bulkUploadFile || !schoolId) return;

    setBulkUploadProgress(0);
    setBulkUploadStatus('Parsing CSV...');

    Papa.parse(bulkUploadFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        setBulkUploadStatus(`Uploading ${data.length} ${bulkUploadRole}s...`);
        
        const batch = writeBatch(db);
        let count = 0;

        for (const row of data) {
          if (row.email && row.name) {
            const userRef = doc(collection(db, 'users'));
            batch.set(userRef, {
              uid: userRef.id,
              name: row.name,
              email: row.email,
              role: bulkUploadRole,
              schoolId: schoolId,
              createdAt: new Date().toISOString()
            });
            count++;
          }
        }

        try {
          await batch.commit();
          setBulkUploadProgress(100);
          setBulkUploadStatus(`Successfully uploaded ${count} users.`);
          setTimeout(() => {
            setShowBulkUploadModal(false);
            setBulkUploadFile(null);
            setBulkUploadProgress(0);
            setBulkUploadStatus('');
          }, 2000);
        } catch (error) {
          setBulkUploadStatus('Error uploading batch.');
          console.error(error);
        }
      }
    });
  };

  const handleEnrollStudent = async (studentId: string) => {
    if (!showEnrollStudentModal) return;
    try {
      await updateDoc(doc(db, 'users', studentId), {
        classId: showEnrollStudentModal.classId
      });
      setShowEnrollStudentModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${studentId}`);
    }
  };

  const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button 
            onClick={() => navigate('/schools')}
            className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-4 hover:text-purple-600 transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            Back to Schools
          </button>
          <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">
            <School size={14} />
            School Management
          </div>
          <h2 className="text-4xl font-black tracking-tight">{schoolName || 'Loading...'}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setBulkUploadRole('student'); setShowBulkUploadModal(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            <Upload size={18} />
            Bulk Upload
          </button>
          <button 
            onClick={() => setShowAddClassModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            New Class
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'teachers', label: 'Teachers', icon: UserCircle },
          { id: 'students', label: 'Students', icon: GraduationCap },
          { id: 'parents', label: 'Parents', icon: Users2 },
          { id: 'classes', label: 'Classes', icon: BookOpen },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Teachers', value: teachers.length, icon: UserCircle, color: 'bg-blue-500' },
              { label: 'Total Students', value: students.length, icon: GraduationCap, color: 'bg-purple-500' },
              { label: 'Total Parents', value: parents.length, icon: Users2, color: 'bg-pink-500' },
              { label: 'Total Classes', value: classes.length, icon: BookOpen, color: 'bg-orange-500' },
            ].map((stat, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                key={stat.label} 
                className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm"
              >
                <div className={`${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-zinc-200/50 dark:shadow-none`}>
                  <stat.icon size={24} />
                </div>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-4xl font-black mt-2">{stat.value}</h3>
              </motion.div>
            ))}
          </div>
        )}

        {(activeTab === 'teachers' || activeTab === 'students' || activeTab === 'parents') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight capitalize">{activeTab}</h3>
              <button 
                onClick={() => setShowAddUserModal({ role: activeTab.slice(0, -1) as any })}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm"
              >
                <UserPlus size={16} />
                Add {activeTab.slice(0, -1)}
              </button>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Name</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Email</th>
                    {activeTab === 'students' && <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Class</th>}
                    {activeTab === 'students' && <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Parents</th>}
                    {activeTab === 'parents' && <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Students</th>}
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {(activeTab === 'teachers' ? teachers : activeTab === 'students' ? students : parents).map(user => (
                    <tr key={user.uid} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-8 py-5 font-bold">{user.name}</td>
                      <td className="px-8 py-5 text-zinc-500 font-medium">{user.email}</td>
                      {activeTab === 'students' && (
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                            {classes.find(c => c.id === (user as any).classId)?.name || 'Unassigned'}
                          </span>
                        </td>
                      )}
                      {activeTab === 'students' && (
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                              {user.parentIds?.length || 0} Linked
                            </span>
                            <button 
                              onClick={() => setShowLinkModal({ studentId: user.uid })}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                            >
                              <LinkIcon size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                      {activeTab === 'parents' && (
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                            {user.studentIds?.length || 0} Children
                          </span>
                        </td>
                      )}
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-zinc-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"><Edit2 size={16} /></button>
                          <button className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
              <div key={cls.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm group">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowEnrollStudentModal({ classId: cls.id })}
                      className="p-2 text-zinc-400 hover:text-purple-600 rounded-xl transition-all"
                      title="Enroll Student"
                    >
                      <UserPlus size={18} />
                    </button>
                    <button className="p-2 text-zinc-400 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{cls.name}</h3>
                <div className="mt-6 flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                  <div className="w-10 h-10 bg-white dark:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400">
                    <UserCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Teacher</p>
                    <p className="text-sm font-bold">{cls.teacherName || 'Not Assigned'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={!!showAddUserModal} 
        onClose={() => setShowAddUserModal(null)}
        title={`Add New ${showAddUserModal?.role}`}
      >
        <form onSubmit={handleAddUser} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Full Name</label>
            <input required type="text" placeholder="e.g. John Doe" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Email Address</label>
            <input required type="email" placeholder="e.g. john@example.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium" />
          </div>
          <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Create {showAddUserModal?.role}</button>
        </form>
      </Modal>

      <Modal isOpen={!!showEnrollStudentModal} onClose={() => setShowEnrollStudentModal(null)} title="Enroll Student in Class">
        <div className="space-y-6">
          <p className="text-sm text-zinc-500 font-medium">Select a student to enroll in {classes.find(c => c.id === showEnrollStudentModal?.classId)?.name}.</p>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
            {students.filter(s => (s as any).classId !== showEnrollStudentModal?.classId).map(student => (
              <button
                key={student.uid}
                onClick={() => handleEnrollStudent(student.uid)}
                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all text-left"
              >
                <div>
                  <p className="font-bold">{student.name}</p>
                  <p className="text-xs text-zinc-500">{student.email}</p>
                </div>
                <ChevronRight size={18} className="text-zinc-400" />
              </button>
            ))}
            {students.filter(s => (s as any).classId !== showEnrollStudentModal?.classId).length === 0 && (
              <p className="text-center py-4 text-zinc-500 text-sm">No students available to enroll.</p>
            )}
          </div>
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              onClick={() => {
                const classId = showEnrollStudentModal?.classId;
                setShowEnrollStudentModal(null);
                setShowAddUserModal({ role: 'student', classId });
              }}
              className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Create New Student
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} title="Create New Class">
        <form onSubmit={handleAddClass} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Class Name</label>
            <input required type="text" placeholder="e.g. Grade 10 - Science" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Assign Teacher</label>
            <select value={newClass.teacherId} onChange={(e) => setNewClass({ ...newClass, teacherId: e.target.value })} className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium appearance-none">
              <option value="">Select a Teacher</option>
              {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Create Class</button>
        </form>
      </Modal>

      <Modal isOpen={!!showLinkModal} onClose={() => setShowLinkModal(null)} title="Link Parent to Student">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 font-medium">Select a parent from the school list or search by email.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="email" 
                placeholder="Search parent by email..." 
                value={linkParentEmail} 
                onChange={(e) => setLinkParentEmail(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium text-sm" 
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
            {parents
              .filter(p => !linkParentEmail || p.email.toLowerCase().includes(linkParentEmail.toLowerCase()))
              .map(parent => (
                <button
                  key={parent.uid}
                  onClick={async () => {
                    if (!showLinkModal) return;
                    try {
                      const studentId = showLinkModal.studentId;
                      const parentId = parent.uid;

                      // Update Parent
                      const currentStudentIds = parent.studentIds || [];
                      if (!currentStudentIds.includes(studentId)) {
                        await updateDoc(doc(db, 'users', parentId), {
                          studentIds: [...currentStudentIds, studentId]
                        });
                      }

                      // Update Student
                      const studentDoc = students.find(s => s.uid === studentId);
                      const currentParentIds = studentDoc?.parentIds || [];
                      if (!currentParentIds.includes(parentId)) {
                        await updateDoc(doc(db, 'users', studentId), {
                          parentIds: [...currentParentIds, parentId]
                        });
                      }

                      setShowLinkModal(null);
                      setLinkParentEmail('');
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, 'users');
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all text-left"
                >
                  <div>
                    <p className="font-bold">{parent.name}</p>
                    <p className="text-xs text-zinc-500">{parent.email}</p>
                  </div>
                  <Plus size={18} className="text-purple-600" />
                </button>
              ))}
            {parents.length === 0 && (
              <p className="text-center py-4 text-zinc-500 text-sm">No parents found in this school.</p>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              onClick={() => {
                setShowLinkModal(null);
                setShowAddUserModal({ role: 'parent' });
              }}
              className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Create New Parent
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showBulkUploadModal} onClose={() => setShowBulkUploadModal(false)} title={`Bulk Upload ${bulkUploadRole}s`}>
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            {['teacher', 'student', 'parent'].map(role => (
              <button 
                key={role} 
                onClick={() => setBulkUploadRole(role as any)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${bulkUploadRole === role ? 'bg-white dark:bg-zinc-700 shadow-sm text-purple-600' : 'text-zinc-500'}`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}s
              </button>
            ))}
          </div>
          <div className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mx-auto">
              <Upload size={32} />
            </div>
            <div>
              <p className="font-bold">Select CSV File</p>
              <p className="text-xs text-zinc-500 mt-1">File must have "name" and "email" columns.</p>
            </div>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm"
            >
              {bulkUploadFile ? bulkUploadFile.name : 'Choose File'}
            </button>
          </div>
          {bulkUploadStatus && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Status</p>
              <p className="text-sm font-medium">{bulkUploadStatus}</p>
              {bulkUploadProgress > 0 && (
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-purple-600 transition-all duration-500" style={{ width: `${bulkUploadProgress}%` }} />
                </div>
              )}
            </div>
          )}
          <button 
            disabled={!bulkUploadFile || bulkUploadProgress > 0}
            onClick={handleBulkUpload}
            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            Start Upload
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SchoolManagerView;

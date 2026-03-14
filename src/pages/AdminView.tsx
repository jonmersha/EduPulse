import React, { useState, useEffect } from 'react';
import { Users, Settings, Plus, School as SchoolIcon, BookOpen, UserPlus, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, Timestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const AdminView: React.FC = () => {
  const { profile } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'schools' | 'classes' | 'users'>('schools');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newSchool, setNewSchool] = useState({ name: '', address: '', adminEmail: '', contactPhone: '', academicStructure: 'K-12' });
  const [newClass, setNewClass] = useState({ name: '', grade: '', teacherId: '' });
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'student' as any, classId: '', specialization: '', schoolIds: [] as string[] });
  const [editingItem, setEditingItem] = useState<any>(null);

  const isSuperAdmin = profile?.email === 'beshegercom@gmail.com';

  useEffect(() => {
    if (!profile) return;

    let unsubSchools: () => void = () => {};
    let unsubClasses: () => void = () => {};
    let unsubUsers: () => void = () => {};

    if (isSuperAdmin) {
      // Super Admin sees all schools and all users
      unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
        setSchools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    } else if (profile.role === 'admin' && profile.schoolId) {
      // School Admin sees their school's classes and users
      const classesQuery = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
      unsubClasses = onSnapshot(classesQuery, (snap) => {
        setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const usersQuery = query(collection(db, 'users'), where('schoolId', '==', profile.schoolId));
      unsubUsers = onSnapshot(usersQuery, (snap) => {
        setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      setActiveSubTab('classes');
    }

    return () => {
      unsubSchools();
      unsubClasses();
      unsubUsers();
    };
  }, [profile, isSuperAdmin]);

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
    if (!profile?.schoolId) return;
    const classId = editingItem?.id || doc(collection(db, 'classes')).id;
    await setDoc(doc(db, 'classes', classId), {
      ...newClass,
      schoolId: profile.schoolId,
      createdAt: editingItem?.createdAt || Timestamp.now()
    }, { merge: true });
    setShowAddModal(false);
    setEditingItem(null);
    setNewClass({ name: '', grade: '', teacherId: '' });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = profile?.schoolId || (newUser.schoolIds.length > 0 ? newUser.schoolIds[0] : null);
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
    setNewUser({ email: '', displayName: '', role: 'student', classId: '', specialization: '', schoolIds: [] });
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, collectionName, id));
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    if (activeSubTab === 'schools') setNewSchool({ name: item.name, address: item.address, adminEmail: item.adminEmail, contactPhone: item.contactPhone || '', academicStructure: item.academicStructure || 'K-12' });
    if (activeSubTab === 'classes') setNewClass({ name: item.name, grade: item.grade, teacherId: item.teacherId || '' });
    if (activeSubTab === 'users') setNewUser({ email: item.email, displayName: item.displayName, role: item.role, classId: item.classId || '', specialization: item.specialization || '', schoolIds: item.schoolIds || [] });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isSuperAdmin ? 'Global Administration' : 'School Administration'}
          </h1>
          <p className="text-zinc-500 mt-1">
            {isSuperAdmin ? 'Manage schools and platform-wide settings.' : 'Manage your school, classes, and users.'}
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          {activeSubTab === 'schools' ? 'Add School' : activeSubTab === 'classes' ? 'Add Class' : 'Add User'}
        </button>
      </header>

      <div className="flex gap-4 border-b border-black/5 pb-4">
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveSubTab('schools')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeSubTab === 'schools' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
          >
            Schools
          </button>
        )}
        {!isSuperAdmin && (
          <>
            <button 
              onClick={() => setActiveSubTab('classes')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeSubTab === 'classes' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
            >
              Classes
            </button>
            <button 
              onClick={() => setActiveSubTab('users')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeSubTab === 'users' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100")}
            >
              Users
            </button>
          </>
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
                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {users.filter(u => u.classId === cls.id).length} Students
                  </span>
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
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Details</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-bold">{user.displayName}</td>
                    <td className="px-6 py-4 text-zinc-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        user.role === 'teacher' ? "bg-blue-100 text-blue-700" : 
                        user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-sm">
                      {user.role === 'teacher' ? (
                        <div>
                          <p className="font-medium text-zinc-700">{user.specialization || 'No specialization'}</p>
                          <p className="text-[10px]">{user.schoolIds?.length || 0} Schools</p>
                        </div>
                      ) : (
                        classes.find(c => c.id === user.classId)?.name || '-'
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
                      {users.filter(u => u.role === 'teacher').map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}
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
                    <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">School Admin</option>
                    </select>
                  </div>
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
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

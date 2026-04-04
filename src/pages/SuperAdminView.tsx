import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, School, Users, Trash2, Edit2, ChevronRight, Search, LayoutGrid, List, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SchoolData {
  id: string;
  name: string;
  address: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
}

const SuperAdminView: React.FC = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', address: '', managerEmail: '', managerName: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schools'), (snapshot) => {
      const schoolList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolData));
      setSchools(schoolList);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schools'));

    return () => unsubscribe();
  }, []);

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Create school
      const schoolRef = await addDoc(collection(db, 'schools'), {
        name: newSchool.name,
        address: newSchool.address,
        createdAt: new Date().toISOString()
      });

      // 2. If manager email provided, we'd normally send an invite
      // For this demo, we'll just store the intended manager info
      if (newSchool.managerEmail) {
        await updateDoc(schoolRef, {
          managerEmail: newSchool.managerEmail,
          managerName: newSchool.managerName
        });
      }

      setNewSchool({ name: '', address: '', managerEmail: '', managerName: '' });
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schools');
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this school?')) return;
    try {
      await deleteDoc(doc(db, 'schools', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schools/${id}`);
    }
  };

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Schools</h2>
          <p className="text-zinc-500 font-medium mt-2">Manage all educational institutions in the system.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Add New School
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search schools by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-purple-600' : 'text-zinc-500'}`}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm text-purple-600' : 'text-zinc-500'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          <AnimatePresence mode="popLayout">
            {filteredSchools.map((school) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={school.id}
                className={`group relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-none transition-all overflow-hidden ${viewMode === 'grid' ? 'rounded-[2rem] p-8' : 'rounded-2xl p-4 flex items-center justify-between'}`}
              >
                <div className={viewMode === 'grid' ? "space-y-4" : "flex items-center gap-4"}>
                  <div className={`bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`}>
                    <School size={viewMode === 'grid' ? 32 : 24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight group-hover:text-purple-600 transition-colors">{school.name}</h3>
                    <p className="text-sm text-zinc-500 font-medium mt-1">{school.address}</p>
                  </div>
                </div>

                <div className={viewMode === 'grid' ? "mt-8 pt-6 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between" : "flex items-center gap-3"}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                      <Users size={14} />
                    </div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      {school.managerName || 'No Manager'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/school/${school.id}`)}
                      className="p-2 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all"
                      title="Manage School"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSchool(school.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button className="p-2 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all">
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add School Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-2xl font-black tracking-tight">Add New School</h3>
                <p className="text-zinc-500 font-medium mt-1">Create a new school profile and assign a manager.</p>
              </div>
              <form onSubmit={handleAddSchool} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">School Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. St. Mary's Academy"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Address</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. 123 Education St, NY"
                    value={newSchool.address}
                    onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Manager Name</label>
                    <input 
                      type="text" 
                      placeholder="Full Name"
                      value={newSchool.managerName}
                      onChange={(e) => setNewSchool({ ...newSchool, managerName: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">Manager Email</label>
                    <input 
                      type="email" 
                      placeholder="Email Address"
                      value={newSchool.managerEmail}
                      onChange={(e) => setNewSchool({ ...newSchool, managerEmail: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Create School
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

export default SuperAdminView;

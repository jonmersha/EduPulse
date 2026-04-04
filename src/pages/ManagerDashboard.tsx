import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { Plus, School, Search, LayoutGrid, List, Settings, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SchoolData {
  id: string;
  name: string;
  address: string;
  managerId: string;
}

const ManagerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', address: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;

    // Query schools where this user is the manager
    const q = query(collection(db, 'schools'), where('managerId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schoolList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolData));
      setSchools(schoolList);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schools'));

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    try {
      await addDoc(collection(db, 'schools'), {
        name: newSchool.name,
        address: newSchool.address,
        managerId: profile.uid,
        createdAt: new Date().toISOString()
      });

      setNewSchool({ name: '', address: '' });
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schools');
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
          <h2 className="text-4xl font-black tracking-tight">My Schools</h2>
          <p className="text-zinc-500 font-medium mt-2">Manage all schools assigned to you.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Create New School
        </button>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          type="text" 
          placeholder="Search your schools..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl focus:ring-2 focus:ring-purple-500 transition-all font-medium shadow-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredSchools.map((school) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={school.id}
                onClick={() => navigate(`/school/${school.id}`)}
                className="group relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-none transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <School size={28} />
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-zinc-400 group-hover:text-purple-600 transition-colors">
                    <ChevronRight size={20} />
                  </div>
                </div>
                <h3 className="text-2xl font-black tracking-tight group-hover:text-purple-600 transition-colors">{school.name}</h3>
                <p className="text-sm text-zinc-500 font-medium mt-2">{school.address}</p>
                
                <div className="mt-8 pt-6 border-t border-zinc-50 dark:border-zinc-800 flex items-center gap-2">
                  <Settings size={14} className="text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Click to Manage</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredSchools.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-800">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-300 mx-auto mb-6">
                <School size={40} />
              </div>
              <h3 className="text-xl font-bold">No Schools Found</h3>
              <p className="text-zinc-500 mt-2 max-w-xs mx-auto">You haven't created or been assigned any schools yet.</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="mt-8 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold"
              >
                Create Your First School
              </button>
            </div>
          )}
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
                <h3 className="text-2xl font-black tracking-tight">Create New School</h3>
                <p className="text-zinc-500 font-medium mt-1">Start managing a new educational institution.</p>
              </div>
              <form onSubmit={handleAddSchool} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">School Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Westside High School"
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
                    placeholder="e.g. 456 Education Ave, SF"
                    value={newSchool.address}
                    onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                  />
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

export default ManagerDashboard;

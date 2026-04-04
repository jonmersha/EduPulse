import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, MapPin, School as SchoolIcon, Users, BookOpen } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface SchoolDirectoryViewProps {
  onSelectSchool: (schoolId: string) => void;
}

export const SchoolDirectoryView: React.FC<SchoolDirectoryViewProps> = ({ onSelectSchool }) => {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'schools'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schoolData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchools(schoolData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'schools');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredSchools = schools.filter(school => 
    school.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Schools Directory</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Discover and join educational institutions</p>
        </div>
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search schools by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:text-white transition-all shadow-sm"
          />
        </div>
      </div>

      {filteredSchools.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <SchoolIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No schools found</h3>
          <p className="text-zinc-500">Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map(school => (
            <div 
              key={school.id} 
              onClick={() => onSelectSchool(school.id)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                  {school.logoUrl ? (
                    <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <SchoolIcon className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors line-clamp-2">{school.name}</h3>
                  <div className="flex items-center gap-1 text-zinc-500 text-sm mt-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{school.address || 'Location not specified'}</span>
                  </div>
                </div>
              </div>
              
              {school.description && (
                <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-3 mb-4 flex-1">
                  {school.description}
                </p>
              )}
              
              <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {school.academicStructure || 'K-12'}
                </span>
                <span className="text-emerald-600 text-sm font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  View Profile &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

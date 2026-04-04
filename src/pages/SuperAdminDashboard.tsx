import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const COLLECTIONS = [
  'users', 'schools', 'classes', 'courses', 'lessons', 'exams', 
  'examResults', 'resources', 'questions', 'answers', 'sections',
  'assignments', 'submissions', 'enrollments', 'chatMessages', 
  'conversations', 'directMessages'
];

export default function SuperAdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!profile || profile.role !== 'super_admin') {
    return <div>Access Denied</div>;
  }

  const wipeDatabase = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete EVERYTHING? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setMessage('Wiping database...');

    try {
      for (const colName of COLLECTIONS) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => {
          batch.delete(document.ref);
        });
        await batch.commit();
        console.log(`Deleted ${snapshot.size} documents from ${colName}`);
      }
      setMessage('Database wiped successfully!');
    } catch (error) {
      console.error('Error wiping database:', error);
      setMessage('Error wiping database. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Super Admin Dashboard</h1>
      <div className="bg-red-100 p-4 rounded border border-red-400">
        <h2 className="text-lg font-semibold text-red-800">Danger Zone</h2>
        <p className="text-red-700 mb-4">This action will delete all data in the database.</p>
        <button 
          onClick={wipeDatabase}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? 'Wiping...' : 'Wipe Database'}
        </button>
        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </div>
  );
}

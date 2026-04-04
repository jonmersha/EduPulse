import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { School as SchoolIcon, MapPin, Globe, Mail, Phone, User, ArrowLeft, CheckCircle2, BookOpen } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface SchoolProfileViewProps {
  schoolId: string;
  onBack: () => void;
}

export const SchoolProfileView: React.FC<SchoolProfileViewProps> = ({ schoolId, onBack }) => {
  const { profile } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState<'none' | 'pending' | 'member'>('none');
  const [requestingRole, setRequestingRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchoolAndStatus = async () => {
      try {
        const docRef = doc(db, 'schools', schoolId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSchool({ id: docSnap.id, ...docSnap.data() });
        }

        if (profile) {
          if (profile.schoolId === schoolId || (profile.schoolIds && profile.schoolIds.includes(schoolId))) {
            setJoinStatus('member');
          } else {
            const q = query(
              collection(db, 'joinRequests'), 
              where('schoolId', '==', schoolId),
              where('userId', '==', profile.uid)
            );
            const reqSnap = await getDocs(q);
            if (!reqSnap.empty) {
              const req = reqSnap.docs[0].data();
              if (req.status === 'pending') {
                setJoinStatus('pending');
              } else if (req.status === 'approved') {
                setJoinStatus('member');
              }
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `schools/${schoolId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolAndStatus();
  }, [schoolId, profile]);

  const handleJoin = async (role: 'student' | 'teacher' | 'parent') => {
    if (!profile) return;
    setRequestingRole(role);
    try {
      await addDoc(collection(db, 'joinRequests'), {
        schoolId,
        userId: profile.uid,
        userEmail: profile.email,
        userName: profile.displayName,
        role,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      setJoinStatus('pending');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'joinRequests');
    } finally {
      setRequestingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">School not found</h2>
        <button onClick={onBack} className="mt-4 text-emerald-600 hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </button>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="h-48 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 mb-8">
            <div className="w-32 h-32 bg-white dark:bg-zinc-900 rounded-3xl p-2 shadow-lg shrink-0">
              <div className="w-full h-full bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center overflow-hidden text-emerald-600">
                {school.logoUrl ? (
                  <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <SchoolIcon className="w-12 h-12" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{school.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-zinc-500 dark:text-zinc-400 text-sm">
                {school.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {school.address}
                  </div>
                )}
                {school.academicStructure && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {school.academicStructure}
                  </div>
                )}
              </div>
            </div>
            
            {profile && (
              <div className="flex shrink-0">
                {joinStatus === 'member' ? (
                  <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-2xl font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    Member
                  </div>
                ) : joinStatus === 'pending' ? (
                  <div className="flex items-center gap-2 px-6 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-2xl font-bold">
                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    Request Pending
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-center mb-1">Join School</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleJoin('student')}
                        disabled={requestingRole !== null}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-sm disabled:opacity-50"
                      >
                        As Student
                      </button>
                      <button 
                        onClick={() => handleJoin('parent')}
                        disabled={requestingRole !== null}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all text-sm disabled:opacity-50"
                      >
                        As Parent
                      </button>
                      <button 
                        onClick={() => handleJoin('teacher')}
                        disabled={requestingRole !== null}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm disabled:opacity-50"
                      >
                        As Teacher
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">About the School</h3>
                <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400">
                  {school.description ? (
                    <p className="whitespace-pre-wrap">{school.description}</p>
                  ) : (
                    <p className="italic">No description provided.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">Contact Information</h3>
                <div className="space-y-4">
                  {school.principalName && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{school.principalName}</p>
                        <p className="text-xs text-zinc-500">Principal</p>
                      </div>
                    </div>
                  )}
                  {school.adminEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <a href={`mailto:${school.adminEmail}`} className="text-sm font-medium text-emerald-600 hover:underline break-all">{school.adminEmail}</a>
                        <p className="text-xs text-zinc-500">Email</p>
                      </div>
                    </div>
                  )}
                  {school.contactPhone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{school.contactPhone}</p>
                        <p className="text-xs text-zinc-500">Phone</p>
                      </div>
                    </div>
                  )}
                  {school.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-600 hover:underline break-all">{school.website}</a>
                        <p className="text-xs text-zinc-500">Website</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

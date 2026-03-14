import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserRole } from '../context/AuthContext';
import { cn } from '../lib/utils';

export const SettingsView: React.FC = () => {
  const { profile } = useAuth();
  const [role, setRole] = useState(profile?.role || 'student');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await setDoc(doc(db, 'users', profile.uid), { ...profile, role }, { merge: true });
    setSaving(false);
    window.location.reload(); // Refresh to update sidebar and permissions
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your account and preferences.</p>
      </header>

      <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Profile Information</h2>
          <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-zinc-200 overflow-hidden">
              <img src={profile?.photoURL || `https://i.pravatar.cc/150?u=${profile?.uid}`} alt="Avatar" referrerPolicy="no-referrer" />
            </div>
            <div>
              <p className="font-bold">{profile?.displayName}</p>
              <p className="text-sm text-zinc-500">{profile?.email}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold">Account Role</h2>
          <p className="text-sm text-zinc-500">Choose your role to access different features of the platform.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['student', 'teacher', 'admin', 'parent'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "px-4 py-3 rounded-xl text-xs font-bold capitalize transition-all border",
                  role === r 
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" 
                    : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        <div className="pt-6 border-t border-black/5">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

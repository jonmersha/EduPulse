import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { LogIn, LogOut, School, Users, UserPlus, BookOpen, Settings, Plus, Trash2, Upload, Link as LinkIcon, ChevronRight, Search, LayoutDashboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SuperAdminView from './pages/SuperAdminView';
import SchoolManagerView from './pages/SchoolManagerView';
import ManagerDashboard from './pages/ManagerDashboard';

// --- Types ---
export type UserRole = 'super_admin' | 'school_manager' | 'teacher' | 'student' | 'parent';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId?: string;
  studentIds?: string[];
  parentIds?: string[];
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

// --- Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- Components ---
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const existingProfile = docSnap.data() as UserProfile;
            // Force super_admin role for the primary admin email
            if (firebaseUser.email === 'beshegercom@gmail.com' && existingProfile.role !== 'super_admin') {
              const updatedProfile = { ...existingProfile, role: 'super_admin' as UserRole };
              await setDoc(docRef, updatedProfile);
              setProfile(updatedProfile);
            } else {
              setProfile(existingProfile);
            }
          } else {
            // Default role for first user or new users
            // In a real app, you'd have a more robust way to assign roles
            const isFirstAdmin = firebaseUser.email === 'beshegercom@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'New User',
              email: firebaseUser.email || '',
              role: isFirstAdmin ? 'super_admin' : 'parent', // Default to parent for others
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <School size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">EduManage</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1 uppercase tracking-wider">School System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {profile && (
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              <div className="text-right">
                <p className="text-sm font-bold leading-none">{profile.name}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{profile.role.replace('_', ' ')}</p>
              </div>
              <button 
                onClick={logout}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-500 hover:text-red-500"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
};

const LoginView = () => {
  const { signIn } = useAuth();
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] shadow-2xl shadow-zinc-200 dark:shadow-none border border-zinc-100 dark:border-zinc-800"
      >
        <div className="w-20 h-20 bg-purple-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-purple-500/30">
          <School size={40} />
        </div>
        <h2 className="text-3xl font-black mb-4 tracking-tight">Welcome Back</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-10 font-medium leading-relaxed">
          Manage your schools, teachers, and students with the most advanced education platform.
        </p>
        <button 
          onClick={signIn}
          className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </motion.div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schools" element={<Layout><ManagerDashboard /></Layout>} />
          <Route path="/school/:schoolId" element={<Layout><SchoolManagerView /></Layout>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

const Home = () => {
  const { user, profile, loading, logout } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Layout><LoginView /></Layout>;

  if (profile?.role === 'super_admin') return <Layout><SuperAdminView /></Layout>;
  if (profile?.role === 'school_manager') return <Navigate to="/schools" />;
  
  return (
    <Layout>
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <X size={40} />
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-4">Access Denied</h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-8">
          You are signed in as <span className="font-bold text-zinc-900 dark:text-white">{profile?.email}</span> with the role of <span className="font-bold text-purple-600 uppercase text-xs">{profile?.role.replace('_', ' ')}</span>.
        </p>
        <div className="p-6 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-sm text-zinc-500 font-medium mb-8">
          This dashboard is reserved for Super Admins and School Managers. Please contact your system administrator if you believe this is an error.
        </div>
        <button 
          onClick={logout}
          className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold"
        >
          Sign Out
        </button>
      </div>
    </Layout>
  );
};

export default App;

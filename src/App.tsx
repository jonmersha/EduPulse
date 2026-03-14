/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection, 
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  Search,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  MessageSquare,
  Volume2,
  FileText,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolId?: string;
  photoURL?: string;
  createdAt: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider ---
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // New user defaults to student for demo purposes
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Anonymous',
            role: 'student',
            photoURL: user.photoURL || undefined,
            createdAt: Timestamp.now(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// --- Components ---

const CourseCard = ({ course, onClick }: { course: any, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer"
  >
    <div className="aspect-video bg-zinc-100 relative">
      <img 
        src={course.thumbnail || `https://picsum.photos/seed/${course.id}/800/450`} 
        alt={course.title} 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      {course.price > 0 && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold shadow-sm">
          ${course.price}
        </div>
      )}
    </div>
    <div className="p-5">
      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{course.category || 'General'}</p>
      <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500">By {course.teacherName || 'Instructor'}</span>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-black/5">
        <div className="flex items-center gap-1 text-zinc-400">
          <Users className="w-3 h-3" />
          <span className="text-xs">24 students</span>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
      </div>
    </div>
  </div>
);

const LessonViewer = ({ courseId, onBack }: { courseId: string, onBack: () => void }) => {
  const { profile } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLessons(docs);
      if (docs.length > 0 && !currentLesson) setCurrentLesson(docs[0]);
      setLoading(false);
    });

    // Fetch user's progress
    if (profile) {
      const enrollRef = doc(db, 'enrollments', `${profile.uid}_${courseId}`);
      const unsubEnroll = onSnapshot(enrollRef, (doc) => {
        if (doc.exists()) {
          setCompletedLessons(doc.data().completedLessons || []);
        }
      });
      return () => {
        unsubscribe();
        unsubEnroll();
      };
    }

    return () => unsubscribe();
  }, [courseId, profile]);

  const handleTTS = async () => {
    if (!currentLesson?.content) return;
    setIsSpeaking(true);
    const { generateSpeech } = await import('./services/geminiService');
    const url = await generateSpeech(currentLesson.content);
    setAudioUrl(url);
    setIsSpeaking(false);
  };

  const toggleComplete = async () => {
    if (!profile || !currentLesson) return;
    
    const isCompleted = completedLessons.includes(currentLesson.id);
    const newCompleted = isCompleted 
      ? completedLessons.filter(id => id !== currentLesson.id)
      : [...completedLessons, currentLesson.id];
    
    const progress = lessons.length > 0 ? Math.round((newCompleted.length / lessons.length) * 100) : 0;
    
    const enrollRef = doc(db, 'enrollments', `${profile.uid}_${courseId}`);
    await updateDoc(enrollRef, {
      completedLessons: newCompleted,
      progress: progress,
      lastAccessed: Timestamp.now()
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-6 transition-colors">
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to Courses
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {currentLesson ? (
            <motion.div 
              key={currentLesson.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{currentLesson.title}</h1>
                <div className="flex gap-2">
                  <button 
                    onClick={handleTTS}
                    disabled={isSpeaking}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    title="Listen to lesson"
                  >
                    {isSpeaking ? <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={toggleComplete}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                      completedLessons.includes(currentLesson.id)
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completedLessons.includes(currentLesson.id) ? 'Completed' : 'Mark as Complete'}
                  </button>
                </div>
              </div>

              {audioUrl && (
                <audio controls src={audioUrl} className="w-full mb-6 h-10" autoPlay />
              )}

              <div className="prose prose-zinc max-w-none text-zinc-600 leading-relaxed">
                <Markdown>{currentLesson.content}</Markdown>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white border border-black/5 rounded-3xl p-12 text-center text-zinc-400">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No lessons found for this course.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-lg px-2">Course Content</h3>
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm">
            {lessons.map((lesson, idx) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setCurrentLesson(lesson);
                  setAudioUrl(null);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 text-left border-b border-black/5 last:border-0 transition-colors",
                  currentLesson?.id === lesson.id ? "bg-emerald-50 text-emerald-700" : "hover:bg-zinc-50"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                  currentLesson?.id === lesson.id ? "bg-emerald-600 text-white" : 
                  completedLessons.includes(lesson.id) ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                )}>
                  {completedLessons.includes(lesson.id) ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    completedLessons.includes(lesson.id) && "text-zinc-400 line-through"
                  )}>{lesson.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {lesson.type === 'video' ? <Video className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{lesson.type}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LessonEditor = ({ courseId, onBack }: { courseId: string, onBack: () => void }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: '', content: '', type: 'text', order: 0 });

  useEffect(() => {
    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [courseId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const lessonId = doc(collection(db, 'lessons')).id;
    await setDoc(doc(db, 'lessons', lessonId), {
      ...newLesson,
      courseId,
      order: lessons.length + 1
    });
    setShowAdd(false);
    setNewLesson({ title: '', content: '', type: 'text', order: 0 });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Teaching
        </button>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Lesson
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Course Lessons</h2>
        <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm">
          {lessons.map((lesson, idx) => (
            <div key={lesson.id} className="flex items-center justify-between p-6 border-b border-black/5 last:border-0">
              <div className="flex items-center gap-4">
                <span className="text-zinc-300 font-bold text-xl">{idx + 1}</span>
                <div>
                  <h4 className="font-bold">{lesson.title}</h4>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">{lesson.type}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400"><Settings className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {lessons.length === 0 && (
            <div className="p-12 text-center text-zinc-400">
              <p>No lessons added yet. Click "Add Lesson" to start.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-black/5"
            >
              <h2 className="text-2xl font-bold mb-6">Add Lesson</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Lesson Title</label>
                  <input 
                    required
                    value={newLesson.title}
                    onChange={e => setNewLesson({...newLesson, title: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g. Introduction to Cells"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Content (Markdown)</label>
                  <textarea 
                    required
                    value={newLesson.content}
                    onChange={e => setNewLesson({...newLesson, content: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-48 font-mono text-sm"
                    placeholder="Write your lesson content here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Type</label>
                  <select 
                    value={newLesson.type}
                    onChange={e => setNewLesson({...newLesson, type: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="text">Text</option>
                    <option value="video">Video URL</option>
                    <option value="pdf">PDF Link</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    Add Lesson
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

const CourseManagement = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', category: 'General', isPublic: false, price: 0 });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'courses'), where('teacherId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const courseId = doc(collection(db, 'courses')).id;
    await setDoc(doc(db, 'courses', courseId), {
      ...newCourse,
      teacherId: profile.uid,
      teacherName: profile.displayName,
      createdAt: Timestamp.now()
    });
    setShowCreate(false);
    setNewCourse({ title: '', description: '', category: 'General', isPublic: false, price: 0 });
  };

  if (editingCourse) {
    return <LessonEditor courseId={editingCourse} onBack={() => setEditingCourse(null)} />;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teaching Dashboard</h1>
          <p className="text-zinc-500 mt-1">Manage your courses and student progress.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Create Course
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} onClick={() => setEditingCourse(course.id)} />
        ))}
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-black/5"
            >
              <h2 className="text-2xl font-bold mb-6">Create New Course</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Course Title</label>
                  <input 
                    required
                    value={newCourse.title}
                    onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g. Introduction to Biology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Description</label>
                  <textarea 
                    value={newCourse.description}
                    onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-24"
                    placeholder="What will students learn?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Category</label>
                    <select 
                      value={newCourse.category}
                      onChange={e => setNewCourse({...newCourse, category: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option>General</option>
                      <option>Math</option>
                      <option>Science</option>
                      <option>Programming</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Price ($)</label>
                    <input 
                      type="number"
                      value={newCourse.price}
                      onChange={e => setNewCourse({...newCourse, price: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox"
                    checked={newCourse.isPublic}
                    onChange={e => setNewCourse({...newCourse, isPublic: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label className="text-sm font-medium text-zinc-600">Publish to Marketplace</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    Create
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

const Navbar = () => {
  const { profile, logout } = useAuth();
  
  return (
    <nav className="h-16 border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold italic">E</div>
        <span className="font-bold text-xl tracking-tight">EduPulse</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search courses..." 
            className="pl-10 pr-4 py-2 bg-zinc-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all w-64"
          />
        </div>
        
        {profile && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{profile.displayName}</p>
              <p className="text-xs text-zinc-500 capitalize">{profile.role}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const { profile } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'marketplace', label: 'Marketplace', icon: Search },
    ...(profile?.role === 'admin' ? [{ id: 'school', label: 'School Admin', icon: Settings }] : []),
    ...(profile?.role === 'teacher' ? [{ id: 'my-courses', label: 'Teaching', icon: GraduationCap }] : []),
    ...(profile?.role === 'parent' ? [{ id: 'parent', label: 'Parent Portal', icon: Users }] : []),
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-black/5 h-[calc(100vh-64px)] p-4 flex flex-col gap-2">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
            activeTab === item.id 
              ? "bg-emerald-50 text-emerald-700" 
              : "text-zinc-600 hover:bg-zinc-50"
          )}
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </button>
      ))}
    </aside>
  );
};

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ enrolled: 0, completed: 0, avgProgress: 0 });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      const enrolled = docs.length;
      const completed = docs.filter(d => d.progress === 100).length;
      const totalProgress = docs.reduce((acc, curr) => acc + (curr.progress || 0), 0);
      const avgProgress = enrolled > 0 ? Math.round(totalProgress / enrolled) : 0;
      setStats({ enrolled, completed, avgProgress });
    });
    return () => unsubscribe();
  }, [profile]);
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.displayName}</h1>
        <p className="text-zinc-500 mt-1">Here's what's happening with your learning today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Courses Enrolled</h3>
          <p className="text-3xl font-bold mt-1">{stats.enrolled}</p>
          <p className="text-xs text-emerald-600 mt-2 font-medium">Active learning</p>
        </div>
        
        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Courses Completed</h3>
          <p className="text-3xl font-bold mt-1">{stats.completed}</p>
          <p className="text-xs text-zinc-400 mt-2 font-medium">{stats.enrolled - stats.completed} in progress</p>
        </div>

        <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Average Progress</h3>
          <p className="text-3xl font-bold mt-1">{stats.avgProgress}%</p>
          <p className="text-xs text-emerald-600 mt-2 font-medium">Overall completion</p>
        </div>
      </div>
    </div>
  );
};

const MyCourses = ({ onSelectCourse }: { onSelectCourse: (id: string) => void }) => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const enrollmentData = snapshot.docs.map(doc => doc.data());
      
      if (enrollmentData.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Fetch course details for each enrollment
      const coursePromises = enrollmentData.map(async (enrollment) => {
        const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
        return { id: courseDoc.id, ...courseDoc.data(), progress: enrollment.progress };
      });

      const courseDetails = await Promise.all(coursePromises);
      setCourses(courseDetails);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-64 bg-zinc-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
          <BookOpen className="w-10 h-10 text-zinc-300" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">No courses yet</h2>
        <p className="text-zinc-500 mt-2 max-w-xs">You haven't enrolled in any courses. Explore the marketplace to start learning!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Learning</h1>
        <p className="text-zinc-500 mt-1">Continue where you left off.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => (
          <div 
            key={course.id} 
            onClick={() => onSelectCourse(course.id)}
            className="group bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
          >
            <div className="aspect-video bg-zinc-100 relative">
              <img 
                src={`https://picsum.photos/seed/${course.id}/800/450`} 
                alt={course.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md">{course.category}</span>
              </div>
              <h3 className="font-bold text-lg leading-tight mb-4 line-clamp-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
              
              <div className="mt-auto">
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${course.progress || 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  <span>{course.progress || 0}% Complete</span>
                  <span>By {course.teacherName}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminView = () => (
  <div className="space-y-8">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">School Administration</h1>
      <p className="text-zinc-500 mt-1">Manage school settings, teachers, and students.</p>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-8 bg-white border border-black/5 rounded-3xl text-center">
        <Users className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
        <h3 className="text-xl font-bold mb-2">User Management</h3>
        <p className="text-zinc-500 mb-6">Register new teachers and students to your school.</p>
        <button className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all">Manage Users</button>
      </div>
      <div className="p-8 bg-white border border-black/5 rounded-3xl text-center">
        <Settings className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
        <h3 className="text-xl font-bold mb-2">School Profile</h3>
        <p className="text-zinc-500 mb-6">Update school information and academic calendar.</p>
        <button className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all">Edit Profile</button>
      </div>
    </div>
  </div>
);

const ParentView = () => (
  <div className="space-y-8">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
      <p className="text-zinc-500 mt-1">Track your children's academic progress and attendance.</p>
    </header>
    <div className="bg-white border border-black/5 rounded-3xl p-12 text-center text-zinc-400">
      <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
      <h3 className="text-xl font-bold text-zinc-900 mb-2">Connect Your Child</h3>
      <p className="max-w-md mx-auto">Enter your child's student ID to start receiving updates on their learning journey.</p>
      <div className="mt-8 flex max-w-sm mx-auto gap-2">
        <input className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none" placeholder="Student ID" />
        <button className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">Connect</button>
      </div>
    </div>
  </div>
);

const Marketplace = ({ onSelectCourse }: { onSelectCourse: (id: string) => void }) => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch public courses
    const q = query(collection(db, 'courses'), where('isPublic', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch user's enrolled courses to show "Open" instead of "Enroll"
    if (profile) {
      const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
      const unsubEnroll = onSnapshot(enrollQuery, (snapshot) => {
        setEnrolledCourseIds(snapshot.docs.map(doc => doc.data().courseId));
      });
      return () => {
        unsubscribe();
        unsubEnroll();
      };
    }

    return () => unsubscribe();
  }, [profile]);

  const handleEnroll = async (course: any) => {
    if (!profile) return;
    try {
      await setDoc(doc(db, 'enrollments', `${profile.uid}_${course.id}`), {
        studentId: profile.uid,
        courseId: course.id,
        courseTitle: course.title,
        enrolledAt: Timestamp.now(),
        progress: 0
      });
    } catch (error) {
      console.error("Enrollment failed:", error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Marketplace</h1>
          <p className="text-zinc-500 mt-1">Explore public courses from top educators worldwide.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['All', 'Math', 'Science', 'Programming', 'Languages', 'Art'].map((cat) => (
            <button 
              key={cat}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                cat === 'All' ? "bg-zinc-900 text-white" : "bg-white border border-black/5 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-zinc-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="aspect-video bg-zinc-100 relative">
                <img 
                  src={`https://picsum.photos/seed/${course.id}/800/450`} 
                  alt={course.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-bold shadow-sm">
                  {course.price > 0 ? `$${course.price}` : 'FREE'}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md">{course.category}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">By {course.teacherName}</span>
                </div>
                <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                <p className="text-sm text-zinc-500 line-clamp-2 mb-4 flex-1">{course.description}</p>
                
                {enrolledCourseIds.includes(course.id) ? (
                  <button 
                    onClick={() => onSelectCourse(course.id)}
                    className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                  >
                    Open Course
                  </button>
                ) : (
                  <button 
                    onClick={() => handleEnroll(course)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    Enroll Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Login = () => {
  const { signIn } = useAuth();
  
  return (
    <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 md:p-12 border border-black/5">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold italic mb-6 shadow-lg shadow-emerald-200">E</div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">EduPulse LMS</h1>
          <p className="text-zinc-500 mt-2">The future of education, simplified.</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-zinc-200 rounded-2xl font-medium text-zinc-700 hover:bg-zinc-50 transition-all active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>
          
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-zinc-400"><span className="bg-white px-4">Or use demo account</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="px-4 py-3 bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors">Teacher Demo</button>
            <button className="px-4 py-3 bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors">Admin Demo</button>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-400 leading-relaxed">
          By continuing, you agree to EduPulse's <br />
          <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

const SettingsView = () => {
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

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [marketplaceCourses, setMarketplaceCourses] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'courses'), where('isPublic', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMarketplaceCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);
  
  return (
    <div className="min-h-screen bg-[#F9F9F8] text-zinc-900 font-sans">
      <Navbar />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSelectedCourse(null); }} />
        <main className="flex-1 p-8 overflow-y-auto h-[calc(100vh-64px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedCourse || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedCourse ? (
                <LessonViewer courseId={selectedCourse} onBack={() => setSelectedCourse(null)} />
              ) : (
                <>
                  {activeTab === 'dashboard' && <Dashboard />}
                  {activeTab === 'marketplace' && <Marketplace onSelectCourse={setSelectedCourse} />}
                  {activeTab === 'courses' && <MyCourses onSelectCourse={setSelectedCourse} />}
                  {activeTab === 'my-courses' && <CourseManagement />}
                  {activeTab === 'school' && <AdminView />}
                  {activeTab === 'parent' && <ParentView />}
                  {activeTab === 'messages' && (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                      <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-medium">Messages will appear here</p>
                    </div>
                  )}
                  {activeTab === 'settings' && <SettingsView />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthContent />
    </AuthProvider>
  );
}

function AuthContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">Loading EduPulse...</p>
        </div>
      </div>
    );
  }

  return user ? <MainApp /> : <Login />;
}

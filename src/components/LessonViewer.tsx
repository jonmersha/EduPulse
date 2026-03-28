import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { 
  BookOpen, 
  ChevronRight, 
  ChevronLeft,
  Volume2, 
  CheckCircle2, 
  Video, 
  FileText,
  Menu,
  X,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface LessonViewerProps {
  courseId: string;
  onBack: () => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({ courseId, onBack }) => {
  const { profile } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Fetch course details
    getDoc(doc(db, 'courses', courseId)).then(doc => {
      if (doc.exists()) setCourse(doc.data());
    });

    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLessons(docs);
      if (docs.length > 0 && !currentLesson) setCurrentLesson(docs[0]);
      setLoading(false);
    });

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

  const sections = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    lessons.forEach(lesson => {
      const sectionName = lesson.section || 'General';
      if (!grouped[sectionName]) grouped[sectionName] = [];
      grouped[sectionName].push(lesson);
    });
    return Object.entries(grouped).map(([name, items]) => ({ name, items }));
  }, [lessons]);

  const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id);
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleTTS = async () => {
    if (!currentLesson?.content) return;
    setIsSpeaking(true);
    const { generateSpeech } = await import('../services/geminiService');
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

    // Auto open next lesson if marking as complete and not already completed
    if (!isCompleted && nextLesson) {
      setCurrentLesson(nextLesson);
      setAudioUrl(null);
    }
  };

  const progress = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F9F8] flex flex-col overflow-hidden">
      {/* Top Menu Bar */}
      <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
            title="Back to Courses"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="hidden md:block">
            <h1 className="font-bold text-lg truncate max-w-[300px]">{course?.title || 'Course'}</h1>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{progress}% Complete</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center bg-zinc-100 rounded-xl p-1">
            <button 
              onClick={() => prevLesson && setCurrentLesson(prevLesson)}
              disabled={!prevLesson}
              className="p-2 hover:bg-white disabled:opacity-30 rounded-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-3 text-xs font-bold text-zinc-500 border-x border-zinc-200">
              {currentIndex + 1} / {lessons.length}
            </div>
            <button 
              onClick={() => nextLesson && setCurrentLesson(nextLesson)}
              disabled={!nextLesson}
              className="p-2 hover:bg-white disabled:opacity-30 rounded-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-black transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Sections & Lessons */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 bg-white border-r border-black/5 flex flex-col shrink-0 z-10 absolute md:relative h-full shadow-xl md:shadow-none"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <h3 className="font-bold text-zinc-900">Course Content</h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{lessons.length} Lessons</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {sections.map((section, sIdx) => (
                  <div key={section.name} className="space-y-2">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">{section.name}</h4>
                    <div className="space-y-1">
                      {section.items.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            setCurrentLesson(lesson);
                            setAudioUrl(null);
                            if (window.innerWidth < 768) setIsSidebarOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 text-left rounded-xl transition-all group",
                            currentLesson?.id === lesson.id 
                              ? "bg-emerald-50 text-emerald-700 shadow-sm" 
                              : "hover:bg-zinc-50 text-zinc-600"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            currentLesson?.id === lesson.id 
                              ? "bg-emerald-600 text-white" 
                              : completedLessons.includes(lesson.id) 
                                ? "bg-emerald-100 text-emerald-600" 
                                : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
                          )}>
                            {completedLessons.includes(lesson.id) ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <span className="text-[10px] font-bold">{lesson.order}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-xs font-bold truncate",
                              completedLessons.includes(lesson.id) && "text-zinc-400"
                            )}>{lesson.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {lesson.type === 'video' ? <Video className="w-3 h-3 opacity-40" /> : <FileText className="w-3 h-3 opacity-40" />}
                              <span className="text-[9px] font-bold uppercase tracking-wider opacity-40">{lesson.type}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F9F9F8] relative">
          <div className="max-w-4xl mx-auto p-4 md:p-12 pb-32">
            <AnimatePresence mode="wait">
              {currentLesson ? (
                <motion.div 
                  key={currentLesson.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded tracking-wider">
                          {currentLesson.section || 'General'}
                        </span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                          Lesson {currentIndex + 1} of {lessons.length}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900">{currentLesson.title}</h2>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={handleTTS}
                        disabled={isSpeaking}
                        className="p-3 bg-white border border-black/5 text-zinc-600 rounded-2xl hover:bg-zinc-50 transition-all shadow-sm disabled:opacity-50"
                        title="Listen to lesson"
                      >
                        {isSpeaking ? <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={toggleComplete}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg",
                          completedLessons.includes(currentLesson.id)
                            ? "bg-emerald-600 text-white shadow-emerald-200"
                            : "bg-white border border-black/5 text-zinc-900 hover:bg-zinc-50"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {completedLessons.includes(currentLesson.id) ? 'Completed' : 'Mark as Complete'}
                      </button>
                    </div>
                  </div>

                  {audioUrl && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"
                    >
                      <audio controls src={audioUrl} className="w-full h-10" autoPlay />
                    </motion.div>
                  )}

                  <div className="space-y-8">
                    {currentLesson.type === 'video' && currentLesson.videoUrl && (
                      <div className="aspect-video w-full rounded-3xl overflow-hidden bg-black shadow-2xl">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${getYouTubeId(currentLesson.videoUrl)}`}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}

                    {currentLesson.type === 'pdf' && currentLesson.pdfUrl && (
                      <div className="w-full h-[700px] rounded-3xl overflow-hidden border border-black/5 shadow-xl bg-white">
                        <iframe
                          src={currentLesson.pdfUrl}
                          className="w-full h-full"
                          title="PDF Viewer"
                        ></iframe>
                      </div>
                    )}

                    <div className="prose prose-zinc prose-lg max-w-none text-zinc-600 leading-relaxed bg-white p-8 md:p-12 rounded-[2.5rem] border border-black/5 shadow-sm">
                      <Markdown>{currentLesson.content}</Markdown>
                    </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="flex items-center justify-between pt-12 border-t border-black/5">
                    <button
                      onClick={() => prevLesson && setCurrentLesson(prevLesson)}
                      disabled={!prevLesson}
                      className="flex items-center gap-3 group disabled:opacity-30"
                    >
                      <div className="w-12 h-12 rounded-2xl border border-black/5 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                      </div>
                      <div className="text-left hidden sm:block">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Previous</p>
                        <p className="text-sm font-bold text-zinc-900">{prevLesson?.title || 'None'}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => nextLesson && setCurrentLesson(nextLesson)}
                      disabled={!nextLesson}
                      className="flex items-center gap-3 group text-right disabled:opacity-30"
                    >
                      <div className="hidden sm:block">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Next</p>
                        <p className="text-sm font-bold text-zinc-900">{nextLesson?.title || 'None'}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl border border-black/5 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-zinc-400">
                  <BookOpen className="w-16 h-16 mb-4 opacity-10" />
                  <p className="font-bold">Select a lesson to begin</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

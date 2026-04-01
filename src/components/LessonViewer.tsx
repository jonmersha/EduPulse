import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  collectionGroup,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  Timestamp,
  getDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
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
  ArrowRight,
  MessageSquare,
  ChevronDown,
  PlayCircle,
  Trophy,
  Users,
  Plus,
  Trash2,
  Send,
  ExternalLink,
  Download,
  Paperclip,
  MessageCircle,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { CourseChat } from './CourseChat';
import { AISummary } from './AISummary';
import { RelatedCourses } from './RelatedCourses';
import { useEnrollment } from '../hooks/useEnrollment';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

interface LessonViewerProps {
  courseId: string;
  onBack: () => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({ courseId, onBack }) => {
  const { profile } = useAuth();
  const { enrollment, loading: enrollmentLoading } = useEnrollment(courseId);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [sectionMetadata, setSectionMetadata] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [isViewingCourseOverview, setIsViewingCourseOverview] = useState(true);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedLessons, setExpandedLessons] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'qa' | 'chat' | 'students' | 'contents'>('overview');
  const [isMobile, setIsMobile] = useState(false);

  // Resource & Q&A State
  const [resources, setResources] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: any[] }>({});
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'link', context: 'lesson' as 'lesson' | 'section' | 'course' });
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState<{ [key: string]: string }>({});
  const [showAddResource, setShowAddResource] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch course details
    getDoc(doc(db, 'courses', courseId)).then(doc => {
      if (doc.exists()) setCourse(doc.data());
    });

    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLessons(docs);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'lessons'));

    // Fetch section metadata
    const sectionsQ = query(collection(db, 'sections'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubSections = onSnapshot(sectionsQ, (snapshot) => {
      setSectionMetadata(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sections'));

    let unsubEnroll: any = null;
    let unsubResources: any = null;
    let unsubQuestions: any = null;

    if (profile) {
      const enrollRef = doc(db, 'enrollments', `${profile.uid}_${courseId}`);
      unsubEnroll = onSnapshot(enrollRef, (doc) => {
        if (doc.exists()) {
          setCompletedLessons(doc.data().completedLessons || []);
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `courses/${courseId}/enrollments/${profile.uid}`));

      // Fetch Resources
      const resourcesQ = query(collection(db, 'resources'), where('courseId', '==', courseId));
      unsubResources = onSnapshot(resourcesQ, (snapshot) => {
        setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'resources'));

      // Fetch Questions
      const questionsQ = query(
        collection(db, 'questions'), 
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      unsubQuestions = onSnapshot(questionsQ, (snapshot) => {
        const qDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuestions(qDocs);
        
        // Fetch Answers for each question
        qDocs.forEach(q => {
          const answersQ = query(
            collection(db, 'answers'), 
            where('questionId', '==', q.id),
            orderBy('createdAt', 'asc')
          );
          onSnapshot(answersQ, (ansSnapshot) => {
            setAnswers(prev => ({
              ...prev,
              [q.id]: ansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            }));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'answers'));
        });
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'questions'));
    }

    return () => {
      unsubscribe();
      unsubSections();
      if (unsubEnroll) unsubEnroll();
      if (unsubResources) unsubResources();
      if (unsubQuestions) unsubQuestions();
    };
  }, [courseId, profile]);

  useEffect(() => {
    if (!profile || !course) return;

    const isTeacherOrAdmin = profile.role === 'admin' || profile.role === 'super_admin' || (profile.role === 'teacher' && course.teacherId === profile.uid);

    if (!isTeacherOrAdmin) return;

    // Fetch Enrolled Students
    const enrollQ = query(
      collectionGroup(db, 'enrollments'),
      where('courseId', '==', courseId),
      where('status', '==', 'approved')
    );
    const unsubEnrollments = onSnapshot(enrollQ, (snapshot) => {
      setEnrolledStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));

    return () => {
      unsubEnrollments();
    };
  }, [courseId, profile, course]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isTeacherOrAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || (profile?.role === 'teacher' && course?.teacherId === profile?.uid);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newResource.title || !newResource.url || !isTeacherOrAdmin) return;
    
    try {
      await addDoc(collection(db, 'resources'), {
        title: newResource.title,
        url: newResource.url,
        type: newResource.type,
        courseId,
        lessonId: newResource.context === 'lesson' ? currentLesson?.id : null,
        section: newResource.context === 'course' ? 'General' : currentLesson?.section || 'General',
        createdAt: serverTimestamp()
      });
      setNewResource({ title: '', url: '', type: 'link', context: 'lesson' });
      setShowAddResource(false);
    } catch (error) {
      console.error("Error adding resource:", error);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!isTeacherOrAdmin) return;
    try {
      await deleteDoc(doc(db, 'resources', id));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (!isTeacherOrAdmin) return;
    try {
      const student = enrolledStudents.find(s => s.id === enrollmentId);
      if (!student) return;
      await deleteDoc(doc(db, 'courses', student.courseId, 'enrollments', enrollmentId));
    } catch (error) {
      console.error("Error deleting enrollment:", error);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newQuestion.trim()) return;

    await addDoc(collection(db, 'questions'), {
      courseId,
      lessonId: currentLesson?.id || null,
      studentId: profile.uid,
      studentName: profile.displayName || 'Anonymous',
      content: newQuestion,
      createdAt: serverTimestamp()
    });
    setNewQuestion('');
  };

  const handleAddAnswer = async (questionId: string) => {
    if (!profile || !newAnswer[questionId]?.trim()) return;

    await addDoc(collection(db, 'answers'), {
      questionId,
      userId: profile.uid,
      userName: profile.displayName || 'Anonymous',
      userRole: profile.role,
      content: newAnswer[questionId],
      createdAt: serverTimestamp()
    });
    setNewAnswer(prev => ({ ...prev, [questionId]: '' }));
  };

  // Auto-expand current lesson's section and parent
  useEffect(() => {
    if (currentLesson) {
      const section = currentLesson.section || 'General';
      setExpandedSections(prev => prev.includes(section) ? prev : [...prev, section]);
      if (currentLesson.parentId) {
        setExpandedLessons(prev => prev.includes(currentLesson.parentId) ? prev : [...prev, currentLesson.parentId]);
      }
    }
  }, [currentLesson]);

  const toggleSection = (section: any) => {
    setExpandedSections(prev => 
      prev.includes(section.name) ? prev.filter(s => s !== section.name) : [...prev, section.name]
    );
    setSelectedSection(section);
    setIsViewingCourseOverview(false);
    setCurrentLesson(null);
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev => 
      prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    );
  };

  const sections = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    // First, group by section
    lessons.forEach(lesson => {
      const sectionName = lesson.section || 'General';
      if (!grouped[sectionName]) grouped[sectionName] = [];
      grouped[sectionName].push(lesson);
    });

    // Get all unique section names from lessons and metadata
    const allSectionNames = Array.from(new Set([
      'General',
      ...Object.keys(grouped),
      ...sectionMetadata.map(s => s.name)
    ]));

    return allSectionNames.map(sectionName => {
      const metadata = sectionMetadata.find(s => s.name === sectionName);
      const sectionLessons = grouped[sectionName] || [];
      
      // Within each section, organize by main lessons and their sub-lessons
      const mainLessons = sectionLessons.filter(l => !l.parentId);
      const subLessons = sectionLessons.filter(l => l.parentId);

      return {
        id: metadata?.id || sectionName,
        name: sectionName,
        overview: metadata?.overview || '',
        order: metadata?.order ?? 999,
        mainLessons: mainLessons.map(main => ({
          ...main,
          subs: subLessons.filter(sub => sub.parentId === main.id)
        }))
      };
    }).sort((a, b) => a.order - b.order);
  }, [lessons, sectionMetadata]);

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

  const handleEnroll = async () => {
    if (!profile) return;
    try {
      const enrollRef = doc(db, 'courses', courseId, 'enrollments', profile.uid);
      await setDoc(enrollRef, {
        studentId: profile.uid,
        courseId: courseId,
        status: 'approved',
        enrolledAt: Timestamp.now(),
        progress: 0,
        completedLessons: []
      });
    } catch (error) {
      console.error("Error enrolling:", error);
    }
  };

  if (loading || enrollmentLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (!enrollment && !course?.isPublic) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8">
        <h2 className="text-4xl font-black mb-4">{course?.title}</h2>
        <p className="text-xl text-zinc-500 mb-8">{course?.description}</p>
        <button 
          onClick={handleEnroll}
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all"
        >
          Enroll Now
        </button>
        <button onClick={onBack} className="mt-4 text-zinc-500 hover:text-zinc-900">Back</button>
      </div>
    );
  }

  const renderSidebarContent = () => (
    <div className={cn("flex flex-col bg-zinc-50", isMobile ? "" : "h-full")}>
      <div className="p-6 bg-white border-b border-zinc-200 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-900 text-sm">Course Contents</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">{progress}% COMPLETE</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-emerald-500"
          />
        </div>
      </div>
      
      <div className={cn("pb-20", isMobile ? "" : "flex-1 overflow-y-auto scrollbar-hide")}>
        {/* Course Overview Button */}
        <div className="border-b border-zinc-200">
          <button 
            onClick={() => {
              setIsViewingCourseOverview(true);
              setCurrentLesson(null);
              setSelectedSection(null);
              if (isMobile) setActiveTab('overview');
            }}
            className={cn(
              "w-full flex items-center gap-4 px-6 py-4 text-left transition-all group",
              isViewingCourseOverview ? "bg-emerald-50/50 border-l-[4px] border-emerald-600" : "hover:bg-zinc-50 border-l-[4px] border-transparent"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              isViewingCourseOverview ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
            )}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Introduction</p>
              <h4 className="font-semibold text-zinc-900 text-sm">Course Overview</h4>
            </div>
          </button>
        </div>

        {sections.map((section, sIdx) => {
          const isExpanded = expandedSections.includes(section.name);
          const isSectionActive = selectedSection?.id === section.id && !currentLesson;
          return (
            <div key={`section-${section.name}-${sIdx}`} className="border-b border-zinc-200 last:border-0">
              <button 
                onClick={() => toggleSection(section)}
                className={cn(
                  "w-full flex items-center justify-between px-6 py-4 text-left transition-all group border-l-[4px]",
                  isSectionActive ? "bg-emerald-50/50 border-emerald-600" : "hover:bg-zinc-50 border-transparent"
                )}
              >
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Module {sIdx + 1}</p>
                  <h4 className="font-semibold text-zinc-900 text-sm">{section.name}</h4>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                  isExpanded ? "bg-zinc-800 text-white rotate-90" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
                )}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
              
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-white"
                  >
                    {section.mainLessons.map((main, index) => {
                      const hasSubs = main.subs.length > 0;
                      const isLessonExpanded = expandedLessons.includes(main.id);
                      const isActive = currentLesson?.id === main.id;
                      const isCompleted = completedLessons.includes(main.id);
                      
                      return (
                        <div key={`${main.id}-${index}`}>
                          <div className={cn(
                            "flex items-stretch group border-l-[4px] transition-all",
                            isActive ? "border-emerald-600 bg-emerald-50/30" : "border-transparent hover:bg-zinc-50"
                          )}>
                            <button
                              onClick={() => {
                                setCurrentLesson(main);
                                setSelectedSection(section);
                                setIsViewingCourseOverview(false);
                                setAudioUrl(null);
                                if (isMobile) {
                                  setActiveTab('overview');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                              className="flex-1 flex items-start gap-4 px-6 py-3.5 text-left"
                            >
                              <div className={cn(
                                "mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all",
                                isCompleted 
                                  ? "bg-emerald-600 border-emerald-600 text-white" 
                                  : isActive 
                                    ? "border-emerald-600 text-emerald-600 bg-emerald-50" 
                                    : "border-zinc-300 text-zinc-400 bg-white group-hover:border-zinc-400"
                              )}>
                                {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[9px] font-bold">{main.order}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm font-medium leading-snug",
                                  isActive ? "text-emerald-900 font-semibold" : "text-zinc-700",
                                  isCompleted && !isActive && "text-zinc-500"
                                )}>{main.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1">
                                    {main.type === 'video' ? <Video className="w-3 h-3 text-zinc-400" /> : <FileText className="w-3 h-3 text-zinc-400" />}
                                    <span className="text-[10px] text-zinc-500 capitalize">{main.type}</span>
                                  </div>
                                  {hasSubs && (
                                    <span className="text-[10px] text-zinc-400 font-medium">{main.subs.length} sub-lessons</span>
                                  )}
                                </div>
                              </div>
                            </button>
                            {hasSubs && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLesson(main.id);
                                }}
                                className="px-4 hover:bg-zinc-100 text-zinc-400 transition-colors"
                              >
                                <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", isLessonExpanded && "rotate-90")} />
                              </button>
                            )}
                          </div>

                          {/* Sub-lessons */}
                          {hasSubs && (
                            <AnimatePresence initial={false}>
                              {isLessonExpanded && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden bg-zinc-50/80"
                                >
                                  {main.subs.map((sub, index) => {
                                    const isSubActive = currentLesson?.id === sub.id;
                                    const isSubCompleted = completedLessons.includes(sub.id);
                                    return (
                                      <button
                                        key={`${sub.id}-${index}`}
                                        onClick={() => {
                                          setCurrentLesson(sub);
                                          setSelectedSection(section);
                                          setIsViewingCourseOverview(false);
                                          setAudioUrl(null);
                                          if (isMobile) {
                                            setActiveTab('overview');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                          }
                                        }}
                                        className={cn(
                                          "w-full flex items-start gap-5 px-14 py-4 text-left transition-all border-l-[6px]",
                                          isSubActive ? "border-emerald-600 bg-emerald-50/60" : "border-transparent hover:bg-zinc-100"
                                        )}
                                      >
                                        <div className={cn(
                                          "mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all",
                                          isSubCompleted 
                                            ? "bg-emerald-600 border-emerald-600 text-white" 
                                            : isSubActive 
                                              ? "border-emerald-600 text-emerald-600 bg-white" 
                                              : "border-zinc-200 text-zinc-300 bg-white"
                                        )}>
                                          {isSubCompleted ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[9px] font-black">{sub.order}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={cn(
                                            "text-xs font-bold leading-snug tracking-tight",
                                            isSubActive ? "text-emerald-900" : "text-zinc-700",
                                            isSubCompleted && !isSubActive && "text-zinc-400"
                                          )}>{sub.title}</p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* Top Menu Bar */}
      <header className="h-16 bg-zinc-900 text-white flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            title="Back to Courses"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="hidden md:block">
            <h1 className="font-bold text-sm truncate max-w-[400px]">{course?.title || 'Course'}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-emerald-500 h-full" 
                />
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{progress}% COMPLETE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-xl p-1">
            <button 
              onClick={() => prevLesson && setCurrentLesson(prevLesson)}
              disabled={!prevLesson}
              className="p-2 hover:bg-white/10 disabled:opacity-20 rounded-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 text-[10px] font-black text-zinc-400 border-x border-white/10 tracking-widest">
              {currentIndex + 1} / {lessons.length}
            </div>
            <button 
              onClick={() => nextLesson && setCurrentLesson(nextLesson)}
              disabled={!nextLesson}
              className="p-2 hover:bg-white/10 disabled:opacity-20 rounded-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-sm font-bold"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden md:inline">Contents</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
          
          {/* Video Player (Sticky at top) */}
          {currentLesson?.type === 'video' && currentLesson.videoUrl && !isViewingCourseOverview && !selectedSection && (
            <div className="bg-black w-full aspect-video md:max-h-[60vh] relative shrink-0 z-10">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getYouTubeId(currentLesson.videoUrl)}?autoplay=1&rel=0&modestbranding=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
          )}

          {/* Scrollable Content Below Video */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
            <div className="max-w-5xl mx-auto w-full">
              <AnimatePresence mode="wait">
                {isViewingCourseOverview ? (
                  <motion.div
                    key="course-overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col"
                  >
                    {/* Tabs for Course Overview on Mobile */}
                    {isMobile && (
                      <div className="border-b border-zinc-200 flex overflow-x-auto scrollbar-hide sticky top-0 bg-white z-10">
                        {[
                          { id: 'contents', label: 'Contents' },
                          { id: 'overview', label: 'Overview' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                              "px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all relative",
                              activeTab === tab.id ? "text-emerald-700" : "text-zinc-500 hover:text-zinc-800"
                            )}
                          >
                            {tab.label}
                            {activeTab === tab.id && (
                              <motion.div layoutId="activeTabMobile" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {isMobile && activeTab === 'contents' ? (
                      renderSidebarContent()
                    ) : (
                      <div className="p-6 md:p-12 space-y-8">
                        <div className="space-y-4">
                          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 leading-tight">Course Overview</h2>
                          <p className="text-lg md:text-xl text-zinc-600 font-medium leading-relaxed">{course?.title}</p>
                        </div>
                        <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed">
                          <Markdown>{course?.description || 'No course overview provided.'}</Markdown>
                        </div>
                        {sections.length > 0 && (
                          <div className="pt-12 border-t border-zinc-100">
                            <h3 className="text-xl font-bold text-zinc-900 mb-6">Course Curriculum</h3>
                            <div className="space-y-4">
                              {sections.map((section, idx) => (
                                <div key={`${section.id}-${idx}`} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                                  <div className="flex items-center gap-4 mb-2">
                                    <span className="text-zinc-500 font-semibold text-xs uppercase tracking-wider">Section {idx + 1}</span>
                                    <h4 className="font-bold text-zinc-900 text-lg">{section.name}</h4>
                                  </div>
                                  {section.overview && (
                                    <p className="text-zinc-600 text-sm line-clamp-2">{section.overview}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : selectedSection && !currentLesson ? (
                <motion.div
                  key={`section-${selectedSection.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col"
                >
                  {/* Tabs for Section Overview on Mobile */}
                  {isMobile && (
                    <div className="border-b border-zinc-200 flex overflow-x-auto scrollbar-hide sticky top-0 bg-white z-10">
                      {[
                        { id: 'contents', label: 'Contents' },
                        { id: 'overview', label: 'Overview' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={cn(
                            "px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all relative",
                            activeTab === tab.id ? "text-emerald-700" : "text-zinc-500 hover:text-zinc-800"
                          )}
                        >
                          {tab.label}
                          {activeTab === tab.id && (
                            <motion.div layoutId="activeTabMobile" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {isMobile && activeTab === 'contents' ? (
                    renderSidebarContent()
                  ) : (
                    <div className="p-6 md:p-12 space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md">
                            Section Overview
                          </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 leading-tight">{selectedSection.name}</h2>
                      </div>
                      <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed">
                        <Markdown>{selectedSection.overview || 'No overview provided for this section.'}</Markdown>
                      </div>
                      
                      <div className="pt-12 border-t border-zinc-100">
                        <h3 className="text-xl font-bold text-zinc-900 mb-6">Lessons in this Section</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedSection.mainLessons.map((lesson: any, idx: number) => (
                            <button
                              key={`section-lesson-${lesson.id}`}
                              onClick={() => setCurrentLesson(lesson)}
                              className="flex items-center gap-4 p-5 bg-white border border-zinc-200 rounded-xl hover:shadow-md hover:border-emerald-300 transition-all text-left group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 flex items-center justify-center text-sm font-bold group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-all">
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-zinc-900 text-sm">{lesson.title}</h4>
                                <p className="text-xs text-zinc-500 capitalize mt-0.5">{lesson.type}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : currentLesson ? (
                <motion.div 
                  key={currentLesson.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col"
                >
                  {/* Content Section */}
                  <div className="p-6 md:p-12 space-y-8">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                            {currentLesson.section || 'General'}
                          </span>
                          <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                          <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                            {currentLesson.type}
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">{currentLesson.title}</h2>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <button 
                          onClick={handleTTS}
                          disabled={isSpeaking}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 font-semibold text-sm"
                        >
                          {isSpeaking ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Volume2 className="w-4 h-4" />}
                          Listen
                        </button>
                        <button 
                          onClick={toggleComplete}
                          className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all",
                            completedLessons.includes(currentLesson.id)
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-zinc-900 text-white hover:bg-zinc-800"
                          )}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {completedLessons.includes(currentLesson.id) ? 'Completed' : 'Mark Complete'}
                        </button>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-zinc-200 flex overflow-x-auto scrollbar-hide sticky top-0 bg-white z-10">
                      {[
                        ...(isMobile ? [{ id: 'contents', label: 'Contents' }] : []),
                        { id: 'overview', label: 'Overview' },
                        { id: 'resources', label: 'Resources' },
                        { id: 'qa', label: 'Q&A' },
                        { id: 'chat', label: 'Chat' },
                        { id: 'students', label: 'Students' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={cn(
                            "px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all relative",
                            activeTab === tab.id ? "text-emerald-700" : "text-zinc-500 hover:text-zinc-800"
                          )}
                        >
                          {tab.label}
                          {activeTab === tab.id && (
                            <motion.div layoutId="activeTabLesson" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[500px] pb-20">
                      {isMobile && activeTab === 'contents' ? (
                        renderSidebarContent()
                      ) : activeTab === 'overview' ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                          {currentLesson.shortDescription && (
                            <p className="text-lg text-zinc-600 font-medium italic border-l-4 border-emerald-500 pl-6">
                              "{currentLesson.shortDescription}"
                            </p>
                          )}
                          
                          {currentLesson.type === 'pdf' && currentLesson.pdfUrl && (
                            <div className="w-full h-[600px] md:h-[800px] rounded-2xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50">
                              <iframe src={currentLesson.pdfUrl} className="w-full h-full" title="PDF Viewer" />
                            </div>
                          )}

                          <div className="prose prose-zinc max-w-none text-zinc-700">
                            <Markdown>{currentLesson.content || 'No detailed content provided for this lesson.'}</Markdown>
                          </div>

                          <AISummary content={currentLesson.content || ''} title={currentLesson.title} />
                          <RelatedCourses courseId={courseId} category={course?.category || ''} />

                          {/* Sub-lessons Grid */}
                          {lessons.some(l => l.parentId === currentLesson.id) && (
                            <div className="pt-8 border-t border-zinc-200">
                              <h3 className="text-lg font-bold text-zinc-900 mb-6">Module Contents</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {lessons.filter(l => l.parentId === currentLesson.id).map((sub: any, idx: number) => (
                                  <button
                                    key={`sub-${sub.id}`}
                                    onClick={() => setCurrentLesson(sub)}
                                    className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md hover:border-emerald-300 transition-all text-left group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 flex items-center justify-center text-xs font-bold group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-all">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-zinc-900 text-sm">{sub.title}</h4>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {activeTab === 'chat' && (
                        <div className="animate-in fade-in duration-500">
                          <CourseChat courseId={courseId} />
                        </div>
                      )}

                      {activeTab === 'students' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                          <h3 className="text-xl font-bold text-zinc-900 mb-6">Enrolled Students ({enrolledStudents.length})</h3>
                          <div className="grid grid-cols-1 gap-4">
                            {enrolledStudents.map((student, index) => (
                              <div key={`${student.studentId}-${index}`} className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                                    {student.studentName?.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-zinc-900 text-sm">{student.studentName}</div>
                                    <div className="text-xs text-zinc-500">Enrolled: {new Date(student.enrolledAt?.toMillis()).toLocaleDateString()}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="w-32 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${student.progress || 0}%` }} />
                                  </div>
                                  <span className="text-sm font-bold text-zinc-900">{student.progress || 0}%</span>
                                  {isTeacherOrAdmin && (
                                    <button 
                                      onClick={() => handleDeleteEnrollment(student.id)}
                                      className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                                      title="Remove Enrollment"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {enrolledStudents.length === 0 && (
                            <p className="text-zinc-500 italic">No enrolled students found.</p>
                          )}
                        </div>
                      )}

                      {activeTab === 'resources' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-zinc-900">Resources & Materials</h3>
                            {isTeacherOrAdmin && (
                              <button 
                                onClick={() => setShowAddResource(!showAddResource)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-semibold shadow-sm"
                              >
                                {showAddResource ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {showAddResource ? 'Cancel' : 'Add Resource'}
                              </button>
                            )}
                          </div>

                          {showAddResource && (
                            <motion.form 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              onSubmit={handleAddResource}
                              className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-6 overflow-hidden mb-8 shadow-sm"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-zinc-900 text-sm">Add New Resource</h4>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md uppercase tracking-wider">
                                  Contextual Resource
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Resource Title</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. Course Syllabus"
                                    value={newResource.title}
                                    onChange={e => setNewResource({...newResource, title: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Resource URL</label>
                                  <input 
                                    type="url" 
                                    placeholder="https://example.com/file.pdf"
                                    value={newResource.url}
                                    onChange={e => setNewResource({...newResource, url: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                                    required
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Type</label>
                                  <select 
                                    value={newResource.type}
                                    onChange={e => setNewResource({...newResource, type: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                                  >
                                    <option value="link">Link</option>
                                    <option value="pdf">PDF</option>
                                    <option value="video">Video</option>
                                    <option value="document">Document</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Context</label>
                                  <select 
                                    value={newResource.context}
                                    onChange={e => setNewResource({...newResource, context: e.target.value as any})}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                                  >
                                    <option value="lesson">For this Lesson ({currentLesson?.title})</option>
                                    <option value="section">For this Section ({currentLesson?.section})</option>
                                    <option value="course">Course Wide</option>
                                  </select>
                                </div>
                              </div>

                              <button type="submit" className="w-full py-3 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-all shadow-sm">
                                Save Resource
                              </button>
                            </motion.form>
                          )}

                          {resources.length > 0 ? (
                            <div className="space-y-10">
                              {/* Lesson Resources */}
                              {resources.some(r => r.lessonId === currentLesson?.id) && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                                    <h4 className="font-bold text-zinc-900 text-sm">For this Lesson</h4>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {resources.filter(r => r.lessonId === currentLesson?.id).map((resource, index) => (
                                      <div key={`lesson-${resource.id}-${index}`} className="group relative flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md transition-all">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-500 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-all">
                                          {resource.type === 'pdf' ? <FileText className="w-5 h-5" /> : 
                                           resource.type === 'video' ? <Video className="w-5 h-5" /> : 
                                           <ExternalLink className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-zinc-900 truncate text-sm">{resource.title}</h4>
                                          <p className="text-xs text-zinc-500 capitalize mt-0.5">{resource.type}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <a 
                                            href={resource.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-emerald-700 transition-all"
                                          >
                                            <Download className="w-4 h-4" />
                                          </a>
                                          {isTeacherOrAdmin && (
                                            <button 
                                              onClick={() => setConfirmDeleteId(resource.id)}
                                              className="p-2 hover:bg-red-50 rounded-md text-zinc-500 hover:text-red-600 transition-all"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Section Resources */}
                              {resources.some(r => r.section === currentLesson?.section && !r.lessonId) && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                    <h4 className="font-bold text-zinc-900 text-sm">For this Section</h4>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {resources.filter(r => r.section === currentLesson?.section && !r.lessonId).map((resource, index) => (
                                      <div key={`section-${resource.id}-${index}`} className="group relative flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md transition-all">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-500 group-hover:bg-blue-50 group-hover:text-blue-700 transition-all">
                                          {resource.type === 'pdf' ? <FileText className="w-5 h-5" /> : 
                                           resource.type === 'video' ? <Video className="w-5 h-5" /> : 
                                           <ExternalLink className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-zinc-900 truncate text-sm">{resource.title}</h4>
                                          <p className="text-xs text-zinc-500 capitalize mt-0.5">{resource.type}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <a 
                                            href={resource.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-blue-700 transition-all"
                                          >
                                            <Download className="w-4 h-4" />
                                          </a>
                                          {isTeacherOrAdmin && (
                                            <button 
                                              onClick={() => setConfirmDeleteId(resource.id)}
                                              className="p-2 hover:bg-red-50 rounded-md text-zinc-500 hover:text-red-600 transition-all"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Course Resources */}
                              {resources.some(r => !r.lessonId && (!r.section || r.section === 'General' || (r.section !== currentLesson?.section && r.section !== 'General'))) && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-zinc-400 rounded-full" />
                                    <h4 className="font-bold text-zinc-900 text-sm">Course Wide</h4>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {resources.filter(r => !r.lessonId && (!r.section || r.section === 'General' || (r.section !== currentLesson?.section && r.section !== 'General'))).map((resource, index) => (
                                      <div key={`course-${resource.id}-${index}`} className="group relative flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md transition-all">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-100 group-hover:text-zinc-700 transition-all">
                                          {resource.type === 'pdf' ? <FileText className="w-5 h-5" /> : 
                                           resource.type === 'video' ? <Video className="w-5 h-5" /> : 
                                           <ExternalLink className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-zinc-900 truncate text-sm">{resource.title}</h4>
                                          <p className="text-xs text-zinc-500 capitalize mt-0.5">{resource.type}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <a 
                                            href={resource.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-700 transition-all"
                                          >
                                            <Download className="w-4 h-4" />
                                          </a>
                                          {isTeacherOrAdmin && (
                                            <button 
                                              onClick={() => setConfirmDeleteId(resource.id)}
                                              className="p-2 hover:bg-red-50 rounded-md text-zinc-500 hover:text-red-600 transition-all"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-50 rounded-2xl border border-dashed border-zinc-300">
                              <BookOpen className="w-12 h-12 mb-4 text-zinc-300" />
                              <p className="font-semibold text-sm">No resources available</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'qa' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-zinc-900">Questions & Answers</h3>
                          </div>

                          {/* Ask Question Form */}
                          <form onSubmit={handleAddQuestion} className="relative">
                            <textarea 
                              placeholder="Ask a question about this course..."
                              value={newQuestion}
                              onChange={e => setNewQuestion(e.target.value)}
                              className="w-full p-4 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px] resize-none pr-16 text-sm"
                              required
                            />
                            <button 
                              type="submit"
                              className="absolute bottom-3 right-3 p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </form>

                          {/* Questions List */}
                          <div className="space-y-6">
                            {questions.length > 0 ? (
                              questions.map((q, index) => (
                                <div key={`${q.id}-${index}`} className="space-y-4">
                                  <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                                      <User className="w-5 h-5 text-zinc-500" />
                                    </div>
                                    <div className="flex-1 p-5 bg-white border border-zinc-200 rounded-xl shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-zinc-900 text-sm">{q.studentName}</h4>
                                        <span className="text-xs text-zinc-500">
                                          {q.createdAt?.toDate ? q.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                        </span>
                                      </div>
                                      <p className="text-zinc-700 text-sm leading-relaxed">{q.content}</p>
                                    </div>
                                  </div>

                                  {/* Answers */}
                                  <div className="ml-14 space-y-4">
                                    {answers[q.id]?.map((ans, aIndex) => (
                                      <div key={`${ans.id}-${aIndex}`} className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                          {ans.userRole === 'teacher' || ans.userRole === 'admin' ? (
                                            <Trophy className="w-4 h-4 text-emerald-600" />
                                          ) : (
                                            <User className="w-4 h-4 text-zinc-500" />
                                          )}
                                        </div>
                                        <div className="flex-1 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                              <h5 className="font-semibold text-zinc-900 text-sm">{ans.userName}</h5>
                                              {(ans.userRole === 'teacher' || ans.userRole === 'admin') && (
                                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded tracking-wider">Staff</span>
                                              )}
                                            </div>
                                            <span className="text-xs text-zinc-500">
                                              {ans.createdAt?.toDate ? ans.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                            </span>
                                          </div>
                                          <p className="text-sm text-zinc-700 leading-relaxed">{ans.content}</p>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Reply Form */}
                                    <div className="flex gap-4">
                                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                                        <MessageCircle className="w-4 h-4 text-zinc-500" />
                                      </div>
                                      <div className="flex-1 relative">
                                        <input 
                                          type="text" 
                                          placeholder="Write a reply..."
                                          value={newAnswer[q.id] || ''}
                                          onChange={e => setNewAnswer(prev => ({ ...prev, [q.id]: e.target.value }))}
                                          onKeyDown={e => e.key === 'Enter' && handleAddAnswer(q.id)}
                                          className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm pr-10"
                                        />
                                        <button 
                                          onClick={() => handleAddAnswer(q.id)}
                                          className="absolute right-1.5 top-1.5 p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                        >
                                          <Send className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-50 rounded-2xl border border-dashed border-zinc-300">
                                <MessageSquare className="w-12 h-12 mb-4 text-zinc-300" />
                                <p className="font-semibold text-sm">No questions yet. Be the first to ask!</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : selectedSection ? (
                <motion.div
                  key={`section-${selectedSection.id}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 md:p-12 space-y-8"
                >
                  <div className="space-y-4">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase rounded-full tracking-wider">
                      Section Overview
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900">{selectedSection.name}</h2>
                    <p className="text-lg text-zinc-600 max-w-3xl leading-relaxed">
                      {selectedSection.overview || 'Master the core concepts of this module. Complete each lesson to progress through the course.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                    {selectedSection.mainLessons.map((lesson: any, idx: number) => (
                      <button
                        key={`active-section-lesson-${lesson.id}`}
                        onClick={() => {
                          setCurrentLesson(lesson);
                          setSelectedSection(null);
                        }}
                        className="flex items-start gap-5 p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center text-lg font-bold group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h4 className="font-bold text-zinc-900 text-lg mb-1 truncate">{lesson.title}</h4>
                          {lesson.shortDescription && (
                            <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{lesson.shortDescription}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : isMobile ? (
                <div key="mobile-sidebar" className="h-full">
                  {renderSidebarContent()}
                </div>
              ) : (
                <div key="empty-state" className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-zinc-400 bg-zinc-50/50">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white shadow-sm border border-zinc-100 flex items-center justify-center mb-6">
                      <BookOpen className="w-10 h-10 text-emerald-500 opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">Ready to learn?</h3>
                    <p className="text-zinc-500 text-sm">Select a lesson from the contents to begin.</p>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {confirmDeleteId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl overflow-hidden"
              >
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-5">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Delete Resource?</h3>
                <p className="text-zinc-500 text-sm mb-6">
                  This action cannot be undone. This resource will be permanently removed from the course.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 py-2.5 bg-zinc-100 text-zinc-900 rounded-xl font-semibold hover:bg-zinc-200 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDeleteResource(confirmDeleteId)}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-sm text-sm"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Sidebar - Course Content */}
        <aside 
          className={cn(
            "bg-zinc-50 flex-col shrink-0 z-30",
            "hidden md:flex md:relative md:inset-auto md:h-full md:w-[420px] md:rounded-none md:shadow-none md:border-t-0 md:border-l md:mt-0",
            isSidebarOpen ? "md:flex" : "md:hidden"
          )}
        >
          {renderSidebarContent()}
        </aside>
      </div>
    </div>
  );
};

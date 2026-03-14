import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  Timestamp 
} from 'firebase/firestore';
import { BookOpen, ChevronRight, Volume2, CheckCircle2, Video, FileText } from 'lucide-react';
import { motion } from 'motion/react';
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

              {currentLesson.type === 'video' && currentLesson.videoUrl && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black mb-6">
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
                <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-black/5 mb-6">
                  <iframe
                    src={currentLesson.pdfUrl}
                    className="w-full h-full"
                    title="PDF Viewer"
                  ></iframe>
                </div>
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

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ChevronRight, Plus, Settings, Trash2, GripVertical, Video, FileText, Type, Layers, Save, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { cn } from '../lib/utils';

interface LessonEditorProps {
  courseId: string;
  onBack: () => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({ courseId, onBack }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lessonData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLessons(lessonData);
    });
    return () => unsubscribe();
  }, [courseId]);

  const sections = useMemo(() => {
    const sectionMap: { [key: string]: any[] } = {};
    lessons.forEach(l => {
      const s = l.section || 'General';
      if (!sectionMap[s]) sectionMap[s] = [];
      sectionMap[s].push(l);
    });

    return Object.entries(sectionMap).map(([name, items]) => ({
      name,
      mainLessons: items.filter(l => !l.parentId).sort((a, b) => (a.order || 0) - (b.order || 0)).map(main => ({
        ...main,
        subs: items.filter(sub => sub.parentId === main.id).sort((a, b) => (a.order || 0) - (b.order || 0))
      }))
    }));
  }, [lessons]);

  const selectedLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    return lessons.find(l => l.id === selectedLessonId) || null;
  }, [selectedLessonId, lessons]);

  useEffect(() => {
    if (selectedLesson) {
      setEditingLesson({ ...selectedLesson });
    } else {
      setEditingLesson(null);
    }
  }, [selectedLesson]);

  const handleSave = async () => {
    if (!editingLesson) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'lessons', editingLesson.id), {
        ...editingLesson,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving lesson:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addLesson = async (section: string, parentId: string = '') => {
    const newLessonData = {
      courseId,
      title: 'New Lesson',
      section,
      parentId,
      type: 'text',
      content: '',
      order: lessons.length + 1,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'lessons'), newLessonData);
    setSelectedLessonId(docRef.id);
  };

  const addSection = () => {
    const sectionName = prompt('Enter section name:');
    if (sectionName) {
      addLesson(sectionName);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await deleteDoc(doc(db, 'lessons', id));
      if (selectedLessonId === id) setSelectedLessonId(null);
    } catch (error) {
      console.error("Error deleting lesson:", error);
    }
  };

  const moveLesson = async (lesson: any, direction: 'up' | 'down') => {
    const siblings = lessons.filter(l => l.section === lesson.section && l.parentId === lesson.parentId);
    const currentIndex = siblings.findIndex(l => l.id === lesson.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    
    const targetLesson = siblings[targetIndex];
    await setDoc(doc(db, 'lessons', lesson.id), { order: targetLesson.order }, { merge: true });
    await setDoc(doc(db, 'lessons', targetLesson.id), { order: lesson.order }, { merge: true });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-black/5 rounded-[2rem] overflow-hidden shadow-sm">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-black/5 bg-zinc-50/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold">Course Builder</h2>
            <p className="text-xs text-zinc-500">Structure your course content and lessons.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={addSection}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
          {editingLesson && (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-black/5 overflow-y-auto bg-zinc-50/30 p-4 space-y-6">
          {sections.map((section) => (
            <div key={section.name} className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{section.name}</span>
                <button 
                  onClick={() => addLesson(section.name)}
                  className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-900"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              
              <div className="space-y-1">
                {section.mainLessons.map((main) => (
                  <div key={main.id} className="space-y-1">
                    <div 
                      onClick={() => setSelectedLessonId(main.id)}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all",
                        selectedLessonId === main.id ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200" : "hover:bg-zinc-100 text-zinc-600"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-3 h-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {main.type === 'video' ? <Video className="w-3.5 h-3.5" /> : main.type === 'pdf' ? <FileText className="w-3.5 h-3.5" /> : main.type === 'container' ? <Layers className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                        <span className="text-sm font-bold truncate">{main.title}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); addLesson(section.name, main.id); }}
                          className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
                          title="Add Sub-lesson"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(main.id); }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-lessons */}
                    {main.subs.length > 0 && (
                      <div className="ml-6 space-y-1 border-l border-zinc-200 pl-2">
                        {main.subs.map((sub) => (
                          <div 
                            key={sub.id}
                            onClick={() => setSelectedLessonId(sub.id)}
                            className={cn(
                              "group flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all",
                              selectedLessonId === sub.id ? "bg-emerald-50/50 text-emerald-700 ring-1 ring-emerald-100" : "hover:bg-zinc-100 text-zinc-500"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-zinc-300">{sub.order}</span>
                              <span className="text-xs font-medium truncate">{sub.title}</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded text-red-600 transition-all"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {lessons.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xs text-zinc-400 italic">No content yet.</p>
              <button 
                onClick={addSection}
                className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
              >
                Create your first section
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-white">
          <AnimatePresence mode="wait">
            {editingLesson ? (
              <motion.div 
                key={editingLesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase rounded-md tracking-wider">
                        {editingLesson.parentId ? 'Sub-lesson' : 'Main Lesson'}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{editingLesson.section}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => moveLesson(editingLesson, 'up')}
                        className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900"
                      >
                        <ChevronRight className="w-4 h-4 -rotate-90" />
                      </button>
                      <button 
                        onClick={() => moveLesson(editingLesson, 'down')}
                        className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900"
                      >
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </button>
                    </div>
                  </div>

                  <input 
                    value={editingLesson.title}
                    onChange={e => setEditingLesson({...editingLesson, title: e.target.value})}
                    className="w-full text-4xl font-black tracking-tight border-none focus:ring-0 p-0 placeholder:text-zinc-200"
                    placeholder="Lesson Title"
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Content Type</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'text', icon: Type, label: 'Text' },
                          { id: 'video', icon: Video, label: 'Video' },
                          { id: 'pdf', icon: FileText, label: 'PDF' },
                          { id: 'container', icon: Layers, label: 'Container' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setEditingLesson({...editingLesson, type: t.id})}
                            className={cn(
                              "flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                              editingLesson.type === t.id ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-zinc-50 border-black/5 text-zinc-400 hover:bg-zinc-100"
                            )}
                          >
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Section</label>
                      <input 
                        value={editingLesson.section}
                        onChange={e => setEditingLesson({...editingLesson, section: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Short Description</label>
                    <textarea 
                      value={editingLesson.shortDescription || ''}
                      onChange={e => setEditingLesson({...editingLesson, shortDescription: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm min-h-[80px]"
                      placeholder="Brief summary for the sidebar or overview..."
                    />
                  </div>

                  {editingLesson.type === 'video' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">YouTube Video URL</label>
                      <input 
                        type="url"
                        value={editingLesson.videoUrl || ''}
                        onChange={e => setEditingLesson({...editingLesson, videoUrl: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                  )}

                  {editingLesson.type === 'pdf' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">PDF URL</label>
                      <input 
                        type="url"
                        value={editingLesson.pdfUrl || ''}
                        onChange={e => setEditingLesson({...editingLesson, pdfUrl: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                        placeholder="https://example.com/document.pdf"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Lesson Content (Markdown)</label>
                    <textarea 
                      value={editingLesson.content || ''}
                      onChange={e => setEditingLesson({...editingLesson, content: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono min-h-[300px]"
                      placeholder="Write your lesson content here using Markdown..."
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                  <Layers className="w-8 h-8 text-zinc-200" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Select a lesson to edit</h3>
                  <p className="text-sm text-zinc-500 max-w-xs">Choose a lesson from the sidebar to modify its content or structure.</p>
                </div>
                <button 
                  onClick={() => addLesson('Introduction')}
                  className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                >
                  Create New Lesson
                </button>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ChevronRight, Plus, Settings, Trash2, GripVertical, Video, FileText, Type, Layers, Save, ArrowLeft, ExternalLink, Download, X, Link as LinkIcon, BookOpen, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { cn } from '../lib/utils';

interface LessonEditorProps {
  courseId: string;
  onBack: () => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({ courseId, onBack }) => {
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [sectionMetadata, setSectionMetadata] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'content' | 'resources'>('content');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [editingCourseData, setEditingCourseData] = useState<any>(null);
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'lesson' | 'resource' | 'section' } | null>(null);
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'link', lessonId: '', section: 'General' });

  useEffect(() => {
    const unsubCourse = onSnapshot(doc(db, 'courses', courseId), (doc) => {
      if (doc.exists()) {
        setCourse({ id: doc.id, ...doc.data() });
      }
    });
    return () => unsubCourse();
  }, [courseId]);

  useEffect(() => {
    const q = query(collection(db, 'sections'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSectionMetadata(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [courseId]);

  useEffect(() => {
    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lessonData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLessons(lessonData);
    });
    return () => unsubscribe();
  }, [courseId]);

  useEffect(() => {
    const q = query(collection(db, 'resources'), where('courseId', '==', courseId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

    // Ensure all metadata sections are included even if they have no lessons
    sectionMetadata.forEach(sm => {
      if (!sectionMap[sm.name]) sectionMap[sm.name] = [];
    });

    // Ensure General is always included
    if (!sectionMap['General']) sectionMap['General'] = [];

    return Object.entries(sectionMap).map(([name, items]) => {
      const metadata = sectionMetadata.find(sm => sm.name === name);
      return {
        id: metadata?.id || name,
        name,
        metadata,
        mainLessons: items.filter(l => !l.parentId).sort((a, b) => (a.order || 0) - (b.order || 0)).map(main => ({
          ...main,
          subs: items.filter(sub => sub.parentId === main.id).sort((a, b) => (a.order || 0) - (b.order || 0))
        }))
      };
    }).sort((a, b) => (a.metadata?.order || 999) - (b.metadata?.order || 999));
  }, [lessons, sectionMetadata]);

  const selectedLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    return lessons.find(l => l.id === selectedLessonId) || null;
  }, [selectedLessonId, lessons]);

  useEffect(() => {
    if (selectedLesson) {
      setEditingLesson({ ...selectedLesson });
      setSelectedSectionName(null);
      setIsEditingCourse(false);
    } else {
      setEditingLesson(null);
    }
  }, [selectedLesson]);

  useEffect(() => {
    if (selectedSectionName) {
      const meta = sectionMetadata.find(sm => sm.name === selectedSectionName);
      setEditingSection(meta || { name: selectedSectionName, overview: '', courseId, order: sectionMetadata.length });
      setSelectedLessonId(null);
      setIsEditingCourse(false);
    } else {
      setEditingSection(null);
    }
  }, [selectedSectionName, sectionMetadata, courseId]);

  useEffect(() => {
    if (isEditingCourse && course) {
      setEditingCourseData({ ...course });
      setSelectedLessonId(null);
      setSelectedSectionName(null);
    } else {
      setEditingCourseData(null);
    }
  }, [isEditingCourse, course]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingLesson) {
        await setDoc(doc(db, 'lessons', editingLesson.id), {
          ...editingLesson,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else if (editingSection) {
        const sectionId = editingSection.id || `${courseId}_${editingSection.name.replace(/\s+/g, '_')}`;
        
        // If name changed, update all lessons in this section
        if (editingSection.id && editingSection.name !== sectionMetadata.find(sm => sm.id === editingSection.id)?.name) {
          const oldName = sectionMetadata.find(sm => sm.id === editingSection.id)?.name;
          const lessonsToUpdate = lessons.filter(l => l.section === oldName);
          for (const lesson of lessonsToUpdate) {
            await setDoc(doc(db, 'lessons', lesson.id), { section: editingSection.name }, { merge: true });
          }
        }

        await setDoc(doc(db, 'sections', sectionId), {
          ...editingSection,
          courseId,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        if (!editingSection.id) {
          setSelectedSectionName(editingSection.name);
        }
      } else if (editingCourseData) {
        await setDoc(doc(db, 'courses', courseId), {
          ...editingCourseData,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addLesson = async (section: string, parentId: string = '') => {
    try {
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
    } catch (error) {
      console.error("Error adding lesson:", error);
    }
  };

  const handleAddSection = () => {
    if (newSectionName.trim()) {
      addLesson(newSectionName.trim());
      setNewSectionName('');
      setShowSectionInput(false);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.title || !newResource.url) return;
    
    try {
      if (editingResourceId) {
        await setDoc(doc(db, 'resources', editingResourceId), {
          ...newResource,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'resources'), {
          ...newResource,
          courseId,
          createdAt: serverTimestamp()
        });
      }
      setNewResource({ title: '', url: '', type: 'link', lessonId: '', section: 'General' });
      setShowAddResource(false);
      setEditingResourceId(null);
    } catch (error) {
      console.error("Error saving resource:", error);
    }
  };

  const handleEditResource = (resource: any) => {
    setNewResource({
      title: resource.title,
      url: resource.url,
      type: resource.type,
      lessonId: resource.lessonId || '',
      section: resource.section || 'General'
    });
    setEditingResourceId(resource.id);
    setShowAddResource(true);
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'resources', id));
      setConfirmDelete(null);
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (confirmDelete?.type === 'section') {
        const section = sectionMetadata.find(s => s.id === id);
        if (section) {
          // Delete section metadata
          await deleteDoc(doc(db, 'sections', id));
          
          // Move lessons in this section to "General"
          const sectionLessons = lessons.filter(l => l.section === section.name);
          for (const lesson of sectionLessons) {
            await setDoc(doc(db, 'lessons', lesson.id), { section: 'General' }, { merge: true });
          }
          
          if (selectedSectionName === section.name) setSelectedSectionName(null);
          if (editingSection?.id === id) setEditingSection(null);
        }
      } else {
        await deleteDoc(doc(db, 'lessons', id));
        if (selectedLessonId === id) setSelectedLessonId(null);
      }
      setConfirmDelete(null);
    } catch (error) {
      console.error(`Error deleting ${confirmDelete?.type || 'item'}:`, error);
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
      <header className="h-16 border-b border-black/5 flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-zinc-200" />
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl">
            <button 
              onClick={() => setActiveView('content')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeView === 'content' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Curriculum
            </button>
            <button 
              onClick={() => setActiveView('resources')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeView === 'resources' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Resources
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            {activeView === 'content' && (
              <button 
                onClick={() => setShowSectionInput(!showSectionInput)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Section
              </button>
            )}
            
            <AnimatePresence>
              {showSectionInput && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 p-4 bg-white border border-black/5 rounded-2xl shadow-2xl z-50 space-y-3"
                >
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest px-1">New Section</h4>
                  <input 
                    autoFocus
                    value={newSectionName}
                    onChange={e => setNewSectionName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                    placeholder="Section Name (e.g. Module 1)"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowSectionInput(false)}
                      className="flex-1 px-3 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAddSection}
                      className="flex-1 px-3 py-2 text-xs font-bold bg-zinc-900 text-white rounded-lg hover:bg-black transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {(editingLesson || editingSection || editingCourseData) && (
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

      <AnimatePresence>
        {confirmDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 mb-2">Are you sure?</h3>
              <p className="text-zinc-500 font-medium mb-8">
                This action cannot be undone. All associated data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete.id)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-black/5 overflow-y-auto bg-zinc-50/30 p-4 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Course Settings</span>
            <div 
              onClick={() => setIsEditingCourse(true)}
              className={cn(
                "group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all",
                isEditingCourse ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200" : "hover:bg-zinc-100 text-zinc-600"
              )}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-sm font-bold">Course Overview</span>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.name} className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <div 
                  onClick={() => setSelectedSectionName(section.name)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer group",
                    selectedSectionName === section.name ? "text-emerald-600" : "text-zinc-400 hover:text-zinc-900"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{section.name}</span>
                  <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => addLesson(section.name)}
                    className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-900"
                    title="Add Lesson"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  {section.id !== section.name && ( // Only show delete if it's a real section with metadata
                    <button 
                      onClick={() => setConfirmDelete({ id: section.id, type: 'section' })}
                      className="p-1 hover:bg-red-100 rounded text-zinc-400 hover:text-red-600"
                      title="Delete Section"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
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
                        {resources.some(r => r.lessonId === main.id) && (
                          <FileText className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                        )}
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
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: main.id, type: 'lesson' }); }}
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
                              {resources.some(r => r.lessonId === sub.id) && (
                                <FileText className="w-2 h-2 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: sub.id, type: 'lesson' }); }}
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
                onClick={() => setShowSectionInput(true)}
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
            {activeView === 'resources' ? (
              <motion.div
                key="resources"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight">COURSE RESOURCES</h2>
                    <p className="text-zinc-500 font-medium">Manage all downloadable materials and external links for this course.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (showAddResource) {
                        setShowAddResource(false);
                        setEditingResourceId(null);
                        setNewResource({ title: '', url: '', type: 'link', lessonId: '', section: 'General' });
                      } else {
                        setShowAddResource(true);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    {showAddResource ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {showAddResource ? 'Cancel' : 'Add New Resource'}
                  </button>
                </div>

                {showAddResource && (
                  <motion.form 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddResource}
                    className="p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-200 space-y-6 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Resource Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Course Syllabus"
                          value={newResource.title}
                          onChange={e => setNewResource({...newResource, title: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Resource URL</label>
                        <input 
                          type="url" 
                          placeholder="https://example.com/file.pdf"
                          value={newResource.url}
                          onChange={e => setNewResource({...newResource, url: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Type</label>
                        <select 
                          value={newResource.type}
                          onChange={e => setNewResource({...newResource, type: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        >
                          <option value="link">Link</option>
                          <option value="pdf">PDF</option>
                          <option value="video">Video</option>
                          <option value="document">Document</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Section Context (Optional)</label>
                        <select 
                          value={newResource.section}
                          onChange={e => setNewResource({...newResource, section: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        >
                          <option value="General">General (Course Wide)</option>
                          {sections.map(s => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Lesson Context (Optional)</label>
                        <select 
                          value={newResource.lessonId}
                          onChange={e => setNewResource({...newResource, lessonId: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        >
                          <option value="">None (Section Wide)</option>
                          {lessons.map(l => (
                            <option key={l.id} value={l.id}>{l.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-zinc-200">
                      {editingResourceId ? 'Update Resource' : 'Save Resource'}
                    </button>
                  </motion.form>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {resources.length > 0 ? resources.map((resource) => (
                    <div key={resource.id} className="group flex items-center gap-6 p-6 bg-white border border-zinc-100 rounded-[2rem] hover:shadow-xl transition-all">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                        {resource.type === 'pdf' ? <FileText className="w-8 h-8" /> : 
                         resource.type === 'video' ? <Video className="w-8 h-8" /> : 
                         <LinkIcon className="w-8 h-8" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-xl text-zinc-900 truncate">{resource.title}</h4>
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-black uppercase rounded-md tracking-widest">
                            {resource.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {resource.section || 'General'}
                          </div>
                          {resource.lessonId && (
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {lessons.find(l => l.id === resource.lessonId)?.title || 'Unknown Lesson'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-3 bg-zinc-50 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                        <button 
                          onClick={() => handleEditResource(resource)}
                          className="p-3 bg-zinc-50 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete({ id: resource.id, type: 'resource' })}
                          className="p-3 bg-zinc-50 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-32 text-zinc-400 bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200">
                      <FileText className="w-16 h-16 mb-4 opacity-10" />
                      <p className="font-bold">No resources added yet</p>
                      <p className="text-sm">Add materials to help your students learn better.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : editingCourseData ? (
              <motion.div 
                key="course-edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase rounded-md tracking-wider">
                      Course Settings
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Course Title</label>
                    <input 
                      value={editingCourseData.title}
                      onChange={e => setEditingCourseData({...editingCourseData, title: e.target.value})}
                      className="w-full text-4xl font-black tracking-tight border-none focus:ring-0 p-0 placeholder:text-zinc-200"
                      placeholder="Course Title"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Course Overview (Markdown)</label>
                    <textarea 
                      value={editingCourseData.description || ''}
                      onChange={e => setEditingCourseData({...editingCourseData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono min-h-[400px]"
                      placeholder="Write a comprehensive overview of your course..."
                    />
                  </div>
                </div>
              </motion.div>
            ) : editingSection ? (
              <motion.div 
                key="section-edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase rounded-md tracking-wider">
                      Section Settings
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Section Name</label>
                    <input 
                      value={editingSection.name}
                      onChange={e => setEditingSection({...editingSection, name: e.target.value})}
                      className="w-full text-4xl font-black tracking-tight border-none focus:ring-0 p-0 placeholder:text-zinc-200"
                      placeholder="Section Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Section Overview (Markdown)</label>
                    <textarea 
                      value={editingSection.overview || ''}
                      onChange={e => setEditingSection({...editingSection, overview: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono min-h-[300px]"
                      placeholder="Write an overview for this section..."
                    />
                  </div>
                </div>
              </motion.div>
            ) : editingLesson ? (
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
                      <select 
                        value={editingLesson.section}
                        onChange={e => setEditingLesson({...editingLesson, section: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium"
                      >
                        {sections.map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
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

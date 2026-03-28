import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ChevronRight, Plus, Settings, Trash2 } from 'lucide-react';
import { db } from '../firebase';

interface LessonEditorProps {
  courseId: string;
  onBack: () => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({ courseId, onBack }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [newLesson, setNewLesson] = useState({ title: '', content: '', type: 'text', videoUrl: '', pdfUrl: '', section: '', order: 0 });

  useEffect(() => {
    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [courseId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const lessonId = editingLesson?.id || doc(collection(db, 'lessons')).id;
    await setDoc(doc(db, 'lessons', lessonId), {
      ...newLesson,
      courseId,
      order: editingLesson?.order || lessons.length + 1
    }, { merge: true });
    setShowAdd(false);
    setEditingLesson(null);
    setNewLesson({ title: '', content: '', type: 'text', videoUrl: '', pdfUrl: '', section: '', order: 0 });
  };

  const startEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setNewLesson({
      title: lesson.title,
      content: lesson.content || '',
      type: lesson.type || 'text',
      videoUrl: lesson.videoUrl || '',
      pdfUrl: lesson.pdfUrl || '',
      section: lesson.section || '',
      order: lesson.order || 0
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await deleteDoc(doc(db, 'lessons', id));
    } catch (error) {
      console.error("Error deleting lesson:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Teaching
        </button>
        <button 
          onClick={() => { setEditingLesson(null); setNewLesson({ title: '', content: '', type: 'text', videoUrl: '', pdfUrl: '', section: '', order: 0 }); setShowAdd(true); }}
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
                <button 
                  onClick={() => startEdit(lesson)}
                  className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-emerald-600"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(lesson.id)}
                  className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Section</label>
                <input 
                  value={newLesson.section}
                  onChange={e => setNewLesson({...newLesson, section: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Introduction, Advanced Topics"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Title</label>
                <input 
                  required
                  value={newLesson.title}
                  onChange={e => setNewLesson({...newLesson, title: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Type</label>
                <select 
                  value={newLesson.type}
                  onChange={e => setNewLesson({...newLesson, type: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="text">Text/Markdown</option>
                  <option value="video">YouTube Video</option>
                  <option value="pdf">PDF Document</option>
                </select>
              </div>
              {newLesson.type === 'video' && (
                <div>
                  <label className="block text-sm font-bold mb-1">YouTube Video URL</label>
                  <input 
                    required
                    type="url"
                    value={newLesson.videoUrl}
                    onChange={e => setNewLesson({...newLesson, videoUrl: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              )}
              {newLesson.type === 'pdf' && (
                <div>
                  <label className="block text-sm font-bold mb-1">PDF URL</label>
                  <input 
                    required
                    type="url"
                    value={newLesson.pdfUrl}
                    onChange={e => setNewLesson({...newLesson, pdfUrl: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://example.com/document.pdf"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold mb-1">Content (Markdown)</label>
                <textarea 
                  required={newLesson.type === 'text'}
                  rows={10}
                  value={newLesson.content}
                  onChange={e => setNewLesson({...newLesson, content: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                  placeholder="Lesson description or full text content..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => { setShowAdd(false); setEditingLesson(null); }} className="px-6 py-2 text-zinc-500 font-bold">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200">
                  {editingLesson ? 'Save Changes' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

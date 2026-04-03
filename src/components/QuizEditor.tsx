import React, { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface QuizEditorProps {
  courseId: string;
  type: 'lesson' | 'section' | 'final';
  lessonId?: string;
  sectionId?: string;
  onClose: () => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ courseId, type, lessonId, sectionId, onClose }) => {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);

  const handleAddQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const handleSave = async () => {
    const examId = `${courseId}_${type}_${lessonId || sectionId || 'final'}`;
    await setDoc(doc(db, 'exams', examId), {
      courseId,
      lessonId,
      sectionId,
      type,
      title,
      questions,
      teacherId: 'current_user_id', // Should be dynamic
      createdAt: serverTimestamp()
    });
    onClose();
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-xl font-bold mb-4 dark:text-white">Create {type} Quiz</h2>
      <input 
        type="text" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        placeholder="Quiz Title" 
        className="w-full p-2 mb-4 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
      />
      {questions.map((q, qIndex) => (
        <div key={qIndex} className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded">
          <input 
            type="text" 
            value={q.question} 
            onChange={(e) => {
              const newQuestions = [...questions];
              newQuestions[qIndex].question = e.target.value;
              setQuestions(newQuestions);
            }} 
            placeholder="Question" 
            className="w-full p-2 mb-2 border rounded dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
          />
          {q.options.map((opt, oIndex) => (
            <input 
              key={oIndex} 
              type="text" 
              value={opt} 
              onChange={(e) => {
                const newQuestions = [...questions];
                newQuestions[qIndex].options[oIndex] = e.target.value;
                setQuestions(newQuestions);
              }} 
              placeholder={`Option ${oIndex + 1}`} 
              className="w-full p-2 mb-1 border rounded dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
            />
          ))}
        </div>
      ))}
      <button onClick={handleAddQuestion} className="flex items-center gap-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 dark:text-white rounded mb-4">
        <Plus className="w-4 h-4" /> Add Question
      </button>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 dark:text-white rounded">Cancel</button>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded">
          <Save className="w-4 h-4" /> Save Quiz
        </button>
      </div>
    </div>
  );
};

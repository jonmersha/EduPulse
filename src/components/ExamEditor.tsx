import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ChevronLeft, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface ExamEditorProps {
  examId: string;
  onBack: () => void;
}

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export const ExamEditor: React.FC<ExamEditorProps> = ({ examId, onBack }) => {
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'exams', examId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setExam(data);
        setQuestions(data.questions || []);
      }
    });
    return () => unsub();
  }, [examId]);

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleUpdateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateDoc(doc(db, 'exams', examId), { questions });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving exam:', error);
    }
    setSaving(false);
  };

  if (!exam) return <div className="p-8 text-center">Loading exam...</div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <p className="text-sm text-zinc-500">Editing Questions</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAddQuestion}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-xl font-bold hover:bg-zinc-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saveSuccess && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Saved!
            </motion.div>
          )}
        </div>
      </header>

      <div className="space-y-6">
        <AnimatePresence initial={false}>
          {questions.map((q, qIndex) => (
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black/5 rounded-[2rem] p-8 shadow-sm space-y-6 relative group"
            >
              <button
                onClick={() => handleRemoveQuestion(qIndex)}
                className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {qIndex + 1}
                  </span>
                  <input
                    placeholder="Enter question text..."
                    value={q.text}
                    onChange={(e) => handleUpdateQuestion(qIndex, 'text', e.target.value)}
                    className="flex-1 text-xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-zinc-300"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((option, oIndex) => (
                    <div 
                      key={oIndex}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        q.correctAnswer === oIndex 
                          ? "border-emerald-500 bg-emerald-50" 
                          : "border-zinc-100 bg-zinc-50"
                      }`}
                    >
                      <button
                        onClick={() => handleUpdateQuestion(qIndex, 'correctAnswer', oIndex)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          q.correctAnswer === oIndex 
                            ? "border-emerald-500 bg-emerald-500 text-white" 
                            : "border-zinc-300 bg-white"
                        }`}
                      >
                        {q.correctAnswer === oIndex && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <input
                        placeholder={`Option ${oIndex + 1}`}
                        value={option}
                        onChange={(e) => handleUpdateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 font-medium placeholder:text-zinc-400"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-black/5">
                  <label className="block text-sm font-bold text-zinc-500 mb-2">Explanation (Optional)</label>
                  <textarea
                    placeholder="Explain why the correct answer is right..."
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateQuestion(qIndex, 'explanation', e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {questions.length === 0 && (
          <div className="py-20 text-center bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-200">
            <p className="text-zinc-400 font-medium">No questions added yet. Click "Add Question" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
};

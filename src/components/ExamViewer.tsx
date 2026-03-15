import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, Timestamp } from 'firebase/firestore';
import { ChevronRight, Clock, CheckCircle2, AlertCircle, Trophy } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface ExamViewerProps {
  examId: string;
  onBack: () => void;
}

export const ExamViewer: React.FC<ExamViewerProps> = ({ examId, onBack }) => {
  const { profile } = useAuth();
  const [exam, setExam] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'exams', examId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setExam(data);
        if (data.duration) {
          setTimeLeft(data.duration * 60);
        }
      }
    });
    return () => unsub();
  }, [examId]);

  useEffect(() => {
    if (timeLeft === null || isFinished) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const handleSubmit = async () => {
    if (!exam || !profile) return;

    let correctCount = 0;
    exam.questions.forEach((q: any, idx: number) => {
      if (answers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = (correctCount / exam.questions.length) * 100;
    const resultData = {
      examId,
      studentId: profile.uid,
      studentName: profile.displayName,
      score,
      totalQuestions: exam.questions.length,
      correctAnswers: correctCount,
      completedAt: Timestamp.now(),
      feedback: score >= (exam.passingScore || 70) ? "Congratulations! You passed." : "Keep studying and try again."
    };

    const resultId = `${profile.uid}_${examId}`;
    await setDoc(doc(db, 'examResults', resultId), resultData);
    setResult(resultData);
    setIsFinished(true);
  };

  if (!exam) return <div className="p-8 text-center">Loading exam...</div>;

  if (isFinished && result) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white border border-black/5 rounded-[2rem] shadow-xl text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold">Exam Completed!</h2>
        <div className="grid grid-cols-2 gap-4 py-6">
          <div className="p-4 bg-zinc-50 rounded-2xl">
            <p className="text-sm text-zinc-500 font-bold uppercase tracking-wider">Your Score</p>
            <p className="text-4xl font-black text-emerald-600">{result.score.toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-2xl">
            <p className="text-sm text-zinc-500 font-bold uppercase tracking-wider">Correct</p>
            <p className="text-4xl font-black">{result.correctAnswers}/{result.totalQuestions}</p>
          </div>
        </div>
        <p className="text-zinc-600 font-medium">{result.feedback}</p>
        <button 
          onClick={onBack}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Exit Exam
        </button>
        {timeLeft !== null && (
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl font-mono font-bold">
            <Clock className="w-4 h-4" />
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
      </header>

      <div className="bg-white border border-black/5 rounded-[2rem] p-8 shadow-sm space-y-8">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <span>Question {currentQuestionIndex + 1} of {exam.questions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / exam.questions.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold leading-tight">{currentQuestion.text}</h3>
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setAnswers({ ...answers, [currentQuestionIndex]: idx })}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left font-bold ${
                  answers[currentQuestionIndex] === idx
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-zinc-100 hover:border-zinc-200 text-zinc-600"
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  answers[currentQuestionIndex] === idx ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-200"
                }`}>
                  {answers[currentQuestionIndex] === idx && <CheckCircle2 className="w-4 h-4" />}
                </div>
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-8 border-t border-black/5">
          <button
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            className="px-6 py-3 text-zinc-500 font-bold disabled:opacity-30"
          >
            Previous
          </button>
          {currentQuestionIndex === exam.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              Submit Exam
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

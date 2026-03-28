import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, Timestamp } from 'firebase/firestore';
import { ChevronRight, Clock, CheckCircle2, AlertCircle, Trophy, XCircle, CheckCircle } from 'lucide-react';
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
  const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);
  const [isCheckingAttempts, setIsCheckingAttempts] = useState(true);

  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  useEffect(() => {
    if (!profile) return;

    // Fetch previous attempts
    const attemptsQuery = query(
      collection(db, 'examResults'),
      where('studentId', '==', profile.uid),
      where('examId', '==', examId)
    );

    const unsubAttempts = onSnapshot(attemptsQuery, (snapshot) => {
      setPreviousAttempts(snapshot.docs.map(doc => doc.data()));
      setIsCheckingAttempts(false);
    });

    const unsubExam = onSnapshot(doc(db, 'exams', examId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setExam(data);
        
        if (data.questions && data.questions.length > 0) {
          // Shuffle questions
          const questions = shuffleArray(data.questions).map((q: any) => {
            // Shuffle options for each question
            const originalOptions = q.options.map((text: string, index: number) => ({ text, index }));
            const shuffledOptions = shuffleArray(originalOptions);
            
            // Find the new index of the correct answer
            const newCorrectIndex = shuffledOptions.findIndex(opt => opt.index === q.correctAnswer);
            
            return {
              ...q,
              options: shuffledOptions.map(opt => opt.text),
              correctAnswer: newCorrectIndex,
              originalQuestion: q // Keep reference for review if needed
            };
          });
          setShuffledQuestions(questions);
        }

        if (data.duration) {
          setTimeLeft(data.duration * 60);
        }
      }
    });

    return () => {
      unsubAttempts();
      unsubExam();
    };
  }, [examId, profile]);

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
    if (!exam || !profile || shuffledQuestions.length === 0) return;

    let correctCount = 0;
    shuffledQuestions.forEach((q: any, idx: number) => {
      if (answers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = (correctCount / shuffledQuestions.length) * 100;
    const resultData = {
      examId,
      examTitle: exam.title,
      studentId: profile.uid,
      studentName: profile.displayName,
      score,
      totalQuestions: shuffledQuestions.length,
      correctAnswers: correctCount,
      completedAt: Timestamp.now(),
      feedback: score >= (exam.passingScore || 70) ? "Congratulations! You passed." : "Keep studying and try again."
    };

    const resultId = doc(collection(db, 'examResults')).id;
    await setDoc(doc(db, 'examResults', resultId), resultData);
    setResult(resultData);
    setIsFinished(true);
  };

  if (isCheckingAttempts || !exam) return <div className="p-8 text-center">Loading exam...</div>;

  // Check if max attempts reached
  const maxAttempts = exam.maxAttempts || 0;
  if (!isFinished && maxAttempts > 0 && previousAttempts.length >= maxAttempts) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white border border-black/5 rounded-[2rem] shadow-xl text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold">Limit Reached</h2>
        <p className="text-zinc-600">
          You have already completed this exam {previousAttempts.length} times. 
          The maximum allowed attempts for this exam is {maxAttempts}.
        </p>
        <button 
          onClick={onBack}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  if (isFinished && result) {
    if (showReview) {
      return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
          <header className="flex items-center justify-between">
            <button onClick={() => setShowReview(false)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Results
            </button>
            <div className="text-sm font-bold text-zinc-500">
              Score: {result.score.toFixed(1)}% ({result.correctAnswers}/{result.totalQuestions})
            </div>
          </header>

          <div className="space-y-6">
            {shuffledQuestions.map((q: any, idx: number) => {
              const isCorrect = answers[idx] === q.correctAnswer;
              return (
                <div key={idx} className={`bg-white border rounded-[2rem] p-8 shadow-sm space-y-4 ${isCorrect ? 'border-emerald-100' : 'border-red-100'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-bold leading-tight">
                      <span className="text-zinc-300 mr-2">{idx + 1}.</span>
                      {q.text}
                    </h3>
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((option: string, oIdx: number) => {
                      let style = "border-zinc-100 text-zinc-500";
                      if (oIdx === q.correctAnswer) {
                        style = "border-emerald-500 bg-emerald-50 text-emerald-700";
                      } else if (oIdx === answers[idx] && !isCorrect) {
                        style = "border-red-500 bg-red-50 text-red-700";
                      }

                      return (
                        <div key={oIdx} className={`p-4 rounded-xl border-2 font-medium ${style}`}>
                          {option}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Explanation</p>
                      <p className="text-sm text-blue-800">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button 
            onClick={onBack}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

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
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setShowReview(true)}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            Review Answers
          </button>
          <button 
            onClick={onBack}
            className="w-full py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (shuffledQuestions.length === 0) return <div className="p-8 text-center">Preparing questions...</div>;

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

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
            <span>Question {currentQuestionIndex + 1} of {shuffledQuestions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / shuffledQuestions.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / shuffledQuestions.length) * 100}%` }}
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
          {currentQuestionIndex === shuffledQuestions.length - 1 ? (
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

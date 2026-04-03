import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  
  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-zinc-950 flex items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-zinc-200/50 dark:shadow-none p-8 md:p-12 border border-black/5 dark:border-white/5">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="px-6 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold italic mb-6 shadow-lg shadow-purple-200 dark:shadow-none">EduPulse</div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white dark:text-white">EduPulse LMS</h1>
          <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mt-2">The future of education, simplified.</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-2xl font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>
          
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100 dark:border-zinc-800 dark:border-zinc-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500"><span className="bg-white dark:bg-zinc-900 px-4">Or use demo account</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors">Teacher Demo</button>
            <button className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 dark:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors">Admin Demo</button>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 leading-relaxed">
          By continuing, you agree to EduPulse's <br />
          <span className="underline cursor-pointer hover:text-zinc-600 dark:text-zinc-300 dark:hover:text-zinc-300">Terms of Service</span> and <span className="underline cursor-pointer hover:text-zinc-600 dark:text-zinc-300 dark:hover:text-zinc-300">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { Users, ChevronRight, PlayCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface CourseCardProps {
  course: any;
  onClick: () => void;
  progress?: number;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onClick, progress }) => (
  <div 
    onClick={onClick}
    className="bg-white border border-black/5 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all group cursor-pointer flex flex-col h-full"
  >
    <div className="aspect-video bg-zinc-100 relative overflow-hidden">
      <img 
        src={course.thumbnail || `https://picsum.photos/seed/${course.id}/800/450`} 
        alt={course.title} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300" />
      </div>
      {course.price > 0 && !progress && (
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-xs font-black shadow-xl">
          ${course.price}
        </div>
      )}
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 backdrop-blur-sm">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
          />
        </div>
      )}
    </div>
    <div className="p-6 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-3">
        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg tracking-widest">
          {course.category || 'General'}
        </span>
        {progress !== undefined && (
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{progress}% DONE</span>
        )}
      </div>
      <h3 className="font-black text-xl leading-tight mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">{course.title}</h3>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-400">
          {course.teacherName?.charAt(0) || 'I'}
        </div>
        <span className="text-xs font-bold text-zinc-500">By {course.teacherName || 'Instructor'}</span>
      </div>
      <div className="flex items-center justify-between pt-5 mt-auto border-t border-black/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-tighter">24 Students</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-tighter">12h 30m</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
);

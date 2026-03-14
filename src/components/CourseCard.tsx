import React from 'react';
import { Users, ChevronRight } from 'lucide-react';

interface CourseCardProps {
  course: any;
  onClick: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer"
  >
    <div className="aspect-video bg-zinc-100 relative">
      <img 
        src={course.thumbnail || `https://picsum.photos/seed/${course.id}/800/450`} 
        alt={course.title} 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      {course.price > 0 && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold shadow-sm">
          ${course.price}
        </div>
      )}
    </div>
    <div className="p-5">
      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{course.category || 'General'}</p>
      <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500">By {course.teacherName || 'Instructor'}</span>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-black/5">
        <div className="flex items-center gap-1 text-zinc-400">
          <Users className="w-3 h-3" />
          <span className="text-xs">24 students</span>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
      </div>
    </div>
  </div>
);

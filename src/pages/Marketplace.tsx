import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { CourseCard } from '../components/CourseCard';
import { ShoppingBag, Search, Filter, Trophy, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface MarketplaceProps {
  onSelectCourse: (id: string) => void;
  onSelectExam: (id: string) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectCourse, onSelectExam }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'exams'>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const coursesQuery = query(collection(db, 'courses'), where('isPublic', '==', true));
    const unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));

    const examsQuery = query(collection(db, 'exams'), where('isPublic', '==', true));
    const unsubExams = onSnapshot(examsQuery, (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'exams'));

    if (profile) {
      const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
      const unsubEnroll = onSnapshot(enrollQuery, (snapshot) => {
        setEnrollments(snapshot.docs.map(doc => doc.data()));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));
      return () => {
        unsubCourses();
        unsubExams();
        unsubEnroll();
      };
    }

    return () => {
      unsubCourses();
      unsubExams();
    };
  }, [profile]);

  const handleEnroll = async (item: any, type: 'course' | 'exam') => {
    if (!profile) return;
    try {
      const enrollmentId = `${profile.uid}_${item.id}`;
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        studentId: profile.uid,
        studentName: profile.displayName,
        [type === 'course' ? 'courseId' : 'examId']: item.id,
        title: item.title,
        enrolledAt: Timestamp.now(),
        progress: 0,
        status: 'pending',
        paymentVerified: item.price === 0,
        type: type
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `enrollments/${profile.uid}_${item.id}`);
    }
  };

  const filteredItems = (activeTab === 'courses' ? courses : exams).filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-200">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900">Marketplace</h1>
          </div>
          <p className="text-xl text-zinc-500 font-medium leading-relaxed">
            Unlock your potential with world-class courses and professional certifications.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search courses, exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 transition-all font-medium"
            />
          </div>
          <div className="flex bg-zinc-100 p-1.5 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'courses' ? 'bg-white shadow-xl text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'exams' ? 'bg-white shadow-xl text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Exams
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-zinc-500">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Categories</span>
        </div>
        {['All', 'Math', 'Science', 'Programming', 'Languages', 'Art', 'Business'].map((cat) => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2",
              selectedCategory === cat 
                ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" 
                : "bg-white border-black/5 text-zinc-500 hover:border-emerald-200 hover:text-emerald-600"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-96 bg-zinc-100 animate-pulse rounded-[3rem]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {filteredItems.map((item) => {
            const enrollment = enrollments.find(e => (activeTab === 'courses' ? e.courseId : e.examId) === item.id);
            const isEnrolled = !!enrollment;
            const isApproved = enrollment?.status === 'approved';
            const isPending = enrollment?.status === 'pending';
            const isDenied = enrollment?.status === 'denied';

            return activeTab === 'courses' ? (
              <div key={item.id} className="relative group">
                <CourseCard 
                  course={item} 
                  onClick={() => isApproved ? onSelectCourse(item.id) : !isEnrolled && handleEnroll(item, 'course')}
                />
                {!isEnrolled && (
                  <div className="absolute top-6 left-6">
                    <div className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      New
                    </div>
                  </div>
                )}
                {isEnrolled && (
                  <div className="absolute top-6 left-6">
                    <div className={cn(
                      "px-3 py-1 text-white text-[10px] font-black uppercase rounded-lg shadow-lg flex items-center gap-1.5",
                      isApproved ? "bg-emerald-600" : isPending ? "bg-amber-500" : "bg-red-500"
                    )}>
                      {isApproved ? "Enrolled" : isPending ? "Pending Approval" : "Denied"}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col h-full"
                onClick={() => isApproved ? onSelectExam(item.id) : !isEnrolled && handleEnroll(item, 'exam')}
              >
                <div className="aspect-video bg-zinc-900 relative flex items-center justify-center overflow-hidden">
                  <Trophy className="w-20 h-20 text-zinc-700 group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors" />
                  <div className="absolute top-6 right-6 px-4 py-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-2xl text-xs font-black shadow-2xl dark:text-white">
                    {item.price > 0 ? `$${item.price}` : 'FREE'}
                  </div>
                  {isEnrolled && (
                    <div className="absolute top-6 left-6">
                      <div className={cn(
                        "px-3 py-1 text-white text-[10px] font-black uppercase rounded-lg shadow-lg flex items-center gap-1.5",
                        isApproved ? "bg-emerald-600" : isPending ? "bg-amber-500" : "bg-red-500"
                      )}>
                        {isApproved ? "Enrolled" : isPending ? "Pending" : "Denied"}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase rounded-lg tracking-widest">Certification</span>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">By {item.teacherName}</span>
                  </div>
                  <h3 className="font-black text-2xl leading-tight mb-4 group-hover:text-emerald-600 transition-colors line-clamp-2 dark:text-white">{item.title}</h3>
                  <p className="text-zinc-500 font-medium line-clamp-2 mb-8 flex-1">{item.description}</p>
                  
                  <button className={cn(
                    "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl",
                    isApproved
                      ? "bg-zinc-900 text-white hover:bg-black"
                      : isPending
                        ? "bg-amber-500 text-white cursor-not-allowed"
                        : isDenied
                          ? "bg-red-500 text-white cursor-not-allowed"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100"
                  )}>
                    {isApproved ? 'Open Exam' : isPending ? 'Pending Approval' : isDenied ? 'Enrollment Denied' : (item.price > 0 ? 'Purchase Exam' : 'Enroll Free')}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-40 text-center bg-zinc-50 rounded-[4rem] border-4 border-dashed border-zinc-100">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl">
            <Search className="w-16 h-16 text-zinc-100" />
          </div>
          <h2 className="text-4xl font-black text-zinc-900 tracking-tighter">No results found</h2>
          <p className="text-zinc-400 mt-4 max-w-md text-lg font-medium">
            We couldn't find any {activeTab} matching your search criteria. Try a different keyword or category.
          </p>
        </div>
      )}
    </div>
  );
};

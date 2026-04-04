import React from 'react';
import { motion } from 'motion/react';
import { School, Shield, Users, BookOpen, BarChart3, ChevronRight, Star, CheckCircle2, Globe, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage: React.FC = () => {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-purple-100 selection:text-purple-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <School size={24} />
            </div>
            <span className="font-black text-xl tracking-tighter">EduPulse</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-500 dark:text-zinc-400">
            <a href="#features" className="hover:text-purple-600 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-purple-600 transition-colors">Solutions</a>
            <a href="#about" className="hover:text-purple-600 transition-colors">About</a>
          </div>

          <button 
            onClick={signIn}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="px-4 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-widest rounded-full border border-purple-100 dark:border-purple-800/50 mb-8 inline-block">
              The Future of Education Management
            </span>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
              Empower your school<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-emerald-500">with intelligence.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-12">
              A unified platform for administrators, teachers, students, and parents. 
              Streamline operations, enhance learning, and foster collaboration.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={signIn}
                className="w-full sm:w-auto px-10 py-5 bg-purple-600 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 transition-all"
              >
                Start Your Journey
                <ChevronRight size={24} />
              </button>
              <button className="w-full sm:w-auto px-10 py-5 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-[2rem] font-black text-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all">
                Watch Demo
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-transparent z-10" />
            <div className="bg-zinc-100 dark:bg-zinc-900 rounded-[3rem] aspect-video overflow-hidden border-8 border-white dark:border-zinc-900 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=2000" 
                alt="Platform Preview"
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <div>
            <p className="text-4xl font-black text-purple-600 mb-2">500+</p>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Schools</p>
          </div>
          <div>
            <p className="text-4xl font-black text-emerald-500 mb-2">50k+</p>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Students</p>
          </div>
          <div>
            <p className="text-4xl font-black text-amber-500 mb-2">99.9%</p>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Uptime</p>
          </div>
          <div>
            <p className="text-4xl font-black text-blue-500 mb-2">24/7</p>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Support</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Everything you need to succeed</h2>
            <p className="text-xl text-zinc-500 font-medium max-w-2xl mx-auto">
              Our comprehensive suite of tools covers every aspect of the educational ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="w-8 h-8 text-purple-600" />,
                title: "Super Admin Control",
                description: "Manage multiple schools, oversee global settings, and monitor system-wide performance."
              },
              {
                icon: <School className="w-8 h-8 text-emerald-500" />,
                title: "School Management",
                description: "Dedicated dashboards for school principals to manage staff, students, and local resources."
              },
              {
                icon: <Users className="w-8 h-8 text-amber-500" />,
                title: "Teacher Workspace",
                description: "Intuitive tools for lesson planning, attendance tracking, and grading student work."
              },
              {
                icon: <BookOpen className="w-8 h-8 text-blue-500" />,
                title: "Student Dashboard",
                description: "Personalized learning paths, course materials, and real-time progress tracking."
              },
              {
                icon: <Zap className="w-8 h-8 text-rose-500" />,
                title: "Parent Portal",
                description: "Stay connected with your child's academic journey and receive instant updates."
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-indigo-500" />,
                title: "Advanced Analytics",
                description: "Data-driven insights to improve student outcomes and operational efficiency."
              }
            ].map((feature, i) => (
              <div key={i} className="p-10 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-purple-600 rounded-[4rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-purple-500/40">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">Ready to transform your school?</h2>
            <p className="text-xl text-purple-100 font-medium mb-12 max-w-2xl mx-auto">
              Join hundreds of schools already using EduPulse to deliver better education.
            </p>
            <button 
              onClick={signIn}
              className="px-12 py-6 bg-white text-purple-600 rounded-[2rem] font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-zinc-100 dark:border-zinc-900 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
              <School size={18} />
            </div>
            <span className="font-black text-lg tracking-tighter">EduPulse</span>
          </div>
          
          <div className="flex gap-8 text-sm font-bold text-zinc-500">
            <a href="#" className="hover:text-purple-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-purple-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-purple-600 transition-colors">Contact</a>
          </div>

          <p className="text-sm text-zinc-400 font-medium">
            © 2026 EduPulse. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

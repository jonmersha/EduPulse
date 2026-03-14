import React from 'react';
import { Users } from 'lucide-react';

export const ParentView: React.FC = () => (
  <div className="space-y-8">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
      <p className="text-zinc-500 mt-1">Track your children's academic progress and attendance.</p>
    </header>
    <div className="bg-white border border-black/5 rounded-3xl p-12 text-center text-zinc-400">
      <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
      <h3 className="text-xl font-bold text-zinc-900 mb-2">Connect Your Child</h3>
      <p className="max-w-md mx-auto">Enter your child's student ID to start receiving updates on their learning journey.</p>
      <div className="mt-8 flex max-w-sm mx-auto gap-2">
        <input className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none" placeholder="Student ID" />
        <button className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">Connect</button>
      </div>
    </div>
  </div>
);

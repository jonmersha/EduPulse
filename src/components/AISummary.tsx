import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import Markdown from 'react-markdown';

interface AISummaryProps {
  content: string;
  title: string;
}

export const AISummary: React.FC<AISummaryProps> = ({ content, title }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'short' | 'detailed' | 'bullet' | 'concepts'>('short');

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `Summarize the following content: "${content}". 
      Mode: ${mode}. 
      Title: ${title}.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setSummary(response.text || 'No summary generated.');
    } catch (error) {
      console.error('Error summarizing:', error);
      setSummary('Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-zinc-900 uppercase tracking-widest text-sm flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          AI Summary
        </h3>
        <select 
          value={mode} 
          onChange={e => setMode(e.target.value as any)}
          className="px-3 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-black uppercase tracking-widest outline-none"
        >
          <option value="short">Short</option>
          <option value="detailed">Detailed</option>
          <option value="bullet">Bullet Points</option>
          <option value="concepts">Key Concepts</option>
        </select>
      </div>
      
      {!summary && (
        <button 
          onClick={handleSummarize}
          disabled={loading}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Summary'}
        </button>
      )}

      {summary && (
        <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed font-medium bg-white p-6 rounded-2xl border border-zinc-100">
          <Markdown>{summary}</Markdown>
        </div>
      )}
    </div>
  );
};

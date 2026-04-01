import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Send, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface CourseChatProps {
  courseId: string;
}

export const CourseChat: React.FC<CourseChatProps> = ({ courseId }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'chatMessages'),
      where('courseId', '==', courseId),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [courseId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newMessage.trim()) return;

    await addDoc(collection(db, 'chatMessages'), {
      courseId,
      senderId: profile.uid,
      senderName: profile.displayName || 'Anonymous',
      content: newMessage,
      createdAt: serverTimestamp()
    });
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-zinc-200 flex items-center gap-2 bg-zinc-50/50">
        <MessageSquare className="w-5 h-5 text-zinc-500" />
        <h3 className="font-bold text-zinc-900 text-sm">Course Chat</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <MessageSquare className="w-12 h-12 mb-4 text-zinc-200" />
            <p className="font-medium text-sm text-zinc-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === profile?.uid;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-700">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
                <div 
                  className={cn(
                    "px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed",
                    isMe 
                      ? 'bg-emerald-600 text-white rounded-br-sm' 
                      : 'bg-zinc-100 text-zinc-900 rounded-bl-sm'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-200 bg-white flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Send, MessageSquare } from 'lucide-react';

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
    <div className="flex flex-col h-[500px] bg-white border border-zinc-100 rounded-3xl overflow-hidden">
      <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-emerald-600" />
        <h3 className="font-black text-zinc-900 uppercase tracking-widest text-sm">Course Chat</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.senderId === profile?.uid ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
              {msg.senderName} • {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.senderId === profile?.uid ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-900'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-100 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <button type="submit" className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

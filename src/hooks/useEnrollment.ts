import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export function useEnrollment(courseId: string) {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !courseId) {
      setLoading(false);
      return;
    }

    const enrollmentRef = doc(db, 'courses', courseId, 'enrollments', user.uid);
    const unsubscribe = onSnapshot(enrollmentRef, (doc) => {
      if (doc.exists()) {
        setEnrollment(doc.data());
      } else {
        setEnrollment(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, courseId]);

  return { enrollment, loading };
}

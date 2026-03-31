import React from 'react';
import { LessonEditor } from '../components/LessonEditor';

interface CourseEditorPageProps {
  courseId: string;
  onBack: () => void;
}

export const CourseEditorPage: React.FC<CourseEditorPageProps> = ({ courseId, onBack }) => {
  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
      <LessonEditor courseId={courseId} onBack={onBack} />
    </div>
  );
};

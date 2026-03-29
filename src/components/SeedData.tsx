import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const SeedData: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const seed = async () => {
    if (!auth.currentUser) {
      console.error('Please log in first');
      setStatus('error');
      return;
    }
    setLoading(true);
    setStatus('idle');

    const addDocWithLogging = async (coll: string, data: any) => {
      try {
        return await addDoc(collection(db, coll), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, coll);
        throw error;
      }
    };

    try {
      const teacherId = auth.currentUser.uid;

      // Update current user to be a teacher
      await setDoc(doc(db, 'users', teacherId), {
        role: 'teacher',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 1. Create Course: Mastering React & TypeScript
      const course1Ref = await addDocWithLogging('courses', {
        title: 'Mastering React & TypeScript',
        description: 'A comprehensive guide to building modern web applications with React and TypeScript.',
        instructor: 'Dr. Sarah Chen',
        teacherId,
        price: 49.99,
        rating: 4.8,
        students: 1250,
        image: 'https://picsum.photos/seed/react/800/600',
        createdAt: serverTimestamp(),
        category: 'Development'
      });

      // Lessons for Course 1
      const lessons1 = [
        {
          courseId: course1Ref.id,
          section: 'Foundations',
          title: 'Introduction to React',
          shortDescription: 'Learn the core concepts of React and why it is so powerful.',
          content: '# Welcome to React\n\nReact is a declarative, efficient, and flexible JavaScript library for building user interfaces.',
          type: 'video',
          videoUrl: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
          order: 1
        },
        {
          courseId: course1Ref.id,
          section: 'Foundations',
          title: 'TypeScript Basics',
          shortDescription: 'A quick primer on TypeScript for React developers.',
          content: '## Why TypeScript?\n\nTypeScript adds static typing to JavaScript, making your code more robust and easier to maintain.',
          type: 'text',
          order: 2
        },
        {
          courseId: course1Ref.id,
          section: 'Advanced Patterns',
          title: 'Component Design Patterns',
          shortDescription: 'Exploring HOCs, Render Props, and Compound Components.',
          content: 'This module covers advanced patterns that will help you write cleaner and more reusable components.',
          type: 'container',
          order: 3
        }
      ];

      for (const lesson of lessons1) {
        const lessonRef = await addDocWithLogging('lessons', lesson);
        
        // Add sub-lessons if it's a container
        if (lesson.type === 'container') {
          const subLessons = [
            {
              courseId: course1Ref.id,
              parentId: lessonRef.id,
              section: 'Advanced Patterns',
              title: 'Higher Order Components (HOC)',
              shortDescription: 'Learn how to wrap components to inject functionality.',
              content: '### Higher Order Components\n\nAn HOC is a function that takes a component and returns a new component.',
              type: 'text',
              order: 1
            },
            {
              courseId: course1Ref.id,
              parentId: lessonRef.id,
              section: 'Advanced Patterns',
              title: 'Render Props Pattern',
              shortDescription: 'A powerful alternative to HOCs for sharing logic.',
              content: '### Render Props\n\nThe term "render prop" refers to a technique for sharing code between React components using a prop whose value is a function.',
              type: 'video',
              videoUrl: 'https://www.youtube.com/watch?v=3ID780_S_Cg',
              order: 2
            }
          ];
          for (const sub of subLessons) {
            await addDocWithLogging('lessons', sub);
          }
        }
      }

      // 2. Create Course: Modern UI Design with Tailwind
      const course2Ref = await addDocWithLogging('courses', {
        title: 'Modern UI Design with Tailwind',
        description: 'Master utility-first CSS and build beautiful, responsive interfaces.',
        instructor: 'Marcus Aurelius',
        teacherId,
        price: 29.99,
        rating: 4.9,
        students: 850,
        image: 'https://picsum.photos/seed/design/800/600',
        createdAt: serverTimestamp(),
        category: 'Design'
      });

      const lessons2 = [
        {
          courseId: course2Ref.id,
          section: 'Design Principles',
          title: 'Color Theory in UI',
          shortDescription: 'How to choose the perfect palette for your app.',
          content: '# Color Theory\n\nColor is one of the most powerful tools in a designer\'s toolkit.',
          type: 'video',
          videoUrl: 'https://www.youtube.com/watch?v=LKnqZkj8uqo',
          order: 1
        },
        {
          courseId: course2Ref.id,
          section: 'Design Principles',
          title: 'Typography for the Web',
          shortDescription: 'A guide to selecting and pairing fonts.',
          content: 'Typography is the art and technique of arranging type to make written language legible, readable and appealing when displayed.',
          type: 'pdf',
          pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          order: 2
        }
      ];

      for (const lesson of lessons2) {
        await addDocWithLogging('lessons', lesson);
      }

      // 3. Create Course: Grade 8 General Science (Ethiopia)
      const scienceCourseRef = await addDocWithLogging('courses', {
        title: 'Grade 8 General Science (Ethiopia)',
        description: 'A comprehensive introduction to Biology, Chemistry, Physics, and Earth Science based on the Ethiopian curriculum.',
        instructor: 'Abebe Bikila',
        teacherId,
        price: 0,
        rating: 4.7,
        students: 500,
        image: 'https://picsum.photos/seed/science/800/600',
        createdAt: serverTimestamp(),
        category: 'Science'
      });

      const scienceLessons = [
        // Unit 1: Biology
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 1: Biology (Life Science)',
          title: 'Cell Structure and Function',
          shortDescription: 'Definition of cells, types, and organelles.',
          content: '# Cell Structure and Function\n\nCells are the basic building blocks of all living things. The human body is composed of trillions of cells. They provide structure for the body, take in nutrients from food, convert those nutrients into energy, and carry out specialized functions.',
          type: 'text',
          order: 1
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 1: Biology (Life Science)',
          title: 'Human Body Systems',
          shortDescription: 'Digestive, Respiratory, and Circulatory systems.',
          content: '# Human Body Systems\n\nThe human body is a complex machine made up of several systems that work together to keep us alive and healthy.',
          type: 'video',
          videoUrl: 'https://www.youtube.com/watch?v=gEUu-A2W1n8',
          order: 2
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 1: Biology (Life Science)',
          title: 'Reproduction and Growth',
          shortDescription: 'Asexual and sexual reproduction, growth stages.',
          content: '# Reproduction and Growth\n\nReproduction is the process by which organisms produce offspring. Growth is the increase in size and mass over time.',
          type: 'text',
          order: 3
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 1: Biology (Life Science)',
          title: 'Ecology and Environment',
          shortDescription: 'Ecosystems, food chains, and conservation.',
          content: '# Ecology and Environment\n\nEcology is the study of how organisms interact with one another and with their physical environment.',
          type: 'text',
          order: 4
        },
        // Unit 2: Chemistry
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 2: Chemistry',
          title: 'Matter and Its Properties',
          shortDescription: 'States of matter and their properties.',
          content: '# Matter and Its Properties\n\nMatter is anything that has mass and takes up space. It exists in three primary states: solid, liquid, and gas.',
          type: 'text',
          order: 5
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 2: Chemistry',
          title: 'Elements, Compounds, and Mixtures',
          shortDescription: 'Definitions and differences.',
          content: '# Elements, Compounds, and Mixtures\n\nAn element is a substance that cannot be broken down into simpler substances. A compound is a substance formed when two or more elements are chemically joined.',
          type: 'text',
          order: 6
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 2: Chemistry',
          title: 'Atomic Structure (Basic)',
          shortDescription: 'Atoms, protons, neutrons, and electrons.',
          content: '# Atomic Structure\n\nAtoms are the basic units of matter and the defining structure of elements. They are made of three particles: protons, neutrons, and electrons.',
          type: 'text',
          order: 7
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 2: Chemistry',
          title: 'Chemical Reactions',
          shortDescription: 'Types of reactions and signs of change.',
          content: '# Chemical Reactions\n\nA chemical reaction is a process that leads to the chemical transformation of one set of chemical substances to another.',
          type: 'video',
          videoUrl: 'https://www.youtube.com/watch?v=TStjgUgu18Y',
          order: 8
        },
        // Unit 3: Physics
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 3: Physics',
          title: 'Force and Motion',
          shortDescription: 'Types of forces and basic laws of motion.',
          content: '# Force and Motion\n\nForce is a push or pull upon an object resulting from the object\'s interaction with another object.',
          type: 'text',
          order: 9
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 3: Physics',
          title: 'Work, Energy, and Power',
          shortDescription: 'Definitions, relationships, and types of energy.',
          content: '# Work, Energy, and Power\n\nWork is done when a force that is applied to an object moves that object. Energy is the ability to do work.',
          type: 'text',
          order: 10
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 3: Physics',
          title: 'Heat and Temperature',
          shortDescription: 'Heat transfer and measuring temperature.',
          content: '# Heat and Temperature\n\nHeat is the transfer of energy from a high temperature object to a lower temperature object.',
          type: 'text',
          order: 11
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 3: Physics',
          title: 'Light and Sound',
          shortDescription: 'Properties of light and sound waves.',
          content: '# Light and Sound\n\nLight is a form of energy that allows us to see. Sound is a vibration that propagates as an acoustic wave.',
          type: 'video',
          videoUrl: 'https://www.youtube.com/watch?v=gdGyvGPZ1G0',
          order: 12
        },
        // Unit 4: Earth Science
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 4: Earth Science',
          title: 'Structure of the Earth',
          shortDescription: 'Layers of the Earth, rocks, and minerals.',
          content: '# Structure of the Earth\n\nThe Earth is composed of four main layers: the crust, the mantle, the outer core, and the inner core.',
          type: 'text',
          order: 13
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 4: Earth Science',
          title: 'Weather and Climate',
          shortDescription: 'Elements of weather and climate patterns.',
          content: '# Weather and Climate\n\nWeather refers to short-term changes in the atmosphere, while climate describes what the weather is like over a long period of time.',
          type: 'text',
          order: 14
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 4: Earth Science',
          title: 'Natural Resources',
          shortDescription: 'Renewable and non-renewable resources.',
          content: '# Natural Resources\n\nNatural resources are materials from the Earth that are used to support life and meet people\'s needs.',
          type: 'text',
          order: 15
        },
        {
          courseId: scienceCourseRef.id,
          section: 'Unit 4: Earth Science',
          title: 'Space Science',
          shortDescription: 'Solar system and planets.',
          content: '# Space Science\n\nThe solar system consists of the Sun and everything that orbits around it, including eight planets.',
          type: 'video',
          videoUrl: 'https://www.youtube.com/watch?v=libKVRa01L8',
          order: 16
        }
      ];

      for (const lesson of scienceLessons) {
        await addDocWithLogging('lessons', lesson);
      }

      // 4. Create Sample Resources
      const sampleResources = [
        {
          courseId: course1Ref.id,
          title: 'React Documentation',
          url: 'https://react.dev',
          type: 'link',
          createdAt: serverTimestamp()
        },
        {
          courseId: course1Ref.id,
          title: 'TypeScript Handbook',
          url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
          type: 'pdf',
          createdAt: serverTimestamp()
        },
        {
          courseId: course2Ref.id,
          title: 'Tailwind CSS Cheat Sheet',
          url: 'https://nerdcave.com/tailwind-cheat-sheet',
          type: 'link',
          createdAt: serverTimestamp()
        }
      ];
      for (const res of sampleResources) {
        await addDocWithLogging('resources', res);
      }

      // 5. Create Sample Questions & Answers
      const q1Ref = await addDocWithLogging('questions', {
        courseId: course1Ref.id,
        studentId: teacherId, // Using teacherId as a proxy for a student for seeding
        studentName: 'Test Student',
        content: 'How do I handle complex state transitions in React?',
        createdAt: serverTimestamp()
      });

      await addDocWithLogging('answers', {
        questionId: q1Ref.id,
        userId: teacherId,
        userName: 'Dr. Sarah Chen',
        userRole: 'teacher',
        content: 'For complex state, I highly recommend using the useReducer hook. It provides a more predictable way to manage state transitions compared to multiple useState calls.',
        createdAt: serverTimestamp()
      });

      const q2Ref = await addDocWithLogging('questions', {
        courseId: course2Ref.id,
        studentId: teacherId,
        studentName: 'Design Enthusiast',
        content: 'Is Tailwind better than Bootstrap for large scale projects?',
        createdAt: serverTimestamp()
      });

      await addDocWithLogging('answers', {
        questionId: q2Ref.id,
        userId: teacherId,
        userName: 'Marcus Aurelius',
        userRole: 'teacher',
        content: 'Tailwind offers more flexibility and results in smaller CSS bundles because it only includes the utilities you actually use. For large projects, this maintainability is a huge win.',
        createdAt: serverTimestamp()
      });

      // 3. Create Exams
      await addDocWithLogging('exams', {
        courseId: course1Ref.id,
        title: 'React & TypeScript Certification',
        description: 'Final certification exam for the Mastering React & TypeScript course. Test your knowledge of hooks, types, and patterns.',
        duration: 45,
        passingScore: 80,
        teacherId,
        isPublic: true,
        price: 0,
        createdAt: serverTimestamp(),
        questions: [
          {
            text: 'What is the main benefit of using TypeScript with React?',
            options: [
              'Faster runtime performance',
              'Static type checking and better IDE support',
              'Automatic CSS generation',
              'Smaller bundle sizes'
            ],
            correctAnswer: 1,
            explanation: 'TypeScript provides static type checking which helps catch errors during development and improves developer experience with better autocomplete.'
          },
          {
            text: 'Which hook is used for side effects in React?',
            options: ['useState', 'useContext', 'useEffect', 'useReducer'],
            correctAnswer: 2,
            explanation: 'useEffect is the standard hook for performing side effects like data fetching or manual DOM manipulations.'
          },
          {
            text: 'What does the "key" prop help React with?',
            options: [
              'Styling individual elements',
              'Identifying which items have changed, been added, or removed',
              'Connecting to a database',
              'Setting the component name'
            ],
            correctAnswer: 1,
            explanation: 'Keys help React identify which items in a list are stable across renders.'
          }
        ]
      });

      await addDocWithLogging('exams', {
        courseId: course2Ref.id,
        title: 'Tailwind CSS Proficiency Test',
        description: 'Test your knowledge of utility-first CSS patterns and responsive design.',
        duration: 30,
        passingScore: 70,
        teacherId,
        isPublic: true,
        price: 0,
        createdAt: serverTimestamp(),
        questions: [
          {
            text: 'Which Tailwind class is used to add padding to all sides?',
            options: ['m-4', 'p-4', 'pad-4', 'space-4'],
            correctAnswer: 1,
            explanation: 'The "p-" prefix is used for padding in Tailwind CSS.'
          },
          {
            text: 'How do you apply a style only on medium screens and above in Tailwind?',
            options: ['medium:flex', 'md-flex', 'screen-md:flex', 'md:flex'],
            correctAnswer: 3,
            explanation: 'Tailwind uses the "md:" prefix for the medium breakpoint.'
          }
        ]
      });

      await addDocWithLogging('exams', {
        title: 'General Web Development Quiz',
        description: 'A broad test covering HTML, CSS, and basic JavaScript concepts.',
        duration: 20,
        passingScore: 60,
        teacherId,
        isPublic: true,
        price: 0,
        createdAt: serverTimestamp(),
        questions: [
          {
            text: 'What does HTML stand for?',
            options: [
              'Hyper Text Markup Language',
              'High Tech Modern Language',
              'Hyperlink and Text Management',
              'Home Tool Markup Language'
            ],
            correctAnswer: 0
          },
          {
            text: 'Which property is used to change the background color in CSS?',
            options: ['color', 'bgcolor', 'background-color', 'fill'],
            correctAnswer: 2
          }
        ]
      });

      await addDocWithLogging('exams', {
        courseId: scienceCourseRef.id,
        title: 'Grade 8 Science Midterm',
        description: 'Midterm exam covering Biology and Chemistry units.',
        duration: 60,
        passingScore: 75,
        teacherId,
        isPublic: true,
        price: 0,
        createdAt: serverTimestamp(),
        questions: [
          {
            text: 'What is the "powerhouse" of the cell?',
            options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Cell Wall'],
            correctAnswer: 1,
            explanation: 'Mitochondria are known as the powerhouse of the cell because they generate most of the cell\'s supply of adenosine triphosphate (ATP).'
          },
          {
            text: 'Which of the following is a chemical property?',
            options: ['Density', 'Melting point', 'Flammability', 'Color'],
            correctAnswer: 2,
            explanation: 'Flammability is a chemical property because it describes how a substance reacts with oxygen to burn.'
          },
          {
            text: 'What are the three subatomic particles?',
            options: [
              'Protons, Neutrons, Electrons',
              'Atoms, Molecules, Cells',
              'Solids, Liquids, Gases',
              'Force, Motion, Energy'
            ],
            correctAnswer: 0,
            explanation: 'Atoms are composed of protons, neutrons, and electrons.'
          }
        ]
      });

      setStatus('success');
    } catch (error) {
      console.error('Error seeding data:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 left-8 z-50">
      <button
        onClick={seed}
        disabled={loading}
        className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-2xl ${
          status === 'success' 
            ? 'bg-emerald-600 text-white' 
            : status === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-900 text-white hover:bg-black'
        }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : status === 'error' ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <Database className="w-4 h-4" />
        )}
        {loading ? 'Seeding...' : status === 'success' ? 'Data Seeded!' : status === 'error' ? 'Error Seeding' : 'Seed Sample Data'}
      </button>
    </div>
  );
};

-- Relational Database Schema for Learning Management System (PostgreSQL)
-- This schema includes Row Level Security (RLS) policies equivalent to the Firestore rules.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================================
-- 1. Types and Enums
-- ===============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'teacher', 'student', 'parent', 'provider');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE lesson_type AS ENUM ('text', 'video', 'pdf', 'quiz', 'container');
CREATE TYPE exam_type AS ENUM ('lesson', 'section', 'final');
CREATE TYPE enrollment_status AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE resource_type AS ENUM ('pdf', 'link', 'video', 'document', 'other');

-- ===============================================================
-- 2. Tables
-- ===============================================================

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'student',
    school_id UUID, -- Primary school
    class_id UUID,
    specialization TEXT,
    is_independent BOOLEAN DEFAULT FALSE,
    status user_status DEFAULT 'active',
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schools Table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    academic_structure VARCHAR(100),
    admin_id UUID REFERENCES users(id),
    status user_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for users.school_id after schools table is created
ALTER TABLE users ADD CONSTRAINT fk_user_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;

-- Junction Table for Teachers in Multiple Schools
CREATE TABLE user_schools (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, school_id)
);

-- Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    grade VARCHAR(50),
    year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for users.class_id after classes table is created
ALTER TABLE users ADD CONSTRAINT fk_user_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

-- Courses Table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    price NUMERIC(10, 2) DEFAULT 0,
    category VARCHAR(100),
    thumbnail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sections Table
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    overview TEXT,
    order_index INT DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE
);

-- Lessons Table
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    short_description TEXT,
    content TEXT,
    video_url TEXT,
    pdf_url TEXT,
    type lesson_type NOT NULL,
    order_index INT DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exams Table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    type exam_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INT, -- Minutes
    passing_score NUMERIC(5, 2),
    questions JSONB NOT NULL DEFAULT '[]',
    is_public BOOLEAN DEFAULT FALSE,
    price NUMERIC(10, 2) DEFAULT 0,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments Table
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress NUMERIC(5, 2) DEFAULT 0,
    completed_lessons JSONB DEFAULT '[]',
    payment_verified BOOLEAN DEFAULT FALSE,
    status enrollment_status NOT NULL DEFAULT 'pending',
    UNIQUE(student_id, course_id),
    UNIQUE(student_id, exam_id)
);

-- Exam Results Table
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) NOT NULL,
    total_questions INT,
    correct_answers INT,
    feedback TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resources Table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type resource_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Answers Table
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversations Table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    participants UUID[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Direct Messages Table
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================================
-- 3. Row Level Security (RLS) Policies
-- ===============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Helper Functions for Policies
-- Assuming current_user_id and current_user_email are available via session settings
-- e.g., SET app.current_user_id = '...'; SET app.current_user_email = '...';

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN (current_setting('app.current_user_email', true) IN ('jonmersha@gmail.com')) OR
           (EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::UUID AND role = 'super_admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_school_admin(school_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_super_admin() OR
           (EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::UUID AND role = 'admin' AND school_id = $1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example Policies for 'users' table
CREATE POLICY users_read_policy ON users FOR SELECT
USING (
    is_super_admin() OR 
    id = current_setting('app.current_user_id', true)::UUID OR
    school_id = (SELECT school_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID)
);

CREATE POLICY users_insert_policy ON users FOR INSERT
WITH CHECK (
    is_super_admin() OR
    (EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::UUID AND role = 'admin' AND school_id = users.school_id AND users.role NOT IN ('super_admin', 'admin')))
);

-- Example Policies for 'schools' table
CREATE POLICY schools_read_policy ON schools FOR SELECT
USING (TRUE); -- Authenticated users can read all schools

CREATE POLICY schools_all_policy ON schools FOR ALL
USING (is_super_admin());

-- Example Policies for 'courses' table
CREATE POLICY courses_read_policy ON courses FOR SELECT
USING (is_public = TRUE OR EXISTS (SELECT 1 FROM enrollments WHERE student_id = current_setting('app.current_user_id', true)::UUID AND course_id = courses.id AND status = 'approved') OR is_super_admin() OR teacher_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY courses_modify_policy ON courses FOR ALL
USING (is_super_admin() OR teacher_id = current_setting('app.current_user_id', true)::UUID);

-- ===============================================================
-- 4. Indexes
-- ===============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX idx_chat_messages_course_id ON chat_messages(course_id);

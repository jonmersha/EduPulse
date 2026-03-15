-- Relational Database Schema for Learning Management System
-- Database: PostgreSQL

-- 1. Schools Table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    admin_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    academic_structure VARCHAR(50) DEFAULT 'K-12', -- e.g., 'K-12', 'Higher Ed'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE, -- Link to Firebase Auth
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL, -- Primary school
    specialization TEXT, -- For teachers
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Junction Table for Teachers in Multiple Schools
CREATE TABLE user_schools (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, school_id)
);

-- 4. Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(50),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Link Students to Classes (One class per student)
ALTER TABLE users ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- 6. Courses Table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lessons Table
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    lesson_type VARCHAR(20) NOT NULL CHECK (lesson_type IN ('text', 'video', 'pdf')),
    video_url TEXT,
    pdf_url TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Enrollments Table (Many-to-Many between Students and Courses)
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'dropped'
    UNIQUE(user_id, course_id)
);

-- 9. Indexes for Performance
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_class ON users(class_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_courses_school ON courses(school_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- 10. Sample View for Teacher Schedule
CREATE VIEW teacher_schedule AS
SELECT 
    u.display_name AS teacher_name,
    s.name AS school_name,
    c.name AS class_name,
    co.title AS course_title
FROM users u
JOIN schools s ON u.school_id = s.id
LEFT JOIN classes c ON u.id = c.teacher_id
LEFT JOIN courses co ON u.id = co.teacher_id
WHERE u.role = 'teacher';

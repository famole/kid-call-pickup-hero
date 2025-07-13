-- Create test data for development environment
-- Insert test parent records with different roles

INSERT INTO public.parents (name, email, role, password_set, is_preloaded) VALUES
-- Admin users
('Admin User', 'admin@test.com', 'admin', true, false),
('Super Admin', 'superadmin@test.com', 'superadmin', true, false),

-- Teacher users  
('Teacher One', 'teacher1@test.com', 'teacher', true, false),
('Teacher Two', 'teacher2@test.com', 'teacher', true, false),

-- Parent users
('Parent One', 'parent1@test.com', 'parent', true, false),
('Parent Two', 'parent2@test.com', 'parent', true, false),
('Parent Three', 'parent3@test.com', 'parent', true, false),
('Parent Four', 'parent4@test.com', 'parent', true, false);

-- Create test classes
INSERT INTO public.classes (name, teacher, grade) VALUES
('Class 1A', 'Teacher One', '1st Grade'),
('Class 2B', 'Teacher Two', '2nd Grade'),
('Class 3C', 'Teacher One', '3rd Grade');

-- Create test students
INSERT INTO public.students (name, class_id) VALUES
('Student One', (SELECT id FROM public.classes WHERE name = 'Class 1A' LIMIT 1)),
('Student Two', (SELECT id FROM public.classes WHERE name = 'Class 1A' LIMIT 1)),
('Student Three', (SELECT id FROM public.classes WHERE name = 'Class 2B' LIMIT 1)),
('Student Four', (SELECT id FROM public.classes WHERE name = 'Class 2B' LIMIT 1)),
('Student Five', (SELECT id FROM public.classes WHERE name = 'Class 3C' LIMIT 1)),
('Student Six', (SELECT id FROM public.classes WHERE name = 'Class 3C' LIMIT 1));

-- Link students to parents
INSERT INTO public.student_parents (student_id, parent_id, is_primary, relationship) VALUES
-- Parent One has Student One and Two
((SELECT id FROM public.students WHERE name = 'Student One' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'parent1@test.com' LIMIT 1), true, 'Parent'),
((SELECT id FROM public.students WHERE name = 'Student Two' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'parent1@test.com' LIMIT 1), true, 'Parent'),

-- Parent Two has Student Three
((SELECT id FROM public.students WHERE name = 'Student Three' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'parent2@test.com' LIMIT 1), true, 'Parent'),

-- Parent Three has Student Four and Five
((SELECT id FROM public.students WHERE name = 'Student Four' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'parent3@test.com' LIMIT 1), true, 'Parent'),
((SELECT id FROM public.students WHERE name = 'Student Five' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'parent3@test.com' LIMIT 1), true, 'Parent'),

-- Parent Four has Student Six
((SELECT id FROM public.students WHERE name = 'Student Six' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'parent4@test.com' LIMIT 1), true, 'Parent');

-- Link teachers to classes
INSERT INTO public.class_teachers (class_id, teacher_id) VALUES
((SELECT id FROM public.classes WHERE name = 'Class 1A' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'teacher1@test.com' LIMIT 1)),
((SELECT id FROM public.classes WHERE name = 'Class 2B' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'teacher2@test.com' LIMIT 1)),
((SELECT id FROM public.classes WHERE name = 'Class 3C' LIMIT 1), (SELECT id FROM public.parents WHERE email = 'teacher1@test.com' LIMIT 1));
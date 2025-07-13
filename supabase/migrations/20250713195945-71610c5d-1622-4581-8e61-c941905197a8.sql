-- Insert test data for the school pickup management system

-- Insert Parent/User Records (including admins, teachers, and parents)
INSERT INTO public.parents (email, name, phone, role, password_set, is_preloaded) VALUES
('admin@school.com', 'Admin Principal', '555-0001', 'admin', true, false),
('teacher1@school.com', 'María García', '555-0002', 'teacher', true, false),
('teacher2@school.com', 'Carlos López', '555-0003', 'teacher', true, false),
('parent1@gmail.com', 'Ana Rodríguez', '555-0004', 'parent', true, false),
('parent2@gmail.com', 'Luis Martínez', '555-0005', 'parent', true, false),
('parent3@gmail.com', 'Carmen Fernández', '555-0006', 'parent', true, false),
('parent4@gmail.com', 'Miguel Torres', '555-0007', 'parent', true, false),
('parent5@gmail.com', 'Isabel Moreno', '555-0008', 'parent', true, false);

-- Insert Class Records
INSERT INTO public.classes (name, teacher, grade) VALUES
('Aula 1A', 'María García', '1º Primaria'),
('Aula 2B', 'Carlos López', '2º Primaria'),
('Aula 3C', 'María García', '3º Primaria'),
('Aula 4D', 'Carlos López', '4º Primaria');

-- Insert Student Records
INSERT INTO public.students (name, class_id) VALUES
('Sofia Rodríguez', (SELECT id FROM public.classes WHERE name = 'Aula 1A')),
('Diego Martínez', (SELECT id FROM public.classes WHERE name = 'Aula 1A')),
('Valentina Fernández', (SELECT id FROM public.classes WHERE name = 'Aula 2B')),
('Mateo Torres', (SELECT id FROM public.classes WHERE name = 'Aula 2B')),
('Emma Moreno', (SELECT id FROM public.classes WHERE name = 'Aula 3C')),
('Santiago Rodríguez', (SELECT id FROM public.classes WHERE name = 'Aula 3C')),
('Isabella Martínez', (SELECT id FROM public.classes WHERE name = 'Aula 4D')),
('Sebastián Fernández', (SELECT id FROM public.classes WHERE name = 'Aula 4D'));

-- Link Students to Parents (student_parents relationships)
INSERT INTO public.student_parents (student_id, parent_id, relationship, is_primary) VALUES
-- Ana Rodríguez's children
((SELECT id FROM public.students WHERE name = 'Sofia Rodríguez'), 
 (SELECT id FROM public.parents WHERE email = 'parent1@gmail.com'), 'Madre', true),
((SELECT id FROM public.students WHERE name = 'Santiago Rodríguez'), 
 (SELECT id FROM public.parents WHERE email = 'parent1@gmail.com'), 'Madre', true),

-- Luis Martínez's children  
((SELECT id FROM public.students WHERE name = 'Diego Martínez'), 
 (SELECT id FROM public.parents WHERE email = 'parent2@gmail.com'), 'Padre', true),
((SELECT id FROM public.students WHERE name = 'Isabella Martínez'), 
 (SELECT id FROM public.parents WHERE email = 'parent2@gmail.com'), 'Padre', true),

-- Carmen Fernández's children
((SELECT id FROM public.students WHERE name = 'Valentina Fernández'), 
 (SELECT id FROM public.parents WHERE email = 'parent3@gmail.com'), 'Madre', true),
((SELECT id FROM public.students WHERE name = 'Sebastián Fernández'), 
 (SELECT id FROM public.parents WHERE email = 'parent3@gmail.com'), 'Madre', true),

-- Miguel Torres's child
((SELECT id FROM public.students WHERE name = 'Mateo Torres'), 
 (SELECT id FROM public.parents WHERE email = 'parent4@gmail.com'), 'Padre', true),

-- Isabel Moreno's child
((SELECT id FROM public.students WHERE name = 'Emma Moreno'), 
 (SELECT id FROM public.parents WHERE email = 'parent5@gmail.com'), 'Madre', true);

-- Link Teachers to Classes
INSERT INTO public.class_teachers (class_id, teacher_id) VALUES
((SELECT id FROM public.classes WHERE name = 'Aula 1A'), 
 (SELECT id FROM public.parents WHERE email = 'teacher1@school.com')),
((SELECT id FROM public.classes WHERE name = 'Aula 3C'), 
 (SELECT id FROM public.parents WHERE email = 'teacher1@school.com')),
((SELECT id FROM public.classes WHERE name = 'Aula 2B'), 
 (SELECT id FROM public.parents WHERE email = 'teacher2@school.com')),
((SELECT id FROM public.classes WHERE name = 'Aula 4D'), 
 (SELECT id FROM public.parents WHERE email = 'teacher2@school.com'));

-- Insert some sample pickup requests for testing
INSERT INTO public.pickup_requests (student_id, parent_id, request_time, status) VALUES
-- Pending requests
((SELECT id FROM public.students WHERE name = 'Sofia Rodríguez'), 
 (SELECT id FROM public.parents WHERE email = 'parent1@gmail.com'), now() - interval '10 minutes', 'pending'),
((SELECT id FROM public.students WHERE name = 'Diego Martínez'), 
 (SELECT id FROM public.parents WHERE email = 'parent2@gmail.com'), now() - interval '5 minutes', 'pending'),
((SELECT id FROM public.students WHERE name = 'Mateo Torres'), 
 (SELECT id FROM public.parents WHERE email = 'parent4@gmail.com'), now() - interval '3 minutes', 'pending'),

-- Called requests  
((SELECT id FROM public.students WHERE name = 'Valentina Fernández'), 
 (SELECT id FROM public.parents WHERE email = 'parent3@gmail.com'), now() - interval '15 minutes', 'called'),
((SELECT id FROM public.students WHERE name = 'Emma Moreno'), 
 (SELECT id FROM public.parents WHERE email = 'parent5@gmail.com'), now() - interval '8 minutes', 'called');

-- Insert some pickup authorizations for testing cross-parent pickup
INSERT INTO public.pickup_authorizations (authorizing_parent_id, authorized_parent_id, student_id, start_date, end_date, is_active) VALUES
-- Ana allows Carmen to pick up Sofia
((SELECT id FROM public.parents WHERE email = 'parent1@gmail.com'),
 (SELECT id FROM public.parents WHERE email = 'parent3@gmail.com'),
 (SELECT id FROM public.students WHERE name = 'Sofia Rodríguez'),
 CURRENT_DATE - interval '1 day', CURRENT_DATE + interval '30 days', true),

-- Luis allows Miguel to pick up Diego  
((SELECT id FROM public.parents WHERE email = 'parent2@gmail.com'),
 (SELECT id FROM public.parents WHERE email = 'parent4@gmail.com'),
 (SELECT id FROM public.students WHERE name = 'Diego Martínez'),
 CURRENT_DATE, CURRENT_DATE + interval '7 days', true);
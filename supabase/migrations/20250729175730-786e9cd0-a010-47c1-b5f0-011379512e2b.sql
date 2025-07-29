
-- First, let's check what classes are assigned to teacher2@school.com
SELECT 
    p.name as teacher_name,
    p.email as teacher_email,
    c.name as class_name,
    c.grade,
    ct.created_at as assignment_date
FROM parents p
JOIN class_teachers ct ON p.id = ct.teacher_id
JOIN classes c ON ct.class_id = c.id
WHERE p.email = 'teacher2@school.com';

-- Let's also check if there are any students in Aula 1A that might be causing this issue
SELECT 
    s.name as student_name,
    c.name as class_name,
    c.grade
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE c.name = 'Aula 1A';

-- Check if there are any pickup requests for students in Aula 1A
SELECT 
    pr.id as request_id,
    pr.status,
    pr.request_time,
    s.name as student_name,
    c.name as class_name,
    p.name as parent_name,
    p.email as parent_email
FROM pickup_requests pr
JOIN students s ON pr.student_id = s.id
JOIN classes c ON s.class_id = c.id
JOIN parents p ON pr.parent_id = p.id
WHERE c.name = 'Aula 1A'
ORDER BY pr.request_time DESC;

-- Let's also verify the class_teachers table structure and see all teacher assignments
SELECT 
    p.name as teacher_name,
    p.email as teacher_email,
    c.name as class_name,
    c.id as class_id,
    ct.teacher_id,
    ct.class_id as ct_class_id
FROM parents p
JOIN class_teachers ct ON p.id = ct.teacher_id
JOIN classes c ON ct.class_id = c.id
ORDER BY p.email, c.name;

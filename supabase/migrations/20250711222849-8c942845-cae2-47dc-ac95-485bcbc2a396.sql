
-- Checking development database tables
SELECT 'parents' as table_name, COUNT(*) as record_count FROM parents
UNION ALL
SELECT 'students' as table_name, COUNT(*) as record_count FROM students  
UNION ALL
SELECT 'classes' as table_name, COUNT(*) as record_count FROM classes
UNION ALL
SELECT 'pickup_requests' as table_name, COUNT(*) as record_count FROM pickup_requests
UNION ALL
SELECT 'student_parents' as table_name, COUNT(*) as record_count FROM student_parents
ORDER BY table_name;

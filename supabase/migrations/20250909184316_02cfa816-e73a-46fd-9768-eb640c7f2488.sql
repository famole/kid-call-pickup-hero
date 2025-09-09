-- CLEANUP SCRIPT: Remove duplicates and fix timestamps in pickup_history

-- Step 1: Create a backup table first (optional but recommended)
CREATE TABLE IF NOT EXISTS pickup_history_backup AS 
SELECT * FROM pickup_history;

-- Step 2: Remove duplicate records (keep the most recent one based on created_at)
DELETE FROM pickup_history 
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id, 
      ROW_NUMBER() OVER (
        PARTITION BY student_id, parent_id, request_time 
        ORDER BY created_at DESC, id DESC
      ) as row_num
    FROM pickup_history
  ) duplicates 
  WHERE row_num > 1
);

-- Step 3: Fix timestamp issues - ensure completed_time is after request_time
UPDATE pickup_history 
SET completed_time = request_time + interval '5 minutes'
WHERE completed_time < request_time
   OR completed_time IS NULL;

-- Step 4: Fix called_time to match request_time for records that were called
UPDATE pickup_history 
SET called_time = request_time
WHERE called_time IS NULL 
   OR called_time < request_time;

-- Step 5: Recalculate pickup_duration_minutes based on corrected timestamps
UPDATE pickup_history 
SET pickup_duration_minutes = EXTRACT(EPOCH FROM (completed_time - called_time)) / 60
WHERE called_time IS NOT NULL 
  AND completed_time IS NOT NULL
  AND called_time <= completed_time;

-- Step 6: Set pickup_duration_minutes to NULL for records without proper timestamps
UPDATE pickup_history 
SET pickup_duration_minutes = NULL
WHERE called_time IS NULL 
   OR completed_time IS NULL
   OR called_time > completed_time;

-- Step 7: Clean up any records with invalid data (optional - uncomment if needed)
-- DELETE FROM pickup_history 
-- WHERE request_time IS NULL 
--    OR student_id IS NULL 
--    OR parent_id IS NULL;

-- Verification queries (run these to check the cleanup results)
SELECT 
  'Total records after cleanup' as description,
  COUNT(*) as count
FROM pickup_history

UNION ALL

SELECT 
  'Duplicate records remaining' as description,
  COUNT(*) as count
FROM (
  SELECT student_id, parent_id, request_time, COUNT(*) as cnt
  FROM pickup_history
  GROUP BY student_id, parent_id, request_time
  HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 
  'Records with invalid timestamps' as description,
  COUNT(*) as count
FROM pickup_history
WHERE completed_time < request_time
   OR (called_time IS NOT NULL AND called_time > completed_time)

UNION ALL

SELECT 
  'Records with proper duration calculations' as description,
  COUNT(*) as count
FROM pickup_history
WHERE pickup_duration_minutes IS NOT NULL
  AND pickup_duration_minutes >= 0;
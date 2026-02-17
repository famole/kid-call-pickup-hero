-- Fix: Clear the deleted_at for the parent record that was incorrectly soft-deleted
UPDATE public.parents 
SET deleted_at = NULL 
WHERE id = '05a1f49d-2c3b-4303-adb0-99da427968c4' 
AND auth_uid = '0c5ce5da-ffcd-4e87-9305-c3db5071db7a';
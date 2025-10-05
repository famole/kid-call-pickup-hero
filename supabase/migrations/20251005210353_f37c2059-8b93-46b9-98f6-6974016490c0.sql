-- Add indexes to speed up parent search queries
CREATE INDEX IF NOT EXISTS idx_parents_name_search ON parents USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_parents_email_search ON parents USING gin(to_tsvector('simple', email));
CREATE INDEX IF NOT EXISTS idx_parents_username_search ON parents USING gin(to_tsvector('simple', username));

-- Also add standard indexes for case-insensitive pattern matching
CREATE INDEX IF NOT EXISTS idx_parents_name_lower ON parents(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_parents_email_lower ON parents(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_parents_username_lower ON parents(LOWER(username));
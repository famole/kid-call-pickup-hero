-- Fix security warning by setting search_path
DROP FUNCTION IF EXISTS get_activities_with_coords(DATE, DATE);

CREATE OR REPLACE FUNCTION get_activities_with_coords(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  activity_date DATE,
  activity_time TIME,
  image_url TEXT,
  location_name TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  link TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.title,
    sa.description,
    sa.activity_date,
    sa.activity_time,
    sa.image_url,
    sa.location_name,
    ST_Y(sa.location_coords::geometry) as location_lat,
    ST_X(sa.location_coords::geometry) as location_lng,
    sa.link,
    sa.created_by,
    sa.created_at,
    sa.updated_at,
    sa.deleted_at
  FROM school_activities sa
  WHERE 
    sa.deleted_at IS NULL
    AND (p_start_date IS NULL OR sa.activity_date >= p_start_date)
    AND (p_end_date IS NULL OR sa.activity_date <= p_end_date)
  ORDER BY sa.activity_date ASC;
END;
$$;
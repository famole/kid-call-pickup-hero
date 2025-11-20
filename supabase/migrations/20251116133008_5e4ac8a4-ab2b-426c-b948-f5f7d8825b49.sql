-- Drop and recreate the function to respect RLS policies
DROP FUNCTION IF EXISTS public.get_activities_with_coords(date, date);

-- Recreate without SECURITY DEFINER so it respects RLS
CREATE OR REPLACE FUNCTION public.get_activities_with_coords(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  activity_date date,
  activity_time time without time zone,
  image_url text,
  location_name text,
  location_lat double precision,
  location_lng double precision,
  link text,
  created_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
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
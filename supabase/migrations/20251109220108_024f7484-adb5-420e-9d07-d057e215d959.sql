-- Enable PostGIS extension for geographic types
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add new columns to school_activities
ALTER TABLE public.school_activities
ADD COLUMN location_coords geography(Point, 4326),
ADD COLUMN location_name text,
ADD COLUMN link text;
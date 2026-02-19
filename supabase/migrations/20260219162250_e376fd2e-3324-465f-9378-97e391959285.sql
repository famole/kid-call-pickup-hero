
-- Index for pickup_authorizations filtered by authorized_parent_id (used in dashboard query)
CREATE INDEX IF NOT EXISTS idx_pickup_authorizations_authorized_parent_id 
  ON public.pickup_authorizations (authorized_parent_id);

-- Composite index for the full dashboard filter: authorized_parent_id + is_active + dates
CREATE INDEX IF NOT EXISTS idx_pickup_authorizations_auth_parent_active_dates 
  ON public.pickup_authorizations (authorized_parent_id, is_active, start_date, end_date)
  WHERE is_active = true;

-- Index for pickup_requests by parent_id (used in getActivePickupRequestsForParent)
CREATE INDEX IF NOT EXISTS idx_pickup_requests_parent_id 
  ON public.pickup_requests (parent_id);

-- Composite index for active pickup requests per parent
CREATE INDEX IF NOT EXISTS idx_pickup_requests_parent_status 
  ON public.pickup_requests (parent_id, status);

-- Index for posts filtered by deleted_at (partial) + ordered by created_at — already covered partially, add composite
CREATE INDEX IF NOT EXISTS idx_posts_deleted_created 
  ON public.posts (deleted_at, created_at DESC);

-- Index for parents auth_uid lookup (used repeatedly in get_current_parent_id RPC)
CREATE INDEX IF NOT EXISTS idx_parents_auth_uid 
  ON public.parents (auth_uid)
  WHERE auth_uid IS NOT NULL;

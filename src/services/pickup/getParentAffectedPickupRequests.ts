
import { supabase } from "@/integrations/supabase/client";
import { PickupRequest } from '@/types';

// Get all pickup requests that affect a parent's children (both own children and authorized children)
export const getParentAffectedPickupRequests = async (): Promise<PickupRequest[]> => {
  try {
    // Get the current parent's ID
    const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');

    if (parentError || !parentId) {
      console.error('Unable to determine current parent ID:', parentError);
      return [];
    }

    // Get all children this parent can see (own children + authorized children)
    const [ownChildren, authorizedChildren] = await Promise.all([
      // Own children
      supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentId),
      
      // Children they're authorized to pick up
      supabase
        .from('pickup_authorizations')
        .select('student_id')
        .eq('authorized_parent_id', parentId)
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0])
    ]);

    if (ownChildren.error || authorizedChildren.error) {
      console.error('Error fetching children:', ownChildren.error || authorizedChildren.error);
      return [];
    }

    // Combine all student IDs
    const allStudentIds = [
      ...(ownChildren.data?.map(sp => sp.student_id) || []),
      ...(authorizedChildren.data?.map(auth => auth.student_id) || [])
    ];

    // Remove duplicates
    const uniqueStudentIds = [...new Set(allStudentIds)];

    if (uniqueStudentIds.length === 0) {
      return [];
    }

    // Get all active pickup requests for these children  
    const { data: requests, error: requestsError } = await supabase
      .from('pickup_requests')
      .select('*')
      .in('student_id', uniqueStudentIds)
      .in('status', ['pending', 'called']);

    if (requestsError) {
      console.error('Error fetching pickup requests:', requestsError);
      return [];
    }

    // Get parent information for each request
    const requestsWithParents = await Promise.all(
      (requests || []).map(async (req) => {
        // Use secure operations to get parent data
        const { secureOperations } = await import('@/services/encryption');
        const { data: allParents } = await secureOperations.getParentsSecure(false);
        const parentData = allParents?.find(p => p.id === req.parent_id);

        return {
          id: req.id,
          studentId: req.student_id,
          parentId: req.parent_id,
          requestTime: new Date(req.request_time),
          status: req.status as 'pending' | 'called' | 'completed' | 'cancelled',
          requestingParent: parentData ? {
            id: parentData.id,
            name: parentData.name,
            email: parentData.email
          } : undefined
        };
      })
    );

    return requestsWithParents;
  } catch (error) {
    console.error('Error in getParentAffectedPickupRequests:', error);
    return [];
  }
};


import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getActivePickupRequestsForParent } from '@/services/pickupService';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { PickupRequest, Child } from '@/types';
import { logger } from '@/utils/logger';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const usePickupRequests = (children: ChildWithType[]) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const childrenIdsRef = useRef<string[]>([]);
  const currentParentIdRef = useRef<string | null>(null);

  useEffect(() => {
    childrenIdsRef.current = children.map(child => child.id);
  }, [children]);

  const childrenIds = children.map(c => c.id).sort().join(',');

  const { data: activeRequests = [] } = useQuery({
    queryKey: ['pickup-requests-parent', user?.id, childrenIds],
    queryFn: async (): Promise<PickupRequest[]> => {
      const parentId = await getCurrentParentIdCached();
      if (parentId) currentParentIdRef.current = parentId;

      const parentActiveRequests = await getActivePickupRequestsForParent();
      
      const ownChildIds = children.filter(child => !child.isAuthorized).map(child => child.id);
      const authorizedChildIds = children.filter(child => child.isAuthorized).map(child => child.id);
      const additionalRequests: PickupRequest[] = [];
      
      if (ownChildIds.length > 0) {
        const { data: ownChildRequests } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', ownChildIds)
          .in('status', ['pending', 'called']);
        
        if (ownChildRequests) {
          additionalRequests.push(...ownChildRequests
            .filter(req => isValidUUID(req.student_id) && isValidUUID(req.parent_id))
            .map(req => ({
              id: req.id, studentId: req.student_id, parentId: req.parent_id,
              requestTime: new Date(req.request_time), status: req.status as any
            })));
        }
      }
      
      if (authorizedChildIds.length > 0) {
        const { data: calledRequests } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', authorizedChildIds)
          .eq('status', 'called');
        
        if (calledRequests) {
          additionalRequests.push(...calledRequests
            .filter(req => isValidUUID(req.student_id) && isValidUUID(req.parent_id))
            .map(req => ({
              id: req.id, studentId: req.student_id, parentId: req.parent_id,
              requestTime: new Date(req.request_time), status: req.status as any
            })));
        }
      }
      
      const combinedRequests = [...parentActiveRequests];
      additionalRequests.forEach(req => {
        if (!combinedRequests.some(existing => existing.id === req.id)) {
          combinedRequests.push(req);
        }
      });
      
      logger.info('Pickup requests updated:', combinedRequests.length);
      return combinedRequests;
    },
    enabled: !!user && children.length > 0,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pickup_requests_parent_rq')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests' },
        (payload) => {
          const studentId = (payload.new as any)?.student_id || (payload.old as any)?.student_id;
          const parentId = (payload.new as any)?.parent_id || (payload.old as any)?.parent_id;
          const affectsOurChildren = studentId && childrenIdsRef.current.includes(studentId);
          const isOurRequest = parentId && parentId === currentParentIdRef.current;
          
          if (affectsOurChildren || isOurRequest) {
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['pickup-requests-parent'] });
            }, 200);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { 
    activeRequests, 
    refreshPickupRequests: () => queryClient.invalidateQueries({ queryKey: ['pickup-requests-parent'] })
  };
};


import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getActivePickupRequests } from '@/services/pickupService';
import { getAllParents } from '@/services/parentService';
import { PickupRequest, User } from '@/types';

export const useAdminPanelData = () => {
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [parentsCache, setParentsCache] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const requests = await getActivePickupRequests();
        setActiveRequests(requests);
        
        // Prefetch parent data for efficiency
        const parents = await getAllParents();
        const parentsMap: Record<string, User> = {};
        parents.forEach(parent => {
          // Convert Parent to User type by adding the required role property
          parentsMap[parent.id] = {
            ...parent,
            role: 'parent' // Set default role for parents
          };
        });
        setParentsCache(parentsMap);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load pickup requests",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up refresh interval
    const interval = setInterval(async () => {
      try {
        const requests = await getActivePickupRequests();
        setActiveRequests(requests);
      } catch (error) {
        console.error('Error refreshing pickup requests:', error);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [toast]);

  return {
    activeRequests,
    parentsCache,
    loading
  };
};

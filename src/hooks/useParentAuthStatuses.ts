import { useState, useEffect } from 'react';
import { getParentAuthStatuses, ParentAuthStatus } from '@/services/authStatusService';
import { useToast } from '@/components/ui/use-toast';

export const useParentAuthStatuses = () => {
  const [authStatuses, setAuthStatuses] = useState<Map<string, ParentAuthStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadAuthStatuses = async () => {
    setIsLoading(true);
    try {
      const statuses = await getParentAuthStatuses();
      const statusMap = new Map(statuses.map(status => [status.email.toLowerCase(), status]));
      setAuthStatuses(statusMap);
    } catch (error) {
      console.error('Failed to load auth statuses:', error);
      toast({
        title: "Warning",
        description: "Could not load authentication status information",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuthStatuses();
  }, []);

  return {
    authStatuses,
    isLoading,
    refetchAuthStatuses: loadAuthStatuses,
  };
};
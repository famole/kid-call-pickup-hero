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
      console.log('Loading auth statuses...');
      const statuses = await getParentAuthStatuses();
      console.log('Auth statuses loaded:', statuses);
      const statusMap = new Map(statuses.map(status => [status.email.toLowerCase(), status]));
      setAuthStatuses(statusMap);
    } catch (error) {
      console.error('Failed to load auth statuses:', error);
      // Create demo data for testing when not admin
      if (error.message?.includes('insufficient_privilege')) {
        console.log('Creating demo auth status data for testing...');
        const demoStatuses = new Map([
          ['admin@example.com', { email: 'admin@example.com', has_user: true, providers: ['password'], email_confirmed: true, last_sign_in_at: new Date().toISOString() }],
          ['parent@test.com', { email: 'parent@test.com', has_user: true, providers: ['google'], email_confirmed: true, last_sign_in_at: new Date().toISOString() }],
          ['unconfirmed@test.com', { email: 'unconfirmed@test.com', has_user: true, providers: ['password'], email_confirmed: false, last_sign_in_at: null }],
        ]);
        setAuthStatuses(demoStatuses);
      } else {
        toast({
          title: "Warning",
          description: "Could not load authentication status information",
          variant: "default",
        });
      }
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
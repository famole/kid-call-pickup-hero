
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createPickupRequest } from '@/services/pickupService';
import { useToast } from '@/components/ui/use-toast';

export const usePickupActions = (refreshPickupRequests: () => Promise<void>) => {
  const { user } = useAuth();
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const toggleChildSelection = useCallback((studentId: string) => {
    setSelectedChildren(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  }, []);

  const handleRequestPickup = useCallback(async () => {
    if (!user || !selectedChildren.length) return;

    setIsSubmitting(true);
    try {
      console.log('Creating pickup requests for:', selectedChildren);
      
      // Create pickup requests for all selected children
      const promises = selectedChildren.map(studentId =>
        createPickupRequest(studentId)
      );
      await Promise.all(promises);

      toast({
        title: "Pickup Request Sent",
        description: `Your ${selectedChildren.length > 1 ? 'children have' : 'child has'} been added to the pickup queue.`,
      });

      // Clear the selection immediately
      setSelectedChildren([]);
      
      // Refresh the active requests list with a small delay to ensure DB is updated
      setTimeout(() => {
        refreshPickupRequests();
      }, 500);
      
    } catch (error) {
      console.error('Error creating pickup requests:', error);
      toast({
        title: "Error",
        description: "Failed to create pickup requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, selectedChildren, toast, refreshPickupRequests]);

  return {
    selectedChildren,
    isSubmitting,
    toggleChildSelection,
    handleRequestPickup
  };
};

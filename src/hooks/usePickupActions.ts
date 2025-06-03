
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createPickupRequest } from '@/services/pickupService';
import { useToast } from '@/components/ui/use-toast';

export const usePickupActions = (refreshPickupRequests: () => Promise<void>) => {
  const { user } = useAuth();
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const toggleChildSelection = (studentId: string) => {
    setSelectedChildren(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleRequestPickup = async () => {
    if (!user || !selectedChildren.length) return;

    setIsSubmitting(true);
    try {
      // Create pickup requests for all selected children
      const promises = selectedChildren.map(studentId => 
        createPickupRequest(studentId, user.id)
      );
      await Promise.all(promises);

      toast({
        title: "Pickup Request Sent",
        description: `Your ${selectedChildren.length > 1 ? 'children have' : 'child has'} been added to the pickup queue.`,
      });

      // Refresh the active requests list
      await refreshPickupRequests();
      
      // Clear the selection
      setSelectedChildren([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create pickup requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedChildren,
    isSubmitting,
    toggleChildSelection,
    handleRequestPickup
  };
};

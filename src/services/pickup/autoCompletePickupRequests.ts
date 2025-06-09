
import { supabase } from "@/integrations/supabase/client";

// Function to auto-complete pickup requests that have been called for more than 5 minutes
export const autoCompleteExpiredPickupRequests = async (): Promise<void> => {
  try {
    
    // Calculate 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Find all requests that are 'called' and older than 5 minutes
    const { data: expiredRequests, error: fetchError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'called')
      .lt('request_time', fiveMinutesAgo);
    
    if (fetchError) {
      console.error('Error fetching expired pickup requests:', fetchError);
      return;
    }
    
    if (!expiredRequests || expiredRequests.length === 0) {
      return;
    }
    
    
    // Update all expired requests to 'completed'
    const { error: updateError } = await supabase
      .from('pickup_requests')
      .update({ status: 'completed' })
      .eq('status', 'called')
      .lt('request_time', fiveMinutesAgo);
    
    if (updateError) {
      console.error('Error auto-completing expired pickup requests:', updateError);
      return;
    }
    
  } catch (error) {
    console.error('Error in autoCompleteExpiredPickupRequests:', error);
  }
};

// Function to start periodic auto-completion checks
export const startAutoCompletionProcess = (): (() => void) => {
  
  // Run immediately
  autoCompleteExpiredPickupRequests();
  
  // Then run every minute
  const intervalId = setInterval(autoCompleteExpiredPickupRequests, 60 * 1000);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
};

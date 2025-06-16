
import { supabase } from "@/integrations/supabase/client";

// Function to manually trigger auto-completion (calls the database function)
export const autoCompleteExpiredPickupRequests = async (): Promise<void> => {
  try {
    console.log('Triggering manual auto-completion of expired pickup requests...');
    
    // Call the database function directly
    const { error } = await supabase.rpc('auto_complete_expired_requests');
    
    if (error) {
      console.error('Error calling auto_complete_expired_requests function:', error);
      return;
    }
    
    console.log('Manual auto-completion completed successfully');
  } catch (error) {
    console.error('Error in autoCompleteExpiredPickupRequests:', error);
  }
};

// Function to start periodic auto-completion checks (now optional since we have server-side cron)
export const startAutoCompletionProcess = (): (() => void) => {
  console.log('Server-side auto-completion is active via cron job. Client-side backup started.');
  
  // Run a backup check every 2 minutes as a fallback
  const intervalId = setInterval(autoCompleteExpiredPickupRequests, 2 * 60 * 1000);
  
  // Return cleanup function
  return () => {
    console.log('Stopping client-side auto-completion backup');
    clearInterval(intervalId);
  };
};

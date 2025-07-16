
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface UseParentDashboardRealtimeProps {
  onDataChange: () => void;
  enabled?: boolean;
}

export const useParentDashboardRealtime = ({ 
  onDataChange, 
  enabled = true 
}: UseParentDashboardRealtimeProps) => {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);

  const handleRealtimeChange = useCallback((payload: any) => {
    const now = Date.now();
    
    // Prevent excessive updates (debounce)
    if (now - lastUpdateRef.current < 500) {
      return;
    }
    
    console.log('Real-time pickup request change detected:', {
      eventType: payload.eventType,
      studentId: payload.new?.student_id || payload.old?.student_id,
      status: payload.new?.status || payload.old?.status,
      timestamp: new Date().toISOString()
    });
    
    lastUpdateRef.current = now;
    
    // Trigger refresh with a longer delay to prevent loops
    setTimeout(() => {
      console.log('Triggering parent dashboard refresh');
      onDataChange();
    }, 300);
  }, [onDataChange]);

  useEffect(() => {
    if (!user?.email || !enabled) {
      return;
    }

    // Clean up existing subscription
    if (channelRef.current) {
      console.log('Cleaning up existing real-time subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a unique channel name to avoid conflicts
    const channelName = `parent_dashboard_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    console.log('Setting up parent dashboard real-time subscription:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        handleRealtimeChange
      )
      .subscribe((status) => {
        console.log('Parent dashboard real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to pickup_requests changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to pickup_requests changes');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up parent dashboard real-time subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.email, enabled, handleRealtimeChange]);

  return {
    cleanup: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }
  };
};

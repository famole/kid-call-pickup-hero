
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentlyCalled } from '@/services/supabaseService';
import { supabase } from "@/integrations/supabase/client";
import { PickupRequestWithDetails } from '@/types/supabase';
import Logo from '@/components/Logo';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const ViewerDisplay = () => {
  const [calledChildren, setCalledChildren] = useState<PickupRequestWithDetails[]>([]);
  
  useEffect(() => {
    // Initial fetch
    const fetchCalledChildren = async () => {
      const data = await getCurrentlyCalled();
      setCalledChildren(data);
    };
    
    fetchCalledChildren();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('public:pickup_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests',
          filter: 'status=eq.called'
        },
        async (payload) => {
          console.log('Realtime update received:', payload);
          // Refetch data when there's a change
          const data = await getCurrentlyCalled();
          setCalledChildren(data);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-school-background">
      <header className="bg-school-primary text-white py-4 px-4 shadow-md">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <h1 className="text-xl sm:text-2xl font-bold">School Pickup</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm sm:text-base">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <Link to="/" className="bg-white/20 p-2 rounded-full">
              <Home className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto flex-1 py-6 px-4">
        <div className="mb-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Currently Called for Pickup</h2>
          <p className="text-base sm:text-lg text-muted-foreground">Students should come to the pickup area</p>
        </div>
        
        {calledChildren.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-500">No students currently called</h3>
            <p className="text-muted-foreground mt-2">Student names will appear here when they are called</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {calledChildren.map((item) => (
              <Card key={item.request.id} className="call-animation border-2 border-school-secondary">
                <CardContent className="flex items-center justify-between p-4 sm:p-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold">{item.child?.name}</h3>
                    <p className="text-base text-muted-foreground">{item.class?.name}</p>
                    <p className="text-sm mt-2">Teacher: {item.class?.teacher}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-school-primary">
                    {item.class?.grade.charAt(0)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <footer className="bg-gray-100 py-4 px-4 text-center">
        <div className="container mx-auto text-sm text-muted-foreground">
          School Pickup System — Please wait until your name appears on screen
        </div>
      </footer>
    </div>
  );
};

export default ViewerDisplay;

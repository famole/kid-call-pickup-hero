
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentlyCalled } from '@/services/supabaseService';
import { supabase } from "@/integrations/supabase/client";
import { PickupRequestWithDetails } from '@/types/supabase';
import Logo from '@/components/Logo';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllClasses } from '@/services/classService';
import { Class } from '@/types';

const ViewerDisplay = () => {
  const [calledChildren, setCalledChildren] = useState<PickupRequestWithDetails[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  // Fetch all classes for the filter
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classData = await getAllClasses();
        setClasses(classData);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };
    
    fetchClasses();
  }, []);
  
  useEffect(() => {
    // Initial fetch
    const fetchCalledChildren = async () => {
      try {
        const data = await getCurrentlyCalled();
        setCalledChildren(data);
        console.log("Fetched called children:", data);
      } catch (error) {
        console.error("Error fetching called children:", error);
      }
    };
    
    fetchCalledChildren();
    
    // Set up realtime subscription for pickup_requests table
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
          console.log('Realtime update received for pickup requests:', payload);
          // Refetch data when there's a change
          try {
            const data = await getCurrentlyCalled();
            setCalledChildren(data);
          } catch (error) {
            console.error("Error fetching called children after update:", error);
          }
        }
      )
      .subscribe();
    
    // Set up realtime subscription for students table
    const studentsChannel = supabase
      .channel('public:students')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        async () => {
          console.log('Student data updated');
          // Refetch data when student data changes
          try {
            const data = await getCurrentlyCalled();
            setCalledChildren(data);
          } catch (error) {
            console.error("Error fetching called children after student update:", error);
          }
        }
      )
      .subscribe();
    
    // Set up realtime subscription for classes table
    const classesChannel = supabase
      .channel('public:classes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes'
        },
        async () => {
          console.log('Class data updated');
          // Refetch class data
          try {
            const classData = await getAllClasses();
            setClasses(classData);
            
            // Refetch called children data
            const data = await getCurrentlyCalled();
            setCalledChildren(data);
          } catch (error) {
            console.error("Error updating after class changes:", error);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(classesChannel);
    };
  }, []);

  // Filter children by selected class
  const filteredChildren = useMemo(() => {
    console.log("Filtering with class:", selectedClass);
    console.log("Available children:", calledChildren);
    
    if (selectedClass === 'all') {
      return calledChildren;
    }
    
    return calledChildren.filter(item => {
      const result = item.class && item.class.id === selectedClass;
      console.log(`Child ${item.child?.name} with class ${item.class?.id} matches ${selectedClass}? ${result}`);
      return result;
    });
  }, [calledChildren, selectedClass]);

  // Group children by class
  const childrenByClass = useMemo(() => {
    const grouped: Record<string, PickupRequestWithDetails[]> = {};
    
    filteredChildren.forEach(item => {
      const classId = item.class?.id || 'unknown';
      
      if (!grouped[classId]) {
        grouped[classId] = [];
      }
      
      grouped[classId].push(item);
    });
    
    console.log("Grouped children by class:", grouped);
    return grouped;
  }, [filteredChildren]);

  const handleClassChange = (value: string) => {
    console.log("Selected class changed to:", value);
    setSelectedClass(value);
  };

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
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Currently Called for Pickup</h2>
              <p className="text-base sm:text-lg text-muted-foreground">Students should come to the pickup area</p>
            </div>
            <div className="w-[200px]">
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {Object.keys(childrenByClass).length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-500">No students currently called</h3>
            <p className="text-muted-foreground mt-2">Student names will appear here when they are called</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(childrenByClass).map(([classId, students]) => {
              const className = students[0]?.class?.name || 'Unknown Class';
              const grade = students[0]?.class?.grade || '';
              
              return (
                <div key={classId} className="border rounded-lg p-4">
                  <h3 className="text-xl font-bold mb-4 text-school-primary border-b pb-2">
                    {className} {grade && `(${grade})`}
                  </h3>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Called At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((item) => (
                        <TableRow key={item.request.id} className="call-animation">
                          <TableCell className="font-medium">{item.child?.name}</TableCell>
                          <TableCell>{item.class?.teacher}</TableCell>
                          <TableCell>{new Date(item.request.requestTime).toLocaleTimeString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-8">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">View Information</h3>
              <p className="text-sm text-muted-foreground">
                This screen shows students who have been called for pickup, grouped by class. 
                The display updates automatically in real-time whenever students are called or picked up.
              </p>
            </CardContent>
          </Card>
        </div>
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

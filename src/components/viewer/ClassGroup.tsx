
import React, { useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PickupRequestWithDetails } from '@/types/supabase';
import './styles.css';

interface ClassGroupProps {
  classId: string;
  students: PickupRequestWithDetails[];
}

const ClassGroup: React.FC<ClassGroupProps> = ({ classId, students }) => {
  const prevStudentCountRef = useRef(0);
  
  useEffect(() => {
    prevStudentCountRef.current = students.length;
  }, [students]);
  
  if (!students || students.length === 0) return null;
  
  // Use the class data from the first student
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
              <TableCell className="font-medium">{item.child?.name || 'Unknown Student'}</TableCell>
              <TableCell>{item.class?.teacher || 'Unknown Teacher'}</TableCell>
              <TableCell>{new Date(item.request.requestTime).toLocaleTimeString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClassGroup;


import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash, Eye } from "lucide-react";
import { Child } from '@/types';
import { supabase } from "@/integrations/supabase/client";

interface StudentTableProps {
  studentList: Child[];
  isLoading: boolean;
  getClassName: (classId: string) => string;
  onEdit: (student: Child) => void;
  onDelete: (student: Child) => void;
  onViewDetails?: (student: Child) => void;
}

const StudentTable = ({ 
  studentList, 
  isLoading, 
  getClassName, 
  onEdit, 
  onDelete,
  onViewDetails
}: StudentTableProps) => {
  const [studentParentData, setStudentParentData] = useState<Record<string, { parentNames: string[], relationshipCount: number }>>({});
  
  // Fetch parent information for all students
  useEffect(() => {
    const fetchStudentParents = async () => {
      if (studentList.length === 0) return;
      
      try {
        // Get all student IDs
        const studentIds = studentList.map(student => student.id);
        
        // Fetch student-parent relationships with parent names
        const { data: relationships, error } = await supabase
          .from('student_parents')
          .select(`
            student_id,
            parent_id,
            relationship,
            is_primary,
            parents!inner(name)
          `)
          .in('student_id', studentIds);
        
        if (error) {
          console.error('Error fetching student-parent relationships:', error);
          return;
        }
        
        // Group by student ID and create parent info
        const parentDataMap = relationships.reduce((acc, rel) => {
          const studentId = rel.student_id;
          if (!acc[studentId]) {
            acc[studentId] = { parentNames: [], relationshipCount: 0 };
          }
          
          // Add parent name with relationship info
          const parentInfo = rel.parents?.name || 'Unknown Parent';
          const relationshipInfo = rel.relationship ? ` (${rel.relationship})` : '';
          const primaryInfo = rel.is_primary ? ' *' : '';
          
          acc[studentId].parentNames.push(`${parentInfo}${relationshipInfo}${primaryInfo}`);
          acc[studentId].relationshipCount++;
          
          return acc;
        }, {} as Record<string, { parentNames: string[], relationshipCount: number }>);
        
        setStudentParentData(parentDataMap);
      } catch (error) {
        console.error('Error in fetchStudentParents:', error);
      }
    };
    
    fetchStudentParents();
  }, [studentList]);
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Class</TableHead>
          <TableHead className="hidden md:table-cell">Parents</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">
              Loading students...
            </TableCell>
          </TableRow>
        ) : studentList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
              No students found
            </TableCell>
          </TableRow>
        ) : (
          studentList.map((student) => {
            const parentData = studentParentData[student.id];
            const parentDisplay = parentData?.parentNames.length > 0 
              ? parentData.parentNames.join(', ')
              : 'No parents assigned';
            
            return (
              <TableRow key={student.id}>
                <TableCell>{student.name}</TableCell>
                <TableCell>{getClassName(student.classId)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <span title={parentDisplay}>
                    {parentDisplay.length > 50 
                      ? `${parentDisplay.substring(0, 47)}...` 
                      : parentDisplay}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {onViewDetails && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onViewDetails(student)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onEdit(student)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => onDelete(student)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

export default StudentTable;

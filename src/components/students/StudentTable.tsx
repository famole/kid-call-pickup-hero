
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { Child } from '@/types';
import { parents } from '@/services/mockData';

interface StudentTableProps {
  studentList: Child[];
  isLoading: boolean;
  getClassName: (classId: string) => string;
  onEdit: (student: Child) => void;
  onDelete: (student: Child) => void;
}

const StudentTable = ({ 
  studentList, 
  isLoading, 
  getClassName, 
  onEdit, 
  onDelete 
}: StudentTableProps) => {
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
          studentList.map((student) => (
            <TableRow key={student.id}>
              <TableCell>{student.name}</TableCell>
              <TableCell>{getClassName(student.classId)}</TableCell>
              <TableCell className="hidden md:table-cell">
                {student.parentIds.length > 0 
                  ? student.parentIds.map(id => {
                      const parent = parents.find(p => p.id === id);
                      return parent ? parent.name : 'Unknown';
                    }).join(', ')
                  : 'No parents assigned'}
              </TableCell>
              <TableCell className="text-right space-x-2">
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
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default StudentTable;

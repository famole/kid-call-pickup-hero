
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParentWithStudents } from '@/types/parent';
import ParentTableRow from './ParentTableRow';

interface ParentsTableProps {
  parents: ParentWithStudents[];
  isLoading: boolean;
  searchTerm: string;
  onEditParent: (parent: ParentWithStudents) => void;
  onDeleteParent: (parentId: string) => void;
  onManageStudents: (parent: ParentWithStudents) => void;
}

const ParentsTable: React.FC<ParentsTableProps> = ({
  parents,
  isLoading,
  searchTerm,
  onEditParent,
  onDeleteParent,
  onManageStudents,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Students</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center">Loading parents...</TableCell>
          </TableRow>
        ) : parents.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              {searchTerm ? `No parents found matching "${searchTerm}".` : "No parents found. Add one to get started."}
            </TableCell>
          </TableRow>
        ) : (
          parents.map((parent) => (
            <ParentTableRow
              key={parent.id}
              parent={parent}
              onEdit={() => onEditParent(parent)}
              onDelete={onDeleteParent}
              onManageStudents={() => onManageStudents(parent)}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default ParentsTable;

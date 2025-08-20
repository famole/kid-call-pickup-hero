
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Pencil, Trash } from "lucide-react";
import { Class } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface ClassListTableProps {
  classList: Class[];
  loading: boolean;
  onEditClass: (classItem: Class) => void;
  onDeletePrompt: (classItem: Class) => void;
}

const ClassListTable: React.FC<ClassListTableProps> = ({
  classList,
  loading,
  onEditClass,
  onDeletePrompt
}) => {
  const { t } = useTranslation();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-school-primary"></div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">{t('classes.name')}</TableHead>
          <TableHead className="text-center">{t('classes.grade')}</TableHead>
          <TableHead className="text-center">{t('classes.teacher')}</TableHead>
          <TableHead className="text-center">{t('classes.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {classList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
              {t('classes.noClassesFound')}
            </TableCell>
          </TableRow>
        ) : (
          classList.map((classItem) => (
            <TableRow key={classItem.id}>
              <TableCell>{classItem.name}</TableCell>
              <TableCell>{classItem.grade}</TableCell>
              <TableCell>{classItem.teacher}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEditClass(classItem)}
                  title={t('classes.edit')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => onDeletePrompt(classItem)}
                  title={t('classes.delete')}
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

export default ClassListTable;

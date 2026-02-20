
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { School, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ClassListTable from '@/components/admin-classes/ClassListTable';
import ClassFormDialog from '@/components/admin-classes/ClassFormDialog';
import DeleteClassDialog from '@/components/admin-classes/DeleteClassDialog';
import TableSkeleton from '@/components/ui/skeletons/TableSkeleton';
import { useClassManagement } from '@/hooks/useClassManagement';
import { useTranslation } from '@/hooks/useTranslation';
import { useIsMobile } from '@/hooks/use-mobile';

const AdminClassesScreen = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    classList,
    loading,
    currentClass,
    classFormData,
    setClassFormData,
    handleAddClass,
    handleUpdateClass,
    handleDeleteClass,
    prepareEditClass,
    prepareDeleteClass,
    resetForm
  } = useClassManagement();

  const handleAddDialogSave = async () => {
    const success = await handleAddClass();
    if (success) {
      setIsAddDialogOpen(false);
    }
  };

  const handleEditDialogSave = async () => {
    const success = await handleUpdateClass();
    if (success) {
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const success = await handleDeleteClass();
    if (success) {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditClass = (classItem: any) => {
    prepareEditClass(classItem);
    setIsEditDialogOpen(true);
  };

  const handleDeletePrompt = (classItem: any) => {
    prepareDeleteClass(classItem);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    resetForm();
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    resetForm();
  };

  return (
    <div className="w-full">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2 sm:gap-3 text-left min-w-0">
                <School className="h-6 w-6 sm:h-8 sm:w-8 text-school-primary flex-shrink-0" />
                <h1 className="text-lg sm:text-3xl font-bold text-left truncate">{t('classes.title')}</h1>
              </div>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {isMobile ? (
                      <Button 
                        onClick={() => setIsAddDialogOpen(true)} 
                        size="icon"
                        className="h-8 w-8 bg-school-primary flex-shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setIsAddDialogOpen(true)} 
                        size="sm"
                        className="bg-school-primary"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('classes.addClass')}
                      </Button>
                    )}
                  </TooltipTrigger>
                  {isMobile && <TooltipContent>{t('classes.addClass')}</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} columns={4} />
            ) : (
              <ClassListTable
                classList={classList}
                loading={false}
                onEditClass={handleEditClass}
                onDeletePrompt={handleDeletePrompt}
              />
            )}
          </CardContent>
        </Card>

        <ClassFormDialog
          isOpen={isAddDialogOpen}
          isEditMode={false}
          classData={classFormData}
          onClose={handleCloseAddDialog}
          onSave={handleAddDialogSave}
          onClassDataChange={setClassFormData}
        />

        <ClassFormDialog
          isOpen={isEditDialogOpen}
          isEditMode={true}
          classData={classFormData}
          onClose={handleCloseEditDialog}
          onSave={handleEditDialogSave}
          onClassDataChange={setClassFormData}
        />

        <DeleteClassDialog
          isOpen={isDeleteDialogOpen}
          classToDelete={currentClass}
          onClose={handleCloseDeleteDialog}
          onConfirmDelete={handleDeleteConfirm}
        />
      </div>
    </div>
  );
};

export default AdminClassesScreen;

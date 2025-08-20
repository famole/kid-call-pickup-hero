
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { School, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ClassListTable from '@/components/admin-classes/ClassListTable';
import ClassFormDialog from '@/components/admin-classes/ClassFormDialog';
import DeleteClassDialog from '@/components/admin-classes/DeleteClassDialog';
import TableSkeleton from '@/components/ui/skeletons/TableSkeleton';
import { useClassManagement } from '@/hooks/useClassManagement';
import { useTranslation } from '@/hooks/useTranslation';

const AdminClassesScreen = () => {
  const { t } = useTranslation();
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
            <div className="flex flex-col sm:flex-row sm:items-start justify-start gap-4 mb-6">
              <div className="flex items-center gap-3 text-left">
                <School className="h-8 w-8 text-school-primary" />
                <h1 className="text-3xl font-bold text-left">{t('classes.title')}</h1>
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button 
                  onClick={() => setIsAddDialogOpen(true)} 
                  className="bg-school-primary flex-1 sm:flex-none"
                >
                  <Plus className="mr-2 h-4 w-4" /> {t('classes.addClass')}
                </Button>
              </div>
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


import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Child, Class } from '@/types';
import { 
  getAllClasses 
} from '@/services/classService'; 
import CSVUploadModal from '@/components/CSVUploadModal';
import StudentTable from '@/components/students/StudentTable';
import GraduateStudentsDialog from '@/components/students/GraduateStudentsDialog';
import StudentSearch from '@/components/students/StudentSearch';
import AddStudentDialog from '@/components/students/AddStudentDialog';
import EditStudentDialog from '@/components/students/EditStudentDialog';
import DeleteStudentDialog from '@/components/students/DeleteStudentDialog';
import StudentDetailsDialog from '@/components/students/StudentDetailsDialog';
import ExportStudentsDialog from '@/components/students/ExportStudentsDialog';
import WithdrawStudentsDialog from '@/components/students/WithdrawStudentsDialog';
import ReassignStudentsDialog from '@/components/students/ReassignStudentsDialog';
import StudentsHeader from '@/components/students/StudentsHeader';
import TableSkeleton from '@/components/ui/skeletons/TableSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { isValidUUID } from '@/utils/validators';
import { useStudentForm, NewStudentState } from '@/hooks/useStudentForm';
import { useStudentActions } from '@/hooks/useStudentActions';
import { useStudentCSV } from '@/hooks/useStudentCSV';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { useAdminPagination } from '@/hooks/useAdminPagination';
import PaginationControls from '@/components/admin-parents/PaginationControls';
import { logger } from '@/utils/logger';
import { graduateStudentsByIds } from '@/services/student/graduateStudents';
import { withdrawStudentsByIds } from '@/services/student/withdrawStudents';
import { useTranslation } from '@/hooks/useTranslation';

const AdminStudentsScreen = () => {
  const [studentList, setStudentList] = useState<Child[]>([]);
  const [classList, setClassList] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isGraduateDialogOpen, setIsGraduateDialogOpen] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const { t } = useTranslation();
  const { newStudent, setNewStudent, resetNewStudent } = useStudentForm();

  // Use the search hook
  const {
    searchTerm,
    setSearchTerm,
    selectedClassId,
    setSelectedClassId,
    statusFilter,
    setStatusFilter,
    filteredStudents
  } = useStudentSearch(studentList);

  // Use pagination hook
  const {
    paginatedData: paginatedStudents,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    startIndex,
    endIndex,
    goToPage,
    changePageSize,
    hasNextPage,
    hasPreviousPage,
  } = useAdminPagination({ data: filteredStudents });

  const { 
    handleAddStudentAction, 
    handleUpdateStudentAction, 
    handleDeleteStudentAction 
  } = useStudentActions({
    studentList,
    setStudentList,
    classList,
    setIsLoading,
    resetStudentForm: resetNewStudent,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setIsDeleteDialogOpen,
    setCurrentStudent,
  });

  const { 
    handleCSVImportAction, 
    handleExportCSVAction 
  } = useStudentCSV({
    setStudentList,
    setIsLoading,
    setIsCSVModalOpen,
  });

  // Load students and classes
  const reloadData = async () => {
    try {
      setIsLoading(true);
      const { getAllStudents: fetchAllStudents } = await import('@/services/studentService');
      const studentsPromise = fetchAllStudents();
      const classesPromise = getAllClasses();
      const [students, fetchedClasses] = await Promise.all([studentsPromise, classesPromise]);
      setStudentList(students);
      setClassList(fetchedClasses);
      if (fetchedClasses.length === 0) {
        toast({
          title: "No Classes Found",
          description: "No classes were loaded. Please ensure classes exist.",
          variant: "default"
        });
      }
    } catch (error) {
      logger.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load student or class data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, [toast]);

  const handleEditStudent = (student: Child) => {
    setCurrentStudent(student);
    const validParentIds = student.parentIds?.filter(isValidUUID) || [];
    
    setNewStudent({
      name: student.name,
      classId: student.classId,
      parentIds: validParentIds,
      avatar: student.avatar
    });
    setIsEditDialogOpen(true);
  };

  const handleDeletePrompt = (student: Child) => {
    setCurrentStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const handleViewDetails = (student: Child) => {
    setCurrentStudent(student);
    setIsDetailsDialogOpen(true);
  };
  
  // Wrapper functions to call hook actions
  const onAddStudent = () => handleAddStudentAction(newStudent);
  const onUpdateStudent = () => {
    if (currentStudent) {
      handleUpdateStudentAction(currentStudent.id, newStudent);
    }
  };
  const onDeleteStudent = () => handleDeleteStudentAction(currentStudent);
  const onImportCSV = (data: Partial<Child>[]) => handleCSVImportAction(data);
  const onExportCSV = async (classId: string | null) => {
    setIsExporting(true);
    await handleExportCSVAction(studentList, classId);
    setIsExporting(false);
    setIsExportDialogOpen(false);
  };

  const handleGraduateStudents = async (studentIds: string[], graduationYear: number) => {
    try {
      setIsLoading(true);
      const count = await graduateStudentsByIds(studentIds, graduationYear);
      toast({
        title: t('admin.graduateSuccess'),
        description: t('admin.graduatedCount', { count }),
      });
      await reloadData();
    } catch (error) {
      logger.error('Error graduating students:', error);
      toast({
        title: "Error",
        description: "Failed to graduate students",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawStudents = async (studentIds: string[]) => {
    try {
      setIsLoading(true);
      const count = await withdrawStudentsByIds(studentIds);
      toast({
        title: t('admin.withdrawSuccess'),
        description: t('admin.withdrawnCount', { count }),
      });
      await reloadData();
    } catch (error) {
      logger.error('Error withdrawing students:', error);
      toast({
        title: "Error",
        description: "Failed to withdraw students",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getClassName = (classId: string) => {
    const classInfo = classList.find(c => c.id === classId);
    return classInfo ? classInfo.name : 'Unknown Class';
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <StudentsHeader 
            onExportCSV={() => setIsExportDialogOpen(true)}
            onImportCSV={() => setIsCSVModalOpen(true)}
            onAddStudent={() => {
              resetNewStudent();
              setIsAddDialogOpen(true);
            }}
            onFullImportCompleted={reloadData}
            onGraduateStudents={() => setIsGraduateDialogOpen(true)}
            onReassignStudents={() => setIsReassignDialogOpen(true)}
            onWithdrawStudents={() => setIsWithdrawDialogOpen(true)}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-48" />
              </div>
              <TableSkeleton rows={8} columns={5} />
            </div>
          ) : (
            <>
              <StudentSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedClassId={selectedClassId}
                onClassFilterChange={setSelectedClassId}
                classList={classList}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
              
              <StudentTable 
                studentList={paginatedStudents}
                isLoading={false}
                getClassName={getClassName}
                onEdit={handleEditStudent}
                onDelete={handleDeletePrompt}
                onViewDetails={handleViewDetails}
                totalItems={totalItems}
              />

              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={goToPage}
                onPageSizeChange={changePageSize}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                itemType="students"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <AddStudentDialog 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        classList={classList}
        newStudent={newStudent as NewStudentState}
        setNewStudent={setNewStudent as React.Dispatch<React.SetStateAction<NewStudentState>>}
        onSave={onAddStudent}
        isLoading={isLoading && isAddDialogOpen}
      />

      {/* Edit Student Dialog */}
      <EditStudentDialog 
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        classList={classList}
        student={newStudent as NewStudentState}
        setStudent={setNewStudent as React.Dispatch<React.SetStateAction<NewStudentState>>}
        onUpdate={onUpdateStudent}
        isLoading={isLoading && isEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteStudentDialog 
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        student={currentStudent}
        onDelete={onDeleteStudent}
        isLoading={isLoading && isDeleteDialogOpen}
      />

      {/* Student Details Dialog */}
      <StudentDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        student={currentStudent}
        getClassName={getClassName}
        classList={classList}
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={onImportCSV}
        classList={classList}
      />

      {/* Export Students Dialog */}
      <ExportStudentsDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        classList={classList}
        onExport={onExportCSV}
        isExporting={isExporting}
      />

      {/* Graduate Students Dialog */}
      <GraduateStudentsDialog
        open={isGraduateDialogOpen}
        onOpenChange={setIsGraduateDialogOpen}
        classList={classList}
        studentList={studentList}
        onGraduate={handleGraduateStudents}
        isLoading={isLoading}
      />

      {/* Reassign Students Dialog */}
      <ReassignStudentsDialog
        open={isReassignDialogOpen}
        onOpenChange={setIsReassignDialogOpen}
        classList={classList}
        studentList={studentList}
        onCompleted={reloadData}
      />

      {/* Withdraw Students Dialog */}
      <WithdrawStudentsDialog
        open={isWithdrawDialogOpen}
        onOpenChange={setIsWithdrawDialogOpen}
        classList={classList}
        studentList={studentList}
        onWithdraw={handleWithdrawStudents}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminStudentsScreen;

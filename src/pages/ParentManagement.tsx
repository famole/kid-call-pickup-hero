
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
// Dialog related imports are now in child components
import { 
  Search,
  Link as LinkIcon
} from "lucide-react";
import { getParentsWithStudents, addStudentToParent } from '@/services/parentService';
import { getAllStudents as fetchAllStudentsService } from '@/services/studentService'; // Renamed to avoid conflict
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';

// Import new components
import ViewParentDetailsDialog from '@/components/parent-management/ViewParentDetailsDialog';
import AssignStudentDialog from '@/components/parent-management/AssignStudentDialog';

const ParentManagement: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [parents, setParents] = useState<ParentWithStudents[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<ParentWithStudents | null>(null);
  const [isStudentAssignDialogOpen, setIsStudentAssignDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const parentsData = await getParentsWithStudents();
        setParents(parentsData);
        
        const allStudentsData = await fetchAllStudentsService();
        
        const assignedStudentIds = new Set<string>();
        parentsData.forEach(parent => {
          parent.students?.forEach(student => {
            assignedStudentIds.add(student.id);
          });
        });
        
        const unassignedStuds = allStudentsData.filter(student => !assignedStudentIds.has(student.id));
        setUnassignedStudents(unassignedStuds);
      } catch (error) {
        logger.error("Error loading data:", error);
        toast({
          title: t('common.error'),
          description: "Failed to load parent and student data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [toast, t]);
  
  const filteredParents = parents.filter(parent => 
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (parent.email && parent.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (parent.username && parent.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const handleAssignStudent = async (parentId: string, studentId: string) => {
    try {
      const student = unassignedStudents.find(s => s.id === studentId);
      if (!student) {
        toast({ title: t('common.error'), description: "Student not found.", variant: "destructive" });
        return;
      }
      
      const newRelationship = await addStudentToParent(parentId, studentId, undefined, true);
      
      setParents(prevParents => 
        prevParents.map(p => {
          if (p.id === parentId) {
            return {
              ...p,
              students: [
                ...(p.students || []),
                { 
                  id: student.id, 
                  name: student.name, 
                  isPrimary: newRelationship.isPrimary, 
                  relationship: newRelationship.relationship, 
                  parentRelationshipId: newRelationship.id 
                }
              ]
            };
          }
          return p;
        })
      );
      
      setUnassignedStudents(prev => prev.filter(s => s.id !== studentId));
      
      toast({
        title: t('common.success'),
        description: "Student assigned to parent successfully",
      });
      
      setIsStudentAssignDialogOpen(false);
      setSelectedParent(null); // Clear selected parent after assignment
    } catch (error) {
      logger.error("Error assigning student:", error);
      toast({
        title: t('common.error'),
        description: "Failed to assign student to parent",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('parentManagement.title')}</CardTitle>
          <CardDescription>
            {t('parentManagement.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                placeholder={t('parentManagement.searchPlaceholder')}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">{t('parentManagement.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('parentManagement.tableHeaders.name')}</TableHead>
                  <TableHead>{t('parentManagement.tableHeaders.email')}</TableHead>
                  <TableHead>{t('parentManagement.tableHeaders.phone')}</TableHead>
                  <TableHead>{t('parentManagement.tableHeaders.students')}</TableHead>
                  <TableHead>{t('parentManagement.tableHeaders.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchTerm ? t('parentManagement.noParentsSearch') : t('parentManagement.noParentsRegistered')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParents.map(parent => (
                    <TableRow key={parent.id}>
                      <TableCell>{parent.name}</TableCell>
                      <TableCell>{parent.email}</TableCell>
                      <TableCell>{parent.phone || "-"}</TableCell>
                      <TableCell>
                        {parent.students && parent.students.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {parent.students.slice(0, 2).map(student => (
                              <span 
                                key={student.id} 
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded dark:bg-blue-800 dark:text-blue-100"
                              >
                                {student.name}
                              </span>
                            ))}
                            {parent.students.length > 2 && (
                              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded dark:bg-gray-700 dark:text-gray-200">
                                +{parent.students.length - 2} {t('parentManagement.more')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">{t('parentManagement.noStudentsAssigned')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedParent(parent);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            {t('parentManagement.viewButton')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedParent(parent);
                              setIsStudentAssignDialogOpen(true);
                            }}
                            disabled={unassignedStudents.length === 0 && !parent.students?.length} // Disable if no students to assign and no students already assigned (edge case, usually unassignedStudents check is enough)
                          >
                            <LinkIcon className="h-4 w-4" />
                            {t('parentManagement.assignStudentButton')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <ViewParentDetailsDialog
        isOpen={isViewDialogOpen}
        onOpenChange={(isOpen) => {
          setIsViewDialogOpen(isOpen);
          if (!isOpen) setSelectedParent(null);
        }}
        selectedParent={selectedParent}
      />
      
      <AssignStudentDialog
        isOpen={isStudentAssignDialogOpen}
        onOpenChange={(isOpen) => {
          setIsStudentAssignDialogOpen(isOpen);
          if (!isOpen) setSelectedParent(null);
        }}
        selectedParent={selectedParent}
        unassignedStudents={unassignedStudents}
        onAssignStudent={handleAssignStudent}
      />
    </div>
  );
};

export default ParentManagement;

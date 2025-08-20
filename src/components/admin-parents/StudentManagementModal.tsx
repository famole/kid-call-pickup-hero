
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, StarOff, Trash2, UserPlus, Search } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';
import { Child, Class } from '@/types';
import { logger } from '@/utils/logger';
import { useTranslation } from '@/hooks/useTranslation';

interface StudentManagementModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  parent: ParentWithStudents | null;
  allStudents: Child[];
  classes: Class[];
  onAddStudent: (parentId: string, studentId: string, relationship: string, isPrimary: boolean) => Promise<void>;
  onRemoveStudent: (studentRelationshipId: string, parentId: string, studentId: string) => void;
  onTogglePrimary: (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => void;
}

const StudentManagementModal: React.FC<StudentManagementModalProps> = ({
  isOpen,
  onOpenChange,
  parent,
  allStudents,
  classes,
  onAddStudent,
  onRemoveStudent,
  onTogglePrimary,
}) => {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  const studentId = React.useId();
  const relationshipId = React.useId();
  const primaryId = React.useId();

  // Debug effect to log student data structure
  useEffect(() => {
    if (parent?.students && parent.students.length > 0) {
      logger.log('Student data structure:', parent.students[0]);
      logger.log('parentRelationshipId:', parent.students[0].parentRelationshipId);
    }
  }, [parent]);

  // Filter available students with search and class filter
  const availableStudents = useMemo(() => {
    if (!parent) return allStudents;
    
    // Get students not already assigned to this parent
    let filtered = allStudents.filter(s => !parent.students?.find(ps => ps.id === s.id));
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply class filter
    if (selectedClassFilter !== 'all') {
      filtered = filtered.filter(student => student.classId === selectedClassFilter);
    }
    
    return filtered;
  }, [parent, allStudents, searchTerm, selectedClassFilter]);

  const handleAddStudent = async () => {
    if (!parent || !selectedStudentId) return;
    
    await onAddStudent(parent.id, selectedStudentId, relationship, isPrimary);
    setShowAddForm(false);
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
  };

  const handleClose = () => {
    setShowAddForm(false);
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
    setSearchTerm('');
    setSelectedClassFilter('all');
    onOpenChange(false);
  };

  if (!parent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('studentManagement.title', { parentName: parent.name })}</DialogTitle>
          <DialogDescription>
            {t('studentManagement.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Students */}
          <div>
            <h3 className="font-medium mb-3">
              {t('studentManagement.currentStudents', { count: parent.students?.length || 0 })}
            </h3>
            {parent.students && parent.students.length > 0 ? (
              <div className="space-y-2">
                {parent.students.map(student => (
                  <div key={student.parentRelationshipId || student.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    <div className="flex items-center">
                      {student.isPrimary ? <Star className="h-4 w-4 text-yellow-500 mr-2" /> : null}
                      <div>
                        <span className="font-medium">{student.name}</span>
                        {student.relationship && (
                          <span className="text-sm text-gray-500 ml-2">({student.relationship})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={student.isPrimary ? t('studentManagement.unsetPrimary') : t('studentManagement.setPrimary')}
                        disabled={!student.parentRelationshipId}
                        onClick={() => {
                          if (student.parentRelationshipId) {
                            onTogglePrimary(student.parentRelationshipId, parent.id, student.isPrimary, student.relationship);
                          }
                        }}
                      >
                        {student.isPrimary ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t('studentManagement.removeStudent')}
                        disabled={!student.parentRelationshipId}
                        onClick={() => {
                          if (student.parentRelationshipId) {
                            onRemoveStudent(student.parentRelationshipId, parent.id, student.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('studentManagement.noStudentsAssociated')}</p>
            )}
          </div>

          {/* Add Student Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">{t('studentManagement.addStudent')}</h3>
              {!showAddForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  disabled={availableStudents.length === 0}
                >
                  <UserPlus className="h-4 w-4 mr-1" /> {t('studentManagement.addStudent')}
                </Button>
              )}
            </div>

            {showAddForm ? (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                {/* Search and Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('studentManagement.searchStudents')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder={t('studentManagement.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('studentManagement.filterByClass')}</Label>
                    <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('studentManagement.filterByClass')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('studentManagement.allClasses')}</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} - {cls.grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={studentId}>
                    {t('studentManagement.studentsAvailable', { 
                      count: availableStudents.length,
                      defaultValue: `Student (${availableStudents.length} available)`
                    })}
                  </Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('studentManagement.selectStudent')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.length === 0 ? (
                        <SelectItem value="" disabled>{t('studentManagement.noStudentsMatch')}</SelectItem>
                      ) : (
                        availableStudents.map(student => {
                          const studentClass = classes.find(c => c.id === student.classId);
                          return (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} {studentClass && `(${studentClass.name})`}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={relationshipId}>{t('studentManagement.relationship')}</Label>
                  <Input
                    id={relationshipId}
                    placeholder={t('studentManagement.relationshipPlaceholder')}
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={primaryId}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                  />
                  <Label htmlFor={primaryId}>{t('studentManagement.primaryParent')}</Label>
                </div>
                
                <div className="flex space-x-2 pt-2">
                  <Button onClick={handleAddStudent} disabled={!selectedStudentId}>
                    {t('studentManagement.addStudentButton')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    {t('studentManagement.cancel')}
                  </Button>
                </div>
              </div>
            ) : availableStudents.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('studentManagement.noAvailableStudents')}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('studentManagement.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentManagementModal;

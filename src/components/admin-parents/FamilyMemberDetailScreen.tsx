import React, { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, StarOff, Trash2, UserPlus, Search, Calendar, Users, ShieldCheck } from "lucide-react";
import { ParentWithStudents } from '@/types/parent';
import { Child, Class } from '@/types';
import { logger } from '@/utils/logger';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { 
  getPickupAuthorizationsForParent,
  getPickupAuthorizationsForAuthorizedParent,
  deletePickupAuthorization,
  createPickupAuthorization,
  type PickupAuthorizationWithDetails
} from '@/services/pickupAuthorizationService';
import { useToast } from '@/hooks/use-toast';
import { Separator } from "@/components/ui/separator";

interface FamilyMemberDetailScreenProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  parent: ParentWithStudents | null;
  allStudents: Child[];
  allParents: ParentWithStudents[];
  classes: Class[];
  onAddStudent: (parentId: string, studentId: string, relationship: string, isPrimary: boolean) => Promise<void>;
  onRemoveStudent: (studentRelationshipId: string, parentId: string, studentId: string) => void;
  onTogglePrimary: (studentRelationshipId: string, parentId: string, currentIsPrimary: boolean, currentRelationship?: string) => void;
}

const FamilyMemberDetailScreen: React.FC<FamilyMemberDetailScreenProps> = ({
  isOpen,
  onOpenChange,
  parent,
  allStudents,
  allParents,
  classes,
  onAddStudent,
  onRemoveStudent,
  onTogglePrimary,
}) => {
  const { t, getCurrentLanguage } = useTranslation();
  const { toast } = useToast();
  
  // State for assigned students management
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  // State for pickup authorizations management
  const [authorizations, setAuthorizations] = useState<PickupAuthorizationWithDetails[]>([]);
  const [receivedAuthorizations, setReceivedAuthorizations] = useState<PickupAuthorizationWithDetails[]>([]);
  const [showAddAuthorizationForm, setShowAddAuthorizationForm] = useState(false);
  const [selectedAuthStudentId, setSelectedAuthStudentId] = useState('');
  const [selectedAuthorizingParentId, setSelectedAuthorizingParentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loadingAuthorizations, setLoadingAuthorizations] = useState(false);

  // Reset authorizing parent when student selection changes
  useEffect(() => {
    setSelectedAuthorizingParentId('');
  }, [selectedAuthStudentId]);

  // Load pickup authorizations when parent changes
  useEffect(() => {
    if (parent && isOpen) {
      loadAuthorizations();
    }
  }, [parent, isOpen]);

  const loadAuthorizations = async () => {
    if (!parent) return;
    
    setLoadingAuthorizations(true);
    try {
      // For admin functionality, we need to get the admin's parentId
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) {
        logger.error('Error getting current parent ID');
        toast({
          title: t('familyMemberDetails.error'),
          description: 'Failed to authenticate admin',
          variant: "destructive",
        });
        return;
      }
      
      // Get authorizations this parent has created (where they are the authorizing parent)
      const parentAuthorizations = await getPickupAuthorizationsForParent(parent.id);
      // Get authorizations where this parent is authorized (pass admin ID first, then target parent ID)
      const receivedAuths = await getPickupAuthorizationsForAuthorizedParent(currentParentId, parent.id);
      
      setAuthorizations(parentAuthorizations);
      setReceivedAuthorizations(receivedAuths);
    } catch (error) {
      logger.error('Error loading authorizations:', error);
      toast({
        title: t('familyMemberDetails.error'),
        description: t('familyMemberDetails.failedToLoadAuth'),
        variant: "destructive",
      });
    } finally {
      setLoadingAuthorizations(false);
    }
  };

  // Filter available students for assignment
  const availableStudents = useMemo(() => {
    if (!parent) return allStudents;
    
    let filtered = allStudents.filter(s => !parent.students?.find(ps => ps.id === s.id));
    
    if (studentSearchTerm.trim()) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }
    
    if (selectedClassFilter !== 'all') {
      filtered = filtered.filter(student => student.classId === selectedClassFilter);
    }
    
    return filtered;
  }, [parent, allStudents, studentSearchTerm, selectedClassFilter]);

  // Filter available students for authorization - show all students
  const availableAuthStudents = useMemo(() => {
    if (!parent) return [];
    
    // Show all students so admin can create authorizations from any student's parent
    return allStudents.filter(student => !student.deletedAt);
  }, [parent, allStudents]);

  // Filter available authorizing parents based on selected student
  const availableAuthorizingParents = useMemo(() => {
    if (!selectedAuthStudentId) return allParents.filter(p => p.id !== parent?.id);

    // Find the selected student
    const selectedStudent = allStudents.find(s => s.id === selectedAuthStudentId);

    // If student has parents data (from getStudentsWithParents), use it directly
    if (selectedStudent && 'parents' in selectedStudent && Array.isArray(selectedStudent.parents) && (selectedStudent.parents as any[]).length > 0) {
      console.log('🔍 Using student.parents data for auth:', {
        studentId: selectedAuthStudentId,
        studentName: selectedStudent.name,
        parentsCount: (selectedStudent.parents as any[]).length
      });

      const filtered = (selectedStudent.parents as any[]).filter((p: any) =>
        p.id !== parent?.id
      );

      console.log(`✅ Filtered to ${filtered.length} authorizing parent(s) from student.parents:`,
        filtered.map((p: any) => p.name)
      );

      return filtered;
    }

    // Fallback to parentIds matching (original logic)
    console.log('🔍 Selected student for auth:', {
      studentId: selectedAuthStudentId,
      studentFound: !!selectedStudent,
      studentName: selectedStudent?.name,
      parentIds: selectedStudent?.parentIds,
      parentIdsLength: selectedStudent?.parentIds?.length || 0
    });

    if (!selectedStudent || !selectedStudent.parentIds || selectedStudent.parentIds.length === 0) {
      console.log('⚠️ No parent IDs found for selected student');
      return allParents.filter(p => p.id !== parent?.id);
    }

    // Filter to only show parents of this student
    const filtered = allParents.filter(p =>
      p.id !== parent?.id && selectedStudent.parentIds.includes(p.id)
    );

    console.log(`✅ Filtered to ${filtered.length} authorizing parent(s) for student:`,
      filtered.map(p => p.name)
    );

    // Debug: Check if parents exist in allParents but aren't being matched
    const unmatchedParentIds = selectedStudent.parentIds.filter(id =>
      !allParents.some(p => p.id === id) && id !== parent?.id
    );
    if (unmatchedParentIds.length > 0) {
      console.warn('⚠️ Parent IDs not found in allParents:', unmatchedParentIds);
      console.log('Available parents in allParents:', allParents.map(p => ({ id: p.id, name: p.name })));
    }

    return filtered;
  }, [selectedAuthStudentId, allStudents, allParents, parent]);

  const handleAddStudent = async () => {
    if (!parent || !selectedStudentId) return;
    
    await onAddStudent(parent.id, selectedStudentId, relationship, isPrimary);
    setShowAddStudentForm(false);
    resetStudentForm();
  };

  const handleAddAuthorization = async () => {
    if (!parent || !selectedAuthStudentId || !selectedAuthorizingParentId || !startDate || !endDate) return;
    
    try {
      // Get the authorizing parent ID (admin creating the authorization)
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) {
        logger.error('Error getting current parent ID');
        toast({
          title: t('familyMemberDetails.error'),
          description: 'Failed to authenticate admin',
          variant: "destructive",
        });
        return;
      }
      
      await createPickupAuthorization(selectedAuthorizingParentId, {
        studentId: selectedAuthStudentId,
        authorizedParentId: parent.id,
        startDate: startDate,
        endDate: endDate,
        allowedDaysOfWeek: [1, 2, 3, 4, 5] // Default to weekdays
      });
      
      toast({
        title: t('familyMemberDetails.success'),
        description: t('familyMemberDetails.authorizationAddedSuccess'),
      });
      
      setShowAddAuthorizationForm(false);
      resetAuthorizationForm();
      loadAuthorizations();
    } catch (error) {
      logger.error('Error adding authorization:', error);
      toast({
        title: t('familyMemberDetails.error'),
        description: t('familyMemberDetails.failedToAddAuth'),
        variant: "destructive",
      });
    }
  };

  const handleRemoveAuthorization = async (authId: string) => {
    try {
      const currentParentId = await getCurrentParentIdCached();
      if (!currentParentId) return;
      
      await deletePickupAuthorization(currentParentId, authId);
      toast({
        title: t('familyMemberDetails.success'),
        description: t('familyMemberDetails.authorizationRemovedSuccess'),
      });
      loadAuthorizations();
    } catch (error) {
      logger.error('Error removing authorization:', error);
      toast({
        title: t('familyMemberDetails.error'),
        description: t('familyMemberDetails.failedToRemoveAuth'),
        variant: "destructive",
      });
    }
  };

  const resetStudentForm = () => {
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
    setStudentSearchTerm('');
    setSelectedClassFilter('all');
  };

  const resetAuthorizationForm = () => {
    setSelectedAuthStudentId('');
    setSelectedAuthorizingParentId('');
    setStartDate('');
    setEndDate('');
  };

  const formatDate = (dateString: string) => {
    // Parse date in local timezone to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const locale = getCurrentLanguage() === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleClose = () => {
    setShowAddStudentForm(false);
    setShowAddAuthorizationForm(false);
    resetStudentForm();
    resetAuthorizationForm();
    onOpenChange(false);
  };

  if (!parent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('familyMemberDetails.title', { name: parent.name })}
          </DialogTitle>
          <DialogDescription>
            {t('familyMemberDetails.description', { name: parent.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Parent Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('familyMemberDetails.contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('familyMemberDetails.name')}</p>
                  <p>{parent.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('familyMemberDetails.role')}</p>
                  <Badge variant="outline">{parent.role}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('familyMemberDetails.email')}</p>
                  <p>{parent.email || t('familyMemberDetails.notProvided')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('familyMemberDetails.phone')}</p>
                  <p>{parent.phone || t('familyMemberDetails.notProvided')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="assigned" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assigned" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('familyMemberDetails.assignedStudents', { count: parent.students?.length || 0 })}
              </TabsTrigger>
              <TabsTrigger value="authorized" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {t('familyMemberDetails.pickupAuthorizations', { count: receivedAuthorizations.length + authorizations.length })}
              </TabsTrigger>
            </TabsList>

            {/* Assigned Students Tab */}
            <TabsContent value="assigned" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t('familyMemberDetails.directlyAssignedStudents')}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddStudentForm(true)}
                  disabled={availableStudents.length === 0}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('familyMemberDetails.addStudent')}
                </Button>
              </div>

              {/* Current Students */}
              {parent.students && parent.students.length > 0 ? (
                <div className="space-y-2">
                  {parent.students.map(student => (
                    <Card key={student.parentRelationshipId || student.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {student.isPrimary && <Star className="h-4 w-4 text-yellow-500" />}
                          <div>
                            <p className="font-medium">{student.name}</p>
                            {student.relationship && (
                              <p className="text-sm text-muted-foreground">{t('familyMemberDetails.relationship', { relationship: student.relationship })}</p>
                            )}
                            {student.className && (
                              <p className="text-sm text-muted-foreground">{t('familyMemberDetails.class', { className: student.className })}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={student.isPrimary ? t('familyMemberDetails.removePrimaryStatus') : t('familyMemberDetails.setAsPrimary')}
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
                            title={t('familyMemberDetails.removeStudent')}
                            disabled={!student.parentRelationshipId}
                            onClick={() => {
                              if (student.parentRelationshipId) {
                                onRemoveStudent(student.parentRelationshipId, parent.id, student.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    {t('familyMemberDetails.noStudentsAssigned')}
                  </CardContent>
                </Card>
              )}

              {/* Add Student Form */}
              {showAddStudentForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('familyMemberDetails.addStudentTitle')}</CardTitle>
                    <CardDescription>{t('familyMemberDetails.addStudentDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('familyMemberDetails.searchStudents')}</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder={t('familyMemberDetails.searchByName')}
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('familyMemberDetails.filterByClass')}</Label>
                        <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('familyMemberDetails.allClasses')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('familyMemberDetails.allClasses')}</SelectItem>
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
                      <Label>{t('familyMemberDetails.availableStudents', { count: availableStudents.length })}</Label>
                      <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('familyMemberDetails.selectStudent')} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStudents.length === 0 ? (
                            <SelectItem value="no-students-placeholder" disabled>{t('familyMemberDetails.noStudentsMatch')}</SelectItem>
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
                      <Label>{t('familyMemberDetails.relationshipLabel')}</Label>
                      <Input
                        placeholder={t('familyMemberDetails.relationshipPlaceholder')}
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isPrimary"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                      />
                      <Label htmlFor="isPrimary">{t('familyMemberDetails.setPrimaryContact')}</Label>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button onClick={handleAddStudent} disabled={!selectedStudentId}>
                        {t('familyMemberDetails.addStudentButton')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddStudentForm(false)}>
                        {t('familyMemberDetails.cancel')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Pickup Authorizations Tab */}
            <TabsContent value="authorized" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t('familyMemberDetails.pickupAuthorizationsTitle')}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAuthorizationForm(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('familyMemberDetails.addAuthorization')}
                </Button>
              </div>

              {/* Received Authorizations */}
              {receivedAuthorizations.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">{t('familyMemberDetails.receivedAuthorizations')}</h4>
                  {receivedAuthorizations.map(auth => (
                    <Card key={auth.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{auth.student?.name || t('familyMemberDetails.unknownStudent')}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('familyMemberDetails.authorizedBy', { name: auth.authorizingParent?.name || t('familyMemberDetails.unknownParent') })}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
                            </div>
                            <Badge variant={auth.isActive ? "default" : "secondary"}>
                              {auth.isActive ? t('familyMemberDetails.active') : t('familyMemberDetails.inactive')}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t('familyMemberDetails.removeAuthorization')}
                          onClick={() => handleRemoveAuthorization(auth.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}

              {/* Created Authorizations */}
              {authorizations.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">{t('familyMemberDetails.createdAuthorizations')}</h4>
                  {authorizations.map(auth => (
                    <Card key={auth.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{auth.student?.name || t('familyMemberDetails.unknownStudent')}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('familyMemberDetails.authorizedTo', { name: auth.authorizedParent?.name || t('familyMemberDetails.unknownParent') })}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
                            </div>
                            <Badge variant={auth.isActive ? "default" : "secondary"}>
                              {auth.isActive ? t('familyMemberDetails.active') : t('familyMemberDetails.inactive')}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t('familyMemberDetails.removeAuthorization')}
                          onClick={() => handleRemoveAuthorization(auth.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}

              {/* No authorizations message */}
              {receivedAuthorizations.length === 0 && authorizations.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    {t('familyMemberDetails.noAuthorizationsFound')}
                  </CardContent>
                </Card>
              ) : null}

              {/* Add Authorization Form */}
              {showAddAuthorizationForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('familyMemberDetails.addPickupAuthTitle')}</CardTitle>
                    <CardDescription>{t('familyMemberDetails.addPickupAuthDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('familyMemberDetails.student')}</Label>
                        <Select value={selectedAuthStudentId} onValueChange={setSelectedAuthStudentId}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('familyMemberDetails.selectStudent')} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAuthStudents.length === 0 ? (
                              <SelectItem value="no-students-placeholder" disabled>
                                {t('familyMemberDetails.noStudentsMatch')}
                              </SelectItem>
                            ) : (
                              availableAuthStudents.map(student => {
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
                        <Label>{t('familyMemberDetails.authorizingParent')}</Label>
                        <Select 
                          value={selectedAuthorizingParentId} 
                          onValueChange={setSelectedAuthorizingParentId}
                          disabled={!selectedAuthStudentId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedAuthStudentId 
                                ? t('familyMemberDetails.selectStudentFirst')
                                : t('familyMemberDetails.selectParent')
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAuthorizingParents.length === 0 ? (
                              <SelectItem value="no-parents-placeholder" disabled>
                                {t('familyMemberDetails.noParentsForStudent')}
                              </SelectItem>
                            ) : (
                              availableAuthorizingParents.map(parentOption => (
                                <SelectItem key={parentOption.id} value={parentOption.id}>
                                  {parentOption.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('familyMemberDetails.startDate')}</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('familyMemberDetails.endDate')}</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button 
                        onClick={handleAddAuthorization} 
                        disabled={!selectedAuthStudentId || !selectedAuthorizingParentId || !startDate || !endDate}
                      >
                        {t('familyMemberDetails.addAuthorizationButton')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddAuthorizationForm(false)}>
                        {t('familyMemberDetails.cancel')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('familyMemberDetails.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FamilyMemberDetailScreen;
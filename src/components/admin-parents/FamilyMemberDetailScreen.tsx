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
  const { t } = useTranslation();
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
      // Get authorizations this parent has created
      const parentAuthorizations = await getPickupAuthorizationsForParent();
      // Get authorizations where this parent is authorized
      const receivedAuths = await getPickupAuthorizationsForAuthorizedParent(parent.id);
      
      setAuthorizations(parentAuthorizations);
      setReceivedAuthorizations(receivedAuths);
    } catch (error) {
      console.error('Error loading authorizations:', error);
      toast({
        title: "Error",
        description: "Failed to load pickup authorizations",
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

  // Filter available students for authorization (only those belonging to other parents)
  const availableAuthStudents = useMemo(() => {
    if (!parent) return [];
    
    return allStudents.filter(student => {
      // Exclude students already assigned to this parent
      const isAssignedToParent = parent.students?.some(ps => ps.id === student.id);
      if (isAssignedToParent) return false;
      
      // Only include students that have authorizations this parent can receive
      return true;
    });
  }, [parent, allStudents]);

  const handleAddStudent = async () => {
    if (!parent || !selectedStudentId) return;
    
    await onAddStudent(parent.id, selectedStudentId, relationship, isPrimary);
    setShowAddStudentForm(false);
    resetStudentForm();
  };

  const handleAddAuthorization = async () => {
    if (!parent || !selectedAuthStudentId || !selectedAuthorizingParentId || !startDate || !endDate) return;
    
    try {
      await createPickupAuthorization({
        studentId: selectedAuthStudentId,
        authorizedParentId: parent.id,
        startDate: startDate,
        endDate: endDate
      });
      
      toast({
        title: "Success",
        description: "Pickup authorization added successfully",
      });
      
      setShowAddAuthorizationForm(false);
      resetAuthorizationForm();
      loadAuthorizations();
    } catch (error) {
      console.error('Error adding authorization:', error);
      toast({
        title: "Error",
        description: "Failed to add pickup authorization",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAuthorization = async (authId: string) => {
    try {
      await deletePickupAuthorization(authId);
      toast({
        title: "Success",
        description: "Pickup authorization removed successfully",
      });
      loadAuthorizations();
    } catch (error) {
      console.error('Error removing authorization:', error);
      toast({
        title: "Error",
        description: "Failed to remove pickup authorization",
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
            Family Member Details: {parent.name}
          </DialogTitle>
          <DialogDescription>
            Manage assigned students and pickup authorizations for {parent.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Parent Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{parent.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <Badge variant="outline">{parent.role}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{parent.email || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{parent.phone || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="assigned" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assigned" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assigned Students ({parent.students?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="authorized" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Pickup Authorizations ({receivedAuthorizations.length})
              </TabsTrigger>
            </TabsList>

            {/* Assigned Students Tab */}
            <TabsContent value="assigned" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Directly Assigned Students</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddStudentForm(true)}
                  disabled={availableStudents.length === 0}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
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
                              <p className="text-sm text-muted-foreground">Relationship: {student.relationship}</p>
                            )}
                            {student.className && (
                              <p className="text-sm text-muted-foreground">Class: {student.className}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={student.isPrimary ? "Remove primary status" : "Set as primary"}
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
                            title="Remove student"
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
                    No students directly assigned to this family member
                  </CardContent>
                </Card>
              )}

              {/* Add Student Form */}
              {showAddStudentForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Student</CardTitle>
                    <CardDescription>Assign a student to this family member</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Search Students</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search by name..."
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Filter by Class</Label>
                        <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All classes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
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
                      <Label>Student ({availableStudents.length} available)</Label>
                      <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStudents.length === 0 ? (
                            <SelectItem value="" disabled>No students match the criteria</SelectItem>
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
                      <Label>Relationship</Label>
                      <Input
                        placeholder="e.g., parent, guardian, grandparent"
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
                      <Label htmlFor="isPrimary">Set as primary contact</Label>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button onClick={handleAddStudent} disabled={!selectedStudentId}>
                        Add Student
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddStudentForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Pickup Authorizations Tab */}
            <TabsContent value="authorized" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Pickup Authorizations</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAuthorizationForm(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Authorization
                </Button>
              </div>

              {/* Received Authorizations */}
              {receivedAuthorizations.length > 0 ? (
                <div className="space-y-2">
                  {receivedAuthorizations.map(auth => (
                    <Card key={auth.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{auth.student?.name || 'Unknown Student'}</p>
                          <p className="text-sm text-muted-foreground">
                            Authorized by: {auth.authorizingParent?.name || 'Unknown Parent'}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(auth.startDate).toLocaleDateString()} - {new Date(auth.endDate).toLocaleDateString()}
                            </div>
                            <Badge variant={auth.isActive ? "default" : "secondary"}>
                              {auth.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Remove authorization"
                          onClick={() => handleRemoveAuthorization(auth.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No pickup authorizations found for this family member
                  </CardContent>
                </Card>
              )}

              {/* Add Authorization Form */}
              {showAddAuthorizationForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Pickup Authorization</CardTitle>
                    <CardDescription>Allow this family member to pick up a student</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Student</Label>
                        <Select value={selectedAuthStudentId} onValueChange={setSelectedAuthStudentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a student" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAuthStudents.map(student => {
                              const studentClass = classes.find(c => c.id === student.classId);
                              return (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.name} {studentClass && `(${studentClass.name})`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Authorizing Parent</Label>
                        <Select value={selectedAuthorizingParentId} onValueChange={setSelectedAuthorizingParentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent" />
                          </SelectTrigger>
                          <SelectContent>
                            {allParents.filter(p => p.id !== parent.id).map(parentOption => (
                              <SelectItem key={parentOption.id} value={parentOption.id}>
                                {parentOption.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
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
                        Add Authorization
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddAuthorizationForm(false)}>
                        Cancel
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
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FamilyMemberDetailScreen;
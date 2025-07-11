import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Users, Clock } from "lucide-react";
import { Child, Class } from '@/types';
import { supabase } from "@/integrations/supabase/client";
import { getPickupAuthorizationsForStudent } from '@/services/pickupAuthorizationService';

interface StudentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Child | null;
  getClassName: (classId: string) => string;
  classList: Class[];
}

interface StudentParentRelation {
  id: string;
  parentId: string;
  parentName: string;
  relationship?: string;
  isPrimary: boolean;
  parentEmail?: string;
  parentPhone?: string;
}

interface PickupAuthorization {
  id: string;
  authorizedParentId: string;
  authorizedParentName: string;
  authorizedParentEmail: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  open,
  onOpenChange,
  student,
  getClassName,
  classList,
}) => {
  const [parentRelations, setParentRelations] = useState<StudentParentRelation[]>([]);
  const [pickupAuthorizations, setPickupAuthorizations] = useState<PickupAuthorization[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!student || !open) {
      setParentRelations([]);
      setPickupAuthorizations([]);
      return;
    }

    const fetchStudentDetails = async () => {
      setIsLoading(true);
      console.log('Fetching student details for student:', student.id);
      
      try {
        // Fetch parent relationships with parent details
        const { data: relations, error } = await supabase
          .from('student_parents')
          .select(`
            id,
            parent_id,
            relationship,
            is_primary,
            parents!inner(
              name,
              email,
              phone
            )
          `)
          .eq('student_id', student.id);

        if (error) {
          console.error('Error fetching student relations:', error);
        } else {
          const parentData: StudentParentRelation[] = relations.map(rel => ({
            id: rel.id,
            parentId: rel.parent_id,
            parentName: rel.parents?.name || 'Unknown Parent',
            relationship: rel.relationship || undefined,
            isPrimary: rel.is_primary,
            parentEmail: rel.parents?.email,
            parentPhone: rel.parents?.phone,
          }));

          setParentRelations(parentData);
        }

        // Fetch pickup authorizations using the service helper
        console.log('Fetching pickup authorizations for student ID:', student.id);

        try {
          const authorizations = await getPickupAuthorizationsForStudent(student.id);

          const authData: PickupAuthorization[] = authorizations.map(auth => ({
            id: auth.id,
            authorizedParentId: auth.authorizedParentId,
            authorizedParentName: auth.authorizedParent?.name || 'Unknown Parent',
            authorizedParentEmail: auth.authorizedParent?.email || '',
            startDate: auth.startDate,
            endDate: auth.endDate,
            isActive: auth.isActive,
            createdAt: auth.createdAt,
          }));

          console.log('Final pickup authorizations data:', authData);
          setPickupAuthorizations(authData);
        } catch (authError) {
          console.error('Error fetching pickup authorizations:', authError);
          setPickupAuthorizations([]);
        }
      } catch (error) {
        console.error('Error in fetchStudentDetails:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentDetails();
  }, [student, open]);

  if (!student) return null;

  const classInfo = classList.find(c => c.id === student.classId);
  const initials = student.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const isActive = (startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return today >= start && today <= end;
  };

  const getAuthorizationStatus = (startDate: string, endDate: string) => {
    if (isExpired(endDate)) return { label: 'Expired', variant: 'destructive' as const };
    if (isActive(startDate, endDate)) return { label: 'Active', variant: 'default' as const };
    return { label: 'Scheduled', variant: 'outline' as const };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
          <DialogDescription>
            Complete information about {student.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={student.avatar} alt={student.name} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{student.name}</h3>
                  <p className="text-muted-foreground">Student ID: {student.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Class Information</CardTitle>
            </CardHeader>
            <CardContent>
              {classInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Class Name</p>
                    <p className="text-lg">{classInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Grade</p>
                    <p className="text-lg">{classInfo.grade}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teacher</p>
                    <p className="text-lg">{classInfo.teacher}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No class information available</p>
              )}
            </CardContent>
          </Card>

          {/* Parent Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parent/Guardian Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading parent information...</p>
              ) : parentRelations.length > 0 ? (
                <div className="space-y-4">
                  {parentRelations.map((parent) => (
                    <div key={parent.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{parent.parentName}</h4>
                        <div className="flex gap-2">
                          {parent.isPrimary && (
                            <Badge variant="default">Primary</Badge>
                          )}
                          {parent.relationship && (
                            <Badge variant="secondary">{parent.relationship}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {parent.parentEmail && (
                          <div>
                            <span className="font-medium">Email: </span>
                            <span className="text-muted-foreground">{parent.parentEmail}</span>
                          </div>
                        )}
                        {parent.parentPhone && (
                          <div>
                            <span className="font-medium">Phone: </span>
                            <span className="text-muted-foreground">{parent.parentPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No parent/guardian information available</p>
              )}
            </CardContent>
          </Card>

          {/* Pickup Authorizations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Authorized Pickup Parents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading pickup authorizations...</p>
              ) : pickupAuthorizations.length > 0 ? (
                <div className="space-y-4">
                  {pickupAuthorizations.map((auth) => {
                    const status = getAuthorizationStatus(auth.startDate, auth.endDate);
                    return (
                      <div key={auth.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{auth.authorizedParentName}</h4>
                            <p className="text-sm text-muted-foreground">{auth.authorizedParentEmail}</p>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {formatDate(auth.startDate)} - {formatDate(auth.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Created {formatDate(auth.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pickup Authorizations</h3>
                  <p className="text-gray-500">
                    No additional parents have been authorized to pick up this student.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailsDialog;

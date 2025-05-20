
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Search,
  Link as LinkIcon
} from "lucide-react";
import { getParentsWithStudents, addStudentToParent } from '@/services/parentService'; // Added addStudentToParent
import { getAllStudents } from '@/services/studentService';
import { ParentWithStudents } from '@/types/parent';
import { Child } from '@/types';

const ParentManagement: React.FC = () => {
  const { toast } = useToast();
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
        // Load all parents with their students
        const parentsData = await getParentsWithStudents();
        setParents(parentsData);
        
        // Load all students
        const allStudents = await getAllStudents();
        
        // Get all student IDs that are already assigned to parents
        const assignedStudentIds = new Set<string>();
        parentsData.forEach(parent => {
          parent.students?.forEach(student => {
            assignedStudentIds.add(student.id);
          });
        });
        
        // Filter out students that aren't assigned to any parent
        const unassignedStuds = allStudents.filter(student => !assignedStudentIds.has(student.id));
        setUnassignedStudents(unassignedStuds);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load parent and student data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  const filteredParents = parents.filter(parent => 
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAssignStudent = async (parentId: string, studentId: string) => {
    try {
      // Get the student info from unassignedStudents
      const student = unassignedStudents.find(s => s.id === studentId);
      if (!student) {
        toast({ title: "Error", description: "Student not found.", variant: "destructive" });
        return;
      }
      
      // Call the service to associate student with parent
      // For this simplified UI, we'll set isPrimary to true and relationship to undefined by default.
      const newRelationship = await addStudentToParent(parentId, studentId, undefined, true);
      
      // Update the parents state
      setParents(prevParents => 
        prevParents.map(parent => {
          if (parent.id === parentId) {
            return {
              ...parent,
              students: [
                ...(parent.students || []),
                { 
                  id: student.id, // Student's ID
                  name: student.name, 
                  isPrimary: newRelationship.isPrimary, // Use value from relationship
                  relationship: newRelationship.relationship, // Use value from relationship
                  parentRelationshipId: newRelationship.id // This is the ID from student_parents table
                }
              ]
            };
          }
          return parent;
        })
      );
      
      // Remove from unassigned students
      setUnassignedStudents(prev => prev.filter(s => s.id !== studentId));
      
      toast({
        title: "Success",
        description: "Student assigned to parent successfully",
      });
      
      setIsStudentAssignDialogOpen(false);
    } catch (error) {
      console.error("Error assigning student:", error);
      toast({
        title: "Error",
        description: "Failed to assign student to parent",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Parent Management</CardTitle>
          <CardDescription>
            View registered parents and manage their student connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search parents..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
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
                {filteredParents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchTerm ? "No parents matching your search" : "No parents registered yet"}
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
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                              >
                                {student.name}
                              </span>
                            ))}
                            {parent.students.length > 2 && (
                              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                +{parent.students.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No students assigned</span>
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
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedParent(parent);
                              setIsStudentAssignDialogOpen(true);
                            }}
                          >
                            <LinkIcon className="h-4 w-4" />
                            Assign Student
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
      
      {/* View Parent Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Parent Details</DialogTitle>
            <DialogDescription>
              View details and assigned students
            </DialogDescription>
          </DialogHeader>
          
          {selectedParent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Contact Information</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p><strong>Name:</strong> {selectedParent.name}</p>
                  <p><strong>Email:</strong> {selectedParent.email}</p>
                  <p><strong>Phone:</strong> {selectedParent.phone || "Not provided"}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium">Assigned Students</h3>
                {selectedParent.students && selectedParent.students.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedParent.students.map(student => (
                      <div key={student.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span>{student.name}</span>
                        {student.isPrimary && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">No students assigned</p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => setIsViewDialogOpen(false)} 
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Assign Student Dialog */}
      <Dialog open={isStudentAssignDialogOpen} onOpenChange={setIsStudentAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Student to Parent</DialogTitle>
            <DialogDescription>
              {selectedParent && `Select a student to assign to ${selectedParent.name}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedParent && (
            <>
              {unassignedStudents.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No unassigned students available</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {unassignedStudents.map(student => (
                    <div 
                      key={student.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                    >
                      <span>{student.name}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAssignStudent(selectedParent.id, student.id)}
                      >
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => setIsStudentAssignDialogOpen(false)} 
              className="w-full sm:w-auto"
              variant="outline"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentManagement;



import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { migrateClassesToSupabase } from '@/services/classService';
import { migrateStudentsToSupabase } from '@/services/student';
import { migratePickupRequestsToSupabase } from '@/services/pickupService';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Class, Child, PickupRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Sample data for initial setup
const sampleClasses: Class[] = [
  { id: uuidv4(), name: 'Class 1A', grade: '1st Grade', teacher: 'Ms. Smith' },
  { id: uuidv4(), name: 'Class 2B', grade: '2nd Grade', teacher: 'Mr. Johnson' },
  { id: uuidv4(), name: 'Class 3C', grade: '3rd Grade', teacher: 'Mrs. Williams' },
];

const sampleChildren: Child[] = [
  {
    id: uuidv4(),
    name: 'Emma Doe',
    classId: sampleClasses[0].id,
    parentIds: [],
  },
  {
    id: uuidv4(),
    name: 'Liam Doe',
    classId: sampleClasses[1].id,
    parentIds: [],
  },
  {
    id: uuidv4(),
    name: 'Olivia Smith',
    classId: sampleClasses[0].id,
    parentIds: [],
  },
];

const samplePickupRequests: PickupRequest[] = [];

const AdminInitialSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState({
    classes: false,
    students: false,
    pickupRequests: false
  });
  const { toast } = useToast();

  const handleMigrateData = async () => {
    setIsLoading(true);
    setConfirmationOpen(false);
    
    try {
      // Step 1: Migrate classes
      await migrateClassesToSupabase(sampleClasses);
      setMigrationStatus(prev => ({ ...prev, classes: true }));
      toast({
        title: "Classes Migrated",
        description: `${sampleClasses.length} classes have been migrated to Supabase`,
      });
      
      // Step 2: Migrate students
      await migrateStudentsToSupabase(sampleChildren);
      setMigrationStatus(prev => ({ ...prev, students: true }));
      toast({
        title: "Students Migrated",
        description: `${sampleChildren.length} students have been migrated to Supabase`,
      });
      
      // Step 3: Migrate pickup requests
      if (samplePickupRequests.length > 0) {
        await migratePickupRequestsToSupabase(samplePickupRequests);
        setMigrationStatus(prev => ({ ...prev, pickupRequests: true }));
        toast({
          title: "Pickup Requests Migrated",
          description: `${samplePickupRequests.length} pickup requests have been migrated to Supabase`,
        });
      } else {
        setMigrationStatus(prev => ({ ...prev, pickupRequests: true }));
        toast({
          title: "Pickup Requests",
          description: "No pickup requests to migrate",
        });
      }
      
      // All done
      setMigrationComplete(true);
      toast({
        title: "Migration Complete",
        description: "All sample data has been successfully migrated to Supabase",
      });
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Error",
        description: "An error occurred during migration. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Initial Data Setup</CardTitle>
          <CardDescription>
            Migrate sample data to the Supabase database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="font-medium">Classes</h3>
                <p className="text-sm text-muted-foreground">{sampleClasses.length} classes to migrate</p>
              </div>
              {migrationStatus.classes ? 
                <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                <AlertCircle className="h-5 w-5 text-amber-500" />
              }
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="font-medium">Students</h3>
                <p className="text-sm text-muted-foreground">{sampleChildren.length} students to migrate</p>
              </div>
              {migrationStatus.students ? 
                <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                <AlertCircle className="h-5 w-5 text-amber-500" />
              }
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="font-medium">Pickup Requests</h3>
                <p className="text-sm text-muted-foreground">
                  {samplePickupRequests.length} pickup requests to migrate
                </p>
              </div>
              {migrationStatus.pickupRequests ? 
                <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                <AlertCircle className="h-5 w-5 text-amber-500" />
              }
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          {migrationComplete ? (
            <Link to="/admin">
              <Button className="w-full sm:w-auto flex items-center">
                Go to Admin Panel <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button 
              onClick={() => setConfirmationOpen(true)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Migrating...' : 'Migrate Sample Data to Supabase'}
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Migration</AlertDialogTitle>
            <AlertDialogDescription>
              This will migrate sample data to your Supabase database. 
              If data with the same IDs already exists, it will be updated.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMigrateData}>
              Yes, Migrate Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInitialSetup;

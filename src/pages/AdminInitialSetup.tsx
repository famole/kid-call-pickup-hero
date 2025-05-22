
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
import { classes, children, parents, pickupRequests } from '@/services/mockData';
import { migrateClassesToSupabase } from '@/services/classService';
import { migrateStudentsToSupabase } from '@/services/studentService';
import { migratePickupRequestsToSupabase, fixInvalidPickupRequestIds } from '@/services/pickupService';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      await migrateClassesToSupabase(classes);
      setMigrationStatus(prev => ({ ...prev, classes: true }));
      toast({
        title: "Classes Migrated",
        description: `${classes.length} classes have been migrated to Supabase`,
      });
      
      // Step 2: Migrate students and their parent relationships
      await migrateStudentsToSupabase(children);
      setMigrationStatus(prev => ({ ...prev, students: true }));
      toast({
        title: "Students Migrated",
        description: `${children.length} students have been migrated to Supabase`,
      });
      
      // Step 3: Migrate pickup requests
      if (pickupRequests.length > 0) {
        await migratePickupRequestsToSupabase(pickupRequests);
        setMigrationStatus(prev => ({ ...prev, pickupRequests: true }));
        toast({
          title: "Pickup Requests Migrated",
          description: `${pickupRequests.length} pickup requests have been migrated to Supabase`,
        });
      
        // Fix any pickup requests that may still reference legacy numeric IDs
        try {
          await fixInvalidPickupRequestIds();
          console.log('Successfully corrected invalid pickup request IDs');
        } catch (fixError) {
          console.error('Failed to fix invalid pickup request IDs', fixError);
        }
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
        description: "All data has been successfully migrated to Supabase",
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
            Migrate your mock data to the Supabase database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="font-medium">Classes</h3>
                <p className="text-sm text-muted-foreground">{classes.length} classes to migrate</p>
              </div>
              {migrationStatus.classes ? 
                <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                <AlertCircle className="h-5 w-5 text-amber-500" />
              }
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="font-medium">Students</h3>
                <p className="text-sm text-muted-foreground">{children.length} students to migrate</p>
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
                  {pickupRequests.length} pickup requests to migrate
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
              {isLoading ? 'Migrating...' : 'Migrate Data to Supabase'}
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Migration</AlertDialogTitle>
            <AlertDialogDescription>
              This will migrate all mock data to your Supabase database. 
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

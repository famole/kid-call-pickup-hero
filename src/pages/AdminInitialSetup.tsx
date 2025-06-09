
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Navigation from '@/components/Navigation';

const AdminInitialSetup = () => {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <Navigation />
      <div className="w-full">
        <div className="container mx-auto py-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Admin Setup</CardTitle>
              <CardDescription>
                Welcome to the admin panel setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Your admin panel is ready to use. You can now manage classes, students, and parents from the admin dashboard.
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end p-6">
              <Link to="/admin">
                <Button className="flex items-center">
                  Go to Admin Panel <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminInitialSetup;

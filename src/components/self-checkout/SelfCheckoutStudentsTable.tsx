
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Calendar } from 'lucide-react';
import { SelfCheckoutAuthorizationWithDetails } from '@/services/selfCheckoutService';
import { Skeleton } from '@/components/ui/skeleton';

interface SelfCheckoutStudentsTableProps {
  authorizations: SelfCheckoutAuthorizationWithDetails[];
  loading: boolean;
}

const SelfCheckoutStudentsTable: React.FC<SelfCheckoutStudentsTableProps> = ({
  authorizations,
  loading
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Self-Checkout Authorized Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (authorizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Self-Checkout Authorized Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <LogOut className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Authorized Students</h3>
            <p className="text-gray-500">There are currently no students authorized for self-checkout.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogOut className="h-5 w-5" />
          Self-Checkout Authorized Students ({authorizations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Student</TableHead>
                <TableHead className="text-left">Class</TableHead>
                <TableHead className="text-left">Authorizing Parent</TableHead>
                <TableHead className="text-left">Authorization Period</TableHead>
                <TableHead className="text-left">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authorizations.map((authorization) => (
                <TableRow key={authorization.id}>
                  <TableCell className="text-left">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={authorization.student?.avatar} alt={authorization.student?.name} />
                        <AvatarFallback className="bg-school-primary text-white">
                          {authorization.student?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {authorization.student?.name || 'Unknown Student'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <div>
                      <div className="font-medium text-gray-900">
                        {authorization.class?.name || 'No Class'}
                      </div>
                      {authorization.class?.grade && (
                        <div className="text-sm text-gray-500">
                          Grade {authorization.class.grade}
                        </div>
                      )}
                      {authorization.class?.teacher && (
                        <div className="text-sm text-gray-500">
                          {authorization.class.teacher}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="font-medium text-gray-900">
                      {authorization.authorizingParent?.name || 'Unknown Parent'}
                    </div>
                    {authorization.authorizingParent?.email && (
                      <div className="text-sm text-gray-500">
                        {authorization.authorizingParent.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <div>{new Date(authorization.startDate).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          to {new Date(authorization.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <Badge 
                      variant={authorization.isActive ? "default" : "secondary"}
                      className={authorization.isActive ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {authorization.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelfCheckoutStudentsTable;


import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Clock } from 'lucide-react';
import { PickupRequestWithDetails } from '@/types/supabase';

interface ClassGroupProps {
  classId: string;
  students: PickupRequestWithDetails[];
}

const ClassGroup: React.FC<ClassGroupProps> = ({ classId, students }) => {
  // Get class info from the first student (all should have the same class)
  const classInfo = students[0]?.class;
  const className = classInfo?.name || `Class ${classId}`;
  const grade = classInfo?.grade;
  const teacher = classInfo?.teacher;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">
              {className}
              {grade && <span className="text-lg font-normal text-gray-600 ml-2">({grade})</span>}
            </CardTitle>
            {teacher && (
              <p className="text-sm text-gray-600 mt-1">Teacher: {teacher}</p>
            )}
          </div>
          <Badge variant="secondary" className="text-sm">
            {students.length} student{students.length !== 1 ? 's' : ''} called
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card key={student.request.id} className="border border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={student.child?.avatar} alt={student.child?.name} />
                    <AvatarFallback className="bg-school-primary text-white text-lg font-semibold">
                      {student.child?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {student.child?.name || 'Unknown Student'}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>Called at {new Date(student.request.requestTime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Pickup Person Information */}
                <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-md">
                  <User className="h-4 w-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium">Pickup Person:</p>
                    <p className="text-sm font-medium text-gray-700">
                      {student.parent?.name || `Parent (ID: ${student.request.parentId?.slice(0, 8)}...)`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassGroup;

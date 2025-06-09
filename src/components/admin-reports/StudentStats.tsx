
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StudentStatsProps {
  stats: {
    totalPickups: number;
    averageDuration: number;
  } | null;
}

const StudentStats: React.FC<StudentStatsProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Student Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Pickups</p>
            <p className="text-2xl font-bold">{stats.totalPickups}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average Duration</p>
            <p className="text-2xl font-bold">{stats.averageDuration} min</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentStats;

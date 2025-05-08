
import React from 'react';

const NoStudents: React.FC = () => {
  return (
    <div className="text-center py-12 sm:py-20">
      <h3 className="text-xl sm:text-2xl font-semibold text-gray-500">No students currently called</h3>
      <p className="text-muted-foreground mt-2">Student names will appear here when they are called</p>
    </div>
  );
};

export default NoStudents;

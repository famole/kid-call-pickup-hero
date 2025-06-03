
import React from 'react';
import { School } from 'lucide-react';

interface AdminPanelHeaderProps {
  userName?: string;
}

const AdminPanelHeader: React.FC<AdminPanelHeaderProps> = ({ userName }) => {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <School className="h-8 w-8 text-school-primary" />
          <h1 className="text-3xl font-bold">School Pickup Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">Logged in as {userName}</span>
        </div>
      </div>
    </header>
  );
};

export default AdminPanelHeader;

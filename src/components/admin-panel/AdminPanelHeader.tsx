
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
          <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-muted flex-shrink-0">
            <img src="/assets/clifton-college-logo.jpg" alt="Clifton College" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold">Clifton College Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">Logged in as {userName}</span>
        </div>
      </div>
    </header>
  );
};

export default AdminPanelHeader;

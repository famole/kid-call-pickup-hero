
import React from 'react';
import { School } from 'lucide-react';

interface AdminPanelHeaderProps {
  userName?: string;
}

const AdminPanelHeader: React.FC<AdminPanelHeaderProps> = ({ userName }) => {
  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border-2 border-muted flex-shrink-0">
            <img src="/assets/clifton-college-logo.jpg" alt="Clifton College" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold truncate">Clifton College Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm text-muted-foreground truncate">Logged in as {userName}</span>
        </div>
      </div>
    </header>
  );
};

export default AdminPanelHeader;

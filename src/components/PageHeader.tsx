import React from 'react';
import Logo from '@/components/Logo';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <Logo size="sm" />
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold truncate">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;


import React from 'react';
import Logo from '@/components/Logo';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const ViewerHeader: React.FC = () => {
  return (
    <header className="bg-school-primary text-white py-4 px-4 shadow-md">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <h1 className="text-xl sm:text-2xl font-bold">Clifton College</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm sm:text-base">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <Link to="/" className="bg-white/20 p-2 rounded-full">
            <Home className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default ViewerHeader;

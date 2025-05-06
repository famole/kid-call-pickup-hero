
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b py-3 px-4 sm:px-6">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo size="sm" className="text-school-primary" />
          <span className="font-semibold text-xl">School Pickup</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {user && user.role === 'admin' && (
            <Link to="/admin" className="text-gray-600 hover:text-school-primary">
              Admin Panel
            </Link>
          )}
          
          {user && (
            <Link to="/viewer" className="text-gray-600 hover:text-school-primary">
              Viewer Display
            </Link>
          )}
          
          {user && (
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

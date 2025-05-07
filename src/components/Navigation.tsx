
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, UserPlus, Users, UserCheck } from 'lucide-react';
import Logo from '@/components/Logo';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setIsOpen(false);
  };

  const MobileMenu = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[250px] pt-10">
        <div className="flex flex-col space-y-4 py-4">
          {user && user.role === 'admin' && (
            <>
              <Link 
                to="/admin" 
                className="px-4 py-2 text-gray-600 hover:text-school-primary hover:bg-gray-100 rounded-md flex items-center gap-2"
                onClick={() => setIsOpen(false)}
              >
                <Users size={18} />
                Admin Panel
              </Link>
              <Link 
                to="/admin/parents" 
                className="px-4 py-2 text-gray-600 hover:text-school-primary hover:bg-gray-100 rounded-md flex items-center gap-2"
                onClick={() => setIsOpen(false)}
              >
                <UserCheck size={18} />
                Parent Management
              </Link>
            </>
          )}
          
          {user && (
            <Link 
              to="/viewer" 
              className="px-4 py-2 text-gray-600 hover:text-school-primary hover:bg-gray-100 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              Viewer Display
            </Link>
          )}
          
          {user ? (
            <Button variant="outline" onClick={handleLogout} className="mx-4">
              Logout
            </Button>
          ) : (
            <>
              <Link 
                to="/login" 
                className="px-4 py-2 text-gray-600 hover:text-school-primary hover:bg-gray-100 rounded-md"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="px-4 py-2 text-gray-600 hover:text-school-primary hover:bg-gray-100 rounded-md flex items-center gap-2"
                onClick={() => setIsOpen(false)}
              >
                <UserPlus size={18} />
                Sign Up
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <nav className="sticky top-0 z-10 bg-white border-b py-3 px-4 sm:px-6">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo size="sm" className="text-school-primary" />
          <span className="font-semibold text-xl">School Pickup</span>
        </Link>
        
        {isMobile ? (
          <MobileMenu />
        ) : (
          <div className="hidden md:flex items-center gap-4">
            {user && user.role === 'admin' && (
              <>
                <Link to="/admin" className="text-gray-600 hover:text-school-primary flex items-center gap-1">
                  <Users size={18} />
                  Admin Panel
                </Link>
                <Link to="/admin/parents" className="text-gray-600 hover:text-school-primary flex items-center gap-1">
                  <UserCheck size={18} />
                  Parent Management
                </Link>
              </>
            )}
            
            {user && (
              <Link to="/viewer" className="text-gray-600 hover:text-school-primary">
                Viewer Display
              </Link>
            )}
            
            {user ? (
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-school-primary">
                  Login
                </Link>
                <Link to="/signup" className="text-gray-600 hover:text-school-primary flex items-center gap-1">
                  <UserPlus size={18} />
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

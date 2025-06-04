import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, ClipboardList, Shield } from 'lucide-react';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isTeacherOrAdmin = user?.role === 'admin' || user?.role === 'teacher';
  const isParent = user?.role === 'parent';

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <img
              src="/lovable-uploads/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
              alt="Upsy"
              className="h-18 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {isTeacherOrAdmin && (
                  <Button 
                    variant="ghost" 
                    className="text-gray-600 hover:text-gray-800"
                    onClick={() => navigate('/pickup-management')}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Pickup Management
                  </Button>
                )}

                {isParent && (
                  <Button 
                    variant="ghost" 
                    className="text-gray-600 hover:text-gray-800"
                    onClick={() => navigate('/pickup-authorizations')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Authorizations
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                      <User className="h-4 w-4 mr-2" />
                      {user.name}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem disabled>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Settings className="h-4 w-4 mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button onClick={() => navigate('/signup')}>
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

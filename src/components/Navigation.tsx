
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Home, 
  Users, 
  GraduationCap, 
  Settings, 
  LogOut, 
  Menu, 
  UserCog, 
  Car,
  ClipboardList,
  School,
  Languages,
  History
} from 'lucide-react';

const Navigation: React.FC = () => {
  const { user, logout, isInvitedUser } = useAuth();
  const { t, changeLanguage, getCurrentLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLanguageChange = (language: string) => {
    changeLanguage(language);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { path: '/', label: t('navigation.dashboard'), icon: Home, roles: ['parent', 'admin', 'teacher', 'superadmin'] },
    { path: '/pickup-authorization', label: t('navigation.pickupAuthorizations'), icon: Car, roles: ['parent'] },
    { path: '/self-checkout', label: t('navigation.selfCheckout'), icon: LogOut, roles: ['parent'] },
    { path: '/self-checkout-history', label: t('navigation.selfCheckoutHistory'), icon: History, roles: ['parent'] },
    { path: '/pickup-management', label: t('navigation.pickupManagement'), icon: ClipboardList, roles: ['admin', 'teacher', 'superadmin'] },
    { path: '/admin', label: t('navigation.adminPanel'), icon: Settings, roles: ['admin', 'superadmin'] },
  ];

  // For invited users, only show the dashboard
  const visibleItems = isInvitedUser 
    ? navigationItems.filter(item => item.path === '/')
    : navigationItems.filter(item => user?.role && item.roles.includes(user.role));

  const NavItems = ({ mobile = false }) => (
    <>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${active 
                ? 'bg-school-primary text-white' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }
              ${mobile ? 'w-full justify-start' : ''}
            `}
            onClick={() => mobile && setIsOpen(false)}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo - Enhanced visibility */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img
                src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
                alt="Upsy"
                className="h-16 md:h-20 lg:h-24 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <NavItems />
          </div>

          {/* User Menu - Fixed alignment */}
          <div className="flex items-center justify-end space-x-4">
            {/* Mobile menu button */}
            <div className="md:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col space-y-4 mt-4">
                    <div className="pb-4 border-b flex items-center">
                      <img
                        src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
                        alt="Upsy"
                        className="h-8 w-auto object-contain mr-2"
                      />
                      <span className="text-lg font-semibold text-gray-900">Upsy</span>
                    </div>
                    <NavItems mobile />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                    <AvatarFallback className="bg-school-primary text-white text-xs">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Language Selection */}
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center space-x-2">
                    <Languages className="h-4 w-4" />
                    <span className="text-sm">{t('navigation.language')}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleLanguageChange('es')}>
                  <span className={getCurrentLanguage() === 'es' ? 'font-bold' : ''}>
                    {t('languages.spanish')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                  <span className={getCurrentLanguage() === 'en' ? 'font-bold' : ''}>
                    {t('languages.english')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('navigation.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

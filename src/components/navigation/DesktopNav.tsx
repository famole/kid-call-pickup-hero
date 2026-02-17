
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import {
  Home,
  Car,
  ClipboardList,
  Settings,
  LogOut,
  Languages,
  History,
  FileText,
  CalendarDays,
  MessagesSquare,
  ChevronDown,
} from 'lucide-react';
import { NavigationItem } from './navItems';

interface DesktopNavProps {
  visibleItems: NavigationItem[];
}

interface NavGroup {
  label: string;
  items: NavigationItem[];
}

const DesktopNav: React.FC<DesktopNavProps> = ({ visibleItems }) => {
  const { user, logout } = useAuth();
  const { t, changeLanguage, getCurrentLanguage } = useTranslation();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleLogout = async () => {
    await logout();
  };

  // Group items for desktop
  const groupItems = (items: NavigationItem[]): (NavigationItem | NavGroup)[] => {
    const standalone: NavigationItem[] = [];
    const pickupGroup: NavigationItem[] = [];
    const adminGroup: NavigationItem[] = [];

    items.forEach(item => {
      if (item.path === '/') {
        standalone.push(item);
      } else if (['/pickup-authorization', '/self-checkout', '/self-checkout-history', '/pickup-management'].includes(item.path)) {
        pickupGroup.push(item);
      } else if (['/admin', '/teacher-reports'].includes(item.path)) {
        adminGroup.push(item);
      } else {
        standalone.push(item);
      }
    });

    const result: (NavigationItem | NavGroup)[] = [...standalone];
    if (pickupGroup.length > 0) result.push({ label: t('navigation.pickup', 'Pickup'), items: pickupGroup });
    if (adminGroup.length > 0) result.push({ label: t('navigation.manage', 'Manage'), items: adminGroup });
    return result;
  };

  const grouped = groupItems(visibleItems);

  const isGroup = (item: NavigationItem | NavGroup): item is NavGroup => 'items' in item;

  return (
    <nav className="bg-white shadow-sm border-b border-border hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img
              src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
              alt="Upsy"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Nav Items */}
          <div className="flex items-center gap-1">
            {grouped.map((entry, i) =>
              isGroup(entry) ? (
                <DropdownMenu key={i}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-sm font-medium gap-1 ${
                        entry.items.some(it => isActive(it.path))
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {entry.label}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    {entry.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link
                            to={item.path}
                            className={`flex items-center gap-2 ${
                              isActive(item.path) ? 'font-semibold text-primary' : ''
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link key={entry.path} to={entry.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-sm font-medium gap-1.5 ${
                      isActive(entry.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <entry.icon className="h-4 w-4" />
                    {entry.label}
                  </Button>
                </Link>
              )
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4" />
                  <span className="text-sm">{t('navigation.language')}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => changeLanguage('es')}>
                <span className={getCurrentLanguage() === 'es' ? 'font-bold' : ''}>{t('languages.spanish')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')}>
                <span className={getCurrentLanguage() === 'en' ? 'font-bold' : ''}>{t('languages.english')}</span>
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
    </nav>
  );
};

export default DesktopNav;

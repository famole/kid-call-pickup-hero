
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { MoreHorizontal, LogOut, Languages } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { NavigationItem, getMobileTabItems, getMobileOverflowItems } from './navItems';

interface MobileBottomNavProps {
  visibleItems: NavigationItem[];
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ visibleItems }) => {
  const { user, logout } = useAuth();
  const { t, changeLanguage, getCurrentLanguage } = useTranslation();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const tabItems = getMobileTabItems(visibleItems);
  const overflowItems = getMobileOverflowItems(visibleItems);
  const hasOverflow = overflowItems.length > 0;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleLogout = async () => {
    setSheetOpen(false);
    await logout();
  };

  return (
    <>
      {/* Mobile top bar - just logo + avatar */}
      <div className="md:hidden bg-white border-b border-border px-4 py-2 flex items-center justify-between">
        <Link to="/">
          <img
            src="/assets/ece6442c-dc5f-4017-8cab-7fb80ee8e28a.png"
            alt="Upsy"
            className="h-10 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{user?.name}</span>
          <Avatar className="h-7 w-7">
            <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
              {user?.name ? getInitials(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {tabItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 flex-1 transition-colors ${
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className={`text-[10px] leading-tight truncate max-w-[64px] ${active ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button or single overflow */}
          {hasOverflow && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <button
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 flex-1 transition-colors ${
                    overflowItems.some(i => isActive(i.path))
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-[10px] leading-tight">{t('navigation.more', 'More')}</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
                <div className="flex flex-col gap-1 pt-2">
                  {overflowItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSheetOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          isActive(item.path)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    );
                  })}

                  <Separator className="my-2" />

                  {/* Language toggle */}
                  <div className="flex items-center gap-3 px-4 py-2">
                    <Languages className="h-5 w-5 text-muted-foreground" />
                    <div className="flex gap-2">
                      <button
                        onClick={() => changeLanguage('es')}
                        className={`text-sm px-2 py-1 rounded ${getCurrentLanguage() === 'es' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                      >
                        {t('languages.spanish')}
                      </button>
                      <button
                        onClick={() => changeLanguage('en')}
                        className={`text-sm px-2 py-1 rounded ${getCurrentLanguage() === 'en' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                      >
                        {t('languages.english')}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="text-sm">{t('navigation.logout')}</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileBottomNav;

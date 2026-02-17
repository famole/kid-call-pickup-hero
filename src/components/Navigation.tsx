
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { getNavigationItems, getVisibleItems } from './navigation/navItems';
import DesktopNav from './navigation/DesktopNav';
import MobileBottomNav from './navigation/MobileBottomNav';

const Navigation: React.FC = () => {
  const { user, isInvitedUser } = useAuth();
  const { t } = useTranslation();

  const allItems = getNavigationItems(t);
  const visibleItems = getVisibleItems(allItems, user?.role, isInvitedUser);

  return (
    <>
      <DesktopNav visibleItems={visibleItems} />
      <MobileBottomNav visibleItems={visibleItems} />
    </>
  );
};

export default Navigation;


import {
  Home,
  Car,
  ClipboardList,
  Settings,
  LogOut,
  History,
  FileText,
  CalendarDays,
  MessagesSquare,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

export const getNavigationItems = (t: any): NavigationItem[] => [
  { path: '/', label: t('navigation.dashboard'), icon: Home, roles: ['parent', 'family', 'superadmin'] },
  { path: '/pickup-authorization', label: t('navigation.pickupAuthorizations'), icon: Car, roles: ['parent'] },
  { path: '/activities', label: t('navigation.activities'), icon: CalendarDays, roles: ['parent', 'teacher', 'admin', 'superadmin'] },
  { path: '/communications', label: t('navigation.communications', 'Communications'), icon: MessagesSquare, roles: ['parent', 'teacher', 'admin', 'superadmin'] },
  { path: '/self-checkout', label: t('navigation.selfCheckout'), icon: LogOut, roles: ['parent'] },
  { path: '/self-checkout-history', label: t('navigation.selfCheckoutHistory'), icon: History, roles: ['parent'] },
  { path: '/pickup-management', label: t('navigation.pickupManagement'), icon: ClipboardList, roles: ['admin', 'teacher', 'superadmin'] },
  { path: '/teacher-reports', label: t('navigation.reports'), icon: FileText, roles: ['teacher'] },
  { path: '/admin', label: t('navigation.adminPanel'), icon: Settings, roles: ['admin', 'superadmin'] },
];

export const getVisibleItems = (
  items: NavigationItem[],
  userRole: string | undefined,
  isInvitedUser: boolean
): NavigationItem[] => {
  if (isInvitedUser && !['admin', 'teacher', 'superadmin'].includes(userRole || '')) {
    return items.filter(item => item.path === '/');
  }
  return items.filter(item => userRole && item.roles.includes(userRole));
};

// Items to show in the mobile bottom tab bar (max 5 including "More")
export const getMobileTabItems = (items: NavigationItem[]): NavigationItem[] => {
  // Prioritize: Home, then up to 3 most relevant items
  const home = items.find(i => i.path === '/');
  const others = items.filter(i => i.path !== '/');
  const priority = others.slice(0, 3);
  return home ? [home, ...priority] : priority.slice(0, 4);
};

export const getMobileOverflowItems = (items: NavigationItem[]): NavigationItem[] => {
  const home = items.find(i => i.path === '/');
  const others = items.filter(i => i.path !== '/');
  return others.slice(3);
};

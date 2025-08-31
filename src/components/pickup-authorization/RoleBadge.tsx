import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, UserCheck } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface RoleBadgeProps {
  role?: 'parent' | 'teacher' | 'admin' | 'superadmin' | 'family' | 'other';
  size?: 'sm' | 'default';
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'default' }) => {
  const { t } = useTranslation();

  if (!role) return null;

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'parent':
        return {
          label: t('roles.parent'),
          variant: 'default' as const,
          icon: Users,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200'
        };
      case 'family':
        return {
          label: t('roles.family'),
          variant: 'secondary' as const,
          icon: Heart,
          className: 'bg-pink-100 text-pink-800 hover:bg-pink-100 border-pink-200'
        };
      case 'other':
        return {
          label: t('roles.other'),
          variant: 'outline' as const,
          icon: UserCheck,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300'
        };
      case 'teacher':
        return {
          label: t('roles.teacher'),
          variant: 'secondary' as const,
          icon: Users,
          className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200'
        };
      case 'admin':
      case 'superadmin':
        return {
          label: t('roles.admin'),
          variant: 'secondary' as const,
          icon: Users,
          className: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200'
        };
      default:
        return {
          label: role,
          variant: 'outline' as const,
          icon: Users,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300'
        };
    }
  };

  const config = getRoleConfig(role);
  const IconComponent = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${textSize} flex items-center gap-1 font-normal`}
    >
      <IconComponent className={iconSize} />
      {config.label}
    </Badge>
  );
};

export default RoleBadge;
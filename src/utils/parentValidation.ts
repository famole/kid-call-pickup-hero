import { ParentInput } from '@/types/parent';

export interface ValidationError {
  field: string;
  key: string;
  message?: string;
}

export const validateParentForm = (parent: ParentInput): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Name validation
  if (!parent.name || parent.name.trim().length === 0) {
    errors.push({ field: 'name', key: 'addParentSheet.errors.nameRequired' });
  } else if (parent.name.trim().length < 2) {
    errors.push({ field: 'name', key: 'addParentSheet.errors.nameTooShort' });
  } else if (parent.name.trim().length > 100) {
    errors.push({ field: 'name', key: 'addParentSheet.errors.nameTooLong' });
  }

  // Email OR Username validation - at least one is required
  const hasEmail = parent.email && parent.email.trim().length > 0;
  const hasUsername = parent.username && parent.username.trim().length > 0;
  
  if (!hasEmail && !hasUsername) {
    errors.push({ field: 'email', key: 'addParentSheet.errors.emailOrUsernameRequired' });
    errors.push({ field: 'username', key: 'addParentSheet.errors.emailOrUsernameRequired' });
  } else {
    // Email validation (if provided)
    if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parent.email!.trim())) {
        errors.push({ field: 'email', key: 'addParentSheet.errors.emailFormat' });
      }
    }

    // Username validation (if provided)
    if (hasUsername) {
      if (parent.username!.trim().length < 3) {
        errors.push({ field: 'username', key: 'addParentSheet.errors.usernameTooShort' });
      } else if (parent.username!.trim().length > 50) {
        errors.push({ field: 'username', key: 'addParentSheet.errors.usernameTooLong' });
      }
    }
  }

  // Phone validation (optional field)
  if (parent.phone && parent.phone.trim().length > 0) {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(parent.phone.trim())) {
      errors.push({ field: 'phone', key: 'addParentSheet.errors.phoneFormat' });
    }
  }

  // Role validation
  if (!parent.role) {
    errors.push({ field: 'role', key: 'addParentSheet.errors.roleRequired' });
  }

  return errors;
};

export const getErrorTypeFromMessage = (errorMessage: string): string => {
  if (errorMessage.includes('parents_email_unique') || errorMessage.includes('already exists')) {
    return 'addParentSheet.errors.duplicateEmail';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'addParentSheet.errors.networkError';
  }
  
  if (errorMessage.includes('server') || errorMessage.includes('internal')) {
    return 'addParentSheet.errors.serverError';
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
    return 'addParentSheet.errors.permissionDenied';
  }
  
  return 'addParentSheet.errors.unknownError';
};
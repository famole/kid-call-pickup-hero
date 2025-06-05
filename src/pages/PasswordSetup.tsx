
import React from 'react';
import { usePasswordSetupLogic } from '@/hooks/usePasswordSetupLogic';
import LoadingState from '@/components/password-setup/LoadingState';
import AuthRequiredState from '@/components/password-setup/AuthRequiredState';
import OAuthConfirmation from '@/components/password-setup/OAuthConfirmation';
import PasswordSetupForm from '@/components/password-setup/PasswordSetupForm';

const PasswordSetup = () => {
  const {
    parentData,
    isOAuthUser,
    isInitialized,
    authCheckComplete,
    loading,
    user
  } = usePasswordSetupLogic();

  console.log('PasswordSetup render state:', {
    isInitialized,
    authCheckComplete,
    loading,
    user: user?.email,
    isOAuthUser,
    parentData: parentData?.email,
    passwordSet: parentData?.password_set,
    isPreloaded: parentData?.is_preloaded
  });

  // Show loading state while initializing or while auth is loading
  if (!isInitialized || loading) {
    console.log('Showing loading state - isInitialized:', isInitialized, 'loading:', loading);
    return <LoadingState />;
  }

  // Only show authentication required if auth check is complete and no user
  if (authCheckComplete && !user) {
    console.log('Showing auth required state');
    return <AuthRequiredState />;
  }

  // OAuth user confirmation flow
  if (isOAuthUser && parentData) {
    console.log('Showing OAuth confirmation flow');
    return <OAuthConfirmation parentData={parentData} />;
  }

  // Regular password setup flow for email/password users
  console.log('Showing password setup form');
  return <PasswordSetupForm />;
};

export default PasswordSetup;

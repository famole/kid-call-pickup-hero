
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
    user,
    hasPreloadedAccount
  } = usePasswordSetupLogic();

  // Show loading state while initializing or while auth is loading
  if (!isInitialized || loading) {
    return <LoadingState />;
  }

  // Only show authentication required if:
  // - Auth check is complete 
  // - No authenticated user
  // - No parent data (preloaded account)
  // - Not a preloaded account scenario
  if (authCheckComplete && !user && !parentData && !hasPreloadedAccount) {
    return <AuthRequiredState />;
  }

  // OAuth user confirmation flow
  if (isOAuthUser && parentData) {
    return <OAuthConfirmation parentData={parentData} />;
  }

  // Regular password setup flow for email/password users or preloaded accounts
  return <PasswordSetupForm />;
};

export default PasswordSetup;

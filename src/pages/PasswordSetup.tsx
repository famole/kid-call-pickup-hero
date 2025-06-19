
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

  console.log('PasswordSetup render:', {
    isInitialized,
    authCheckComplete,
    loading,
    user: user?.email,
    hasPreloadedAccount,
    parentData: parentData?.email,
    isOAuthUser
  });

  // Show loading state while initializing or while auth is loading
  if (!isInitialized || loading) {
    return <LoadingState />;
  }

  // OAuth user confirmation flow
  if (isOAuthUser && parentData) {
    return <OAuthConfirmation parentData={parentData} />;
  }

  // Regular password setup flow for:
  // 1. Authenticated email/password users who haven't set password
  // 2. Preloaded accounts (even without authentication)
  if (user || hasPreloadedAccount) {
    return <PasswordSetupForm />;
  }

  // Only show authentication required if:
  // - Auth check is complete 
  // - No authenticated user
  // - No preloaded account scenario
  if (authCheckComplete && !user && !hasPreloadedAccount) {
    return <AuthRequiredState />;
  }

  // Fallback loading state
  return <LoadingState />;
};

export default PasswordSetup;

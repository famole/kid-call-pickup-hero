import React, { Suspense, lazy } from 'react';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';

// Lazy load components for better performance
const Index = lazy(() => import('@/pages/Index'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const PasswordSetup = lazy(() => import('@/pages/PasswordSetup'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const AdminStudentsScreen = lazy(() => import('@/pages/AdminStudentsScreen'));
const AdminParentsScreen = lazy(() => import('@/pages/AdminParentsScreen'));
const AdminClassesScreen = lazy(() => import('@/pages/AdminClassesScreen'));
const ParentManagement = lazy(() => import('@/pages/ParentManagement'));
const PickupManagement = lazy(() => import('@/pages/PickupManagement'));
const ViewerDisplay = lazy(() => import('@/pages/ViewerDisplay'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const StressTestPage = lazy(() => import('@/pages/StressTestPage'));
const AdminInitialSetup = lazy(() => import('@/pages/AdminInitialSetup'));
const PickupAuthorizationPage = lazy(() => import('@/pages/PickupAuthorizationPage'));
const SelfCheckoutPage = lazy(() => import('@/pages/SelfCheckoutPage'));
const SelfCheckoutHistoryPage = lazy(() => import('@/pages/SelfCheckoutHistoryPage'));
const UnauthorizedAccess = lazy(() => import('@/pages/UnauthorizedAccess'));
const AcceptInvitation = lazy(() => import('@/pages/AcceptInvitation'));
const InvitationSignup = lazy(() => import('@/pages/InvitationSignup'));
const TeacherReportsPage = lazy(() => import('@/pages/TeacherReportsPage'));
import './App.css';

// Import i18n configuration
import '@/i18n';
import UpsyDefaultScreen from './components/UpsyDefaultScreen';

// Optimized React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center w-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/password-setup" element={<PasswordSetup />} />
              <Route path="/unauthorized-access" element={<UnauthorizedAccess />} />
              <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
              <Route path="/invitation-signup/:token" element={<InvitationSignup />} />
              <Route 
                path="/admin-setup" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminInitialSetup />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/pickup-authorization" 
                element={
                  <ProtectedRoute>
                    <PickupAuthorizationPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/self-checkout" 
                element={
                  <ProtectedRoute>
                    <SelfCheckoutPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/self-checkout-history" 
                element={
                  <ProtectedRoute>
                    <SelfCheckoutHistoryPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/pickup-management" 
                element={
                  <ProtectedRoute>
                    <PickupManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/teacher-reports" 
                element={
                  <ProtectedRoute>
                    <TeacherReportsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminPanel />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/students" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminStudentsScreen />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/parents" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminParentsScreen />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/classes" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminClassesScreen />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/parent-management" 
                element={
                  <ProtectedRoute>
                    <ParentManagement />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

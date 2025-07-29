import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import PasswordSetup from '@/pages/PasswordSetup';
import AdminPanel from '@/pages/AdminPanel';
import AdminStudentsScreen from '@/pages/AdminStudentsScreen';
import AdminParentsScreen from '@/pages/AdminParentsScreen';
import AdminClassesScreen from '@/pages/AdminClassesScreen';
import ParentManagement from '@/pages/ParentManagement';
import PickupManagement from '@/pages/PickupManagement';
import ViewerDisplay from '@/pages/ViewerDisplay';
import NotFound from '@/pages/NotFound';
import StressTestPage from '@/pages/StressTestPage';
import AdminInitialSetup from '@/pages/AdminInitialSetup';
import PickupAuthorizationPage from '@/pages/PickupAuthorizationPage';
import SelfCheckoutPage from '@/pages/SelfCheckoutPage';
import SelfCheckoutHistoryPage from '@/pages/SelfCheckoutHistoryPage';
import UnauthorizedAccess from '@/pages/UnauthorizedAccess';
import './App.css';

// Import i18n configuration
import '@/i18n';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/password-setup" element={<PasswordSetup />} />
              <Route path="/unauthorized-access" element={<UnauthorizedAccess />} />
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
              <Route 
                path="/viewer" 
                element={
                  <ProtectedRoute>
                    <ViewerDisplay />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/stress-test" 
                element={
                  <ProtectedRoute>
                    <StressTestPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

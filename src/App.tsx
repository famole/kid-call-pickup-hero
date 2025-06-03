
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/auth/AuthProvider';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Index from './pages/Index';
import AdminPanel from './pages/AdminPanel';
import ViewerDisplay from './pages/ViewerDisplay';
import PickupManagement from './pages/PickupManagement';
import PickupAuthorizationPage from './pages/PickupAuthorizationPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AdminInitialSetup from './pages/AdminInitialSetup';
import ParentManagement from './pages/ParentManagement';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navigation />
          <main className="flex-1">
            <AppRoutes />
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/setup"
        element={
          <ProtectedRoute>
            <AdminInitialSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/parents"
        element={
          <ProtectedRoute requireAdmin={true}>
            <ParentManagement />
          </ProtectedRoute>
        }
      />
      
      {/* Pickup management for admins and teachers */}
      <Route
        path="/pickup-management"
        element={
          <ProtectedRoute>
            <PickupManagement />
          </ProtectedRoute>
        }
      />
      
      {/* Pickup authorizations for parents */}
      <Route
        path="/pickup-authorizations"
        element={
          <ProtectedRoute>
            <PickupAuthorizationPage />
          </ProtectedRoute>
        }
      />
      
      {/* Public viewer display */}
      <Route path="/viewer" element={<ViewerDisplay />} />
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

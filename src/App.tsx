
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Index from './pages/Index';
import AdminPanel from './pages/AdminPanel';
import ViewerDisplay from './pages/ViewerDisplay';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AdminInitialSetup from './pages/AdminInitialSetup';
import ParentManagement from './pages/ParentManagement';

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
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
      
      {/* Viewer display */}
      <Route path="/viewer" element={<ViewerDisplay />} />
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

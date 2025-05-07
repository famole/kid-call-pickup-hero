import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Index from './pages/Index';
import AdminPanel from './pages/AdminPanel';
import ViewerDisplay from './pages/ViewerDisplay';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
// Add the new import
import AdminInitialSetup from './pages/AdminInitialSetup';

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
      
      {/* Viewer display */}
      <Route path="/viewer" element={<ViewerDisplay />} />
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

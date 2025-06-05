
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import PasswordSetup from '@/pages/PasswordSetup';
import Index from '@/pages/Index';
import AdminPanel from '@/pages/AdminPanel';
import AdminStudentsScreen from '@/pages/AdminStudentsScreen';
import AdminParentsScreen from '@/pages/AdminParentsScreen';
import AdminClassesScreen from '@/pages/AdminClassesScreen';
import PickupManagement from '@/pages/PickupManagement';
import ParentManagement from '@/pages/ParentManagement';
import ViewerDisplay from '@/pages/ViewerDisplay';
import PickupAuthorizationPage from '@/pages/PickupAuthorizationPage';
import AdminInitialSetup from '@/pages/AdminInitialSetup';
import NotFound from '@/pages/NotFound';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/password-setup" element={<PasswordSetup />} />
            <Route path="/viewer" element={<ViewerDisplay />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="/admin/students" element={
              <ProtectedRoute>
                <AdminStudentsScreen />
              </ProtectedRoute>
            } />
            <Route path="/admin/parents" element={
              <ProtectedRoute>
                <AdminParentsScreen />
              </ProtectedRoute>
            } />
            <Route path="/admin/classes" element={
              <ProtectedRoute>
                <AdminClassesScreen />
              </ProtectedRoute>
            } />
            <Route path="/pickup-management" element={
              <ProtectedRoute>
                <PickupManagement />
              </ProtectedRoute>
            } />
            <Route path="/parent-management" element={
              <ProtectedRoute>
                <ParentManagement />
              </ProtectedRoute>
            } />
            <Route path="/pickup-authorization" element={
              <ProtectedRoute>
                <PickupAuthorizationPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/setup" element={
              <ProtectedRoute>
                <AdminInitialSetup />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;

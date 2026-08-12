import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Photobooth from './pages/Photobooth';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-red-500 selection:text-white">
        <Routes>
          {/* Public Mobile Photobooth Route */}
          <Route path="/booth" element={<Photobooth />} />

          {/* Admin Login Route */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Dashboard Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

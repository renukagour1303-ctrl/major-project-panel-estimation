import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CompanyProvider } from './context/CompanyContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CustomerAuthProvider } from './context/CustomerAuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import PublicCalculatorPage from './pages/PublicCalculatorPage.jsx';
import CustomerLoginPage from './pages/CustomerLoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ReviewsPage from './pages/ReviewsPage.jsx';

import LoginPage from './pages/portal/LoginPage.jsx';
import RegisterAdminPage from './pages/portal/RegisterAdminPage.jsx';
import AdminDashboard from './pages/portal/AdminDashboard.jsx';
import StaffDashboard from './pages/portal/StaffDashboard.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <CompanyProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <Routes>
              {/* Public Solar Calculator Application & Feasibility Wizard */}
              <Route path="/" element={<PublicCalculatorPage />} />

              {/* Public Customer Authentication & Account Routes */}
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<CustomerLoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />

              {/* Staff & Enterprise Admin Management Portal (Kept completely separate at /admin) */}
              <Route path="/admin" element={<LoginPage />} />
              <Route path="/admin/login" element={<LoginPage />} />

              {/* First-Time Admin Registration & Setup */}
              <Route path="/register-admin" element={<RegisterAdminPage />} />
              <Route path="/admin/setup" element={<RegisterAdminPage />} />

              {/* Admin Management Dashboard */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Staff & Consultant Lead Desk Dashboard */}
              <Route
                path="/staff/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CustomerAuthProvider>
        </AuthProvider>
      </CompanyProvider>
    </BrowserRouter>
  );
}

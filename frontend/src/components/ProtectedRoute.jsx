import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="portal-loading-screen">
        <div className="portal-spinner"></div>
        <p>Verifying secure authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isPortalRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff');
    return <Navigate to={isPortalRoute ? "/admin" : "/login"} state={{ from: location }} replace />;
  }

  const userRole = (user?.role || '').toUpperCase();
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole)) {
    // If staff tries to access admin, redirect to staff dashboard
    if (userRole === 'STAFF') {
      return <Navigate to="/staff/dashboard" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return children;
}

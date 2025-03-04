// src/components/common/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [] 
}) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  // Show nothing while auth is loading
  if (loading) {
    return null;
  }
  
  // Not logged in - redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check if user has required role
  if (allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    // User doesn't have required role - redirect to home
    return <Navigate to="/" replace />;
  }
  
  // User is logged in and has correct role - render children
  return <>{children}</>;
};

export default ProtectedRoute;
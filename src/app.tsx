// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useMediaQuery, useTheme } from '@mui/material';

import Header from './components/layout/Header';
import LiveMatchBanner from './components/layout/LiveMatchBanner';
import { Box } from '@mui/material';
import { routes } from './routes';

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode, 
  allowedRoles?: string[] 
}> = ({ children, allowedRoles = [] }) => {
  const { user, userRole, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Special case for admin routes
  if (allowedRoles.includes('admin') && isAdmin) {
    return <>{children}</>;
  }
  
  // For other roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole || '')) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  console.log("AppContent: Current location:", location.pathname);
  
  // Add useEffect to log route changes
  useEffect(() => {
    console.log("Route changed to:", location.pathname);
  }, [location]);
  
  const matchId = location.pathname.match(/\/team\/match\/([^\/]+)/)?.[1];
  
  // Check if we're on a match scoring page (where the banner is hidden)
  const isOnScoringPage = location.pathname.includes('/team/match/') && location.pathname.includes('/score');

  return (
    <>
      <Header />
      {!isOnScoringPage && <LiveMatchBanner currentMatchId={matchId} />}
      <Box sx={{ 
        paddingTop: { 
          // Responsive padding for mobile and desktop
          xs: isOnScoringPage ? '56px' : '112px',  // Mobile: smaller padding
          sm: isOnScoringPage ? '64px' : '120px',  // Tablet: medium padding
          md: isOnScoringPage ? '64px' : '128px'   // Desktop: full padding
        },
        paddingBottom: {
          xs: '80px', // Space for mobile bottom navigation
          sm: '20px',
          md: '20px'
        },
        minHeight: '100vh',
        position: 'relative',
        zIndex: 0,  // Ensure content is behind the fixed Header
        overflowX: 'hidden' // Prevent horizontal scrolling on mobile
      }}>
        <Routes key={location.key}>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                route.requiresAuth ? (
                  <ProtectedRoute allowedRoles={route.allowedRoles}>
                    {route.element}
                  </ProtectedRoute>
                ) : (
                  route.element
                )
              }
            />
          ))}
        </Routes>
      </Box>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
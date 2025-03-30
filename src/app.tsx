// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
  const matchId = location.pathname.match(/\/team\/match\/([^\/]+)/)?.[1];
  
  // Check if we're on a match scoring page (where the banner is hidden)
  const isOnScoringPage = location.pathname.includes('/team/match/') && !location.pathname.endsWith('/lineup');

  return (
    <>
      <Header />
      <LiveMatchBanner currentMatchId={matchId} />
      <Box sx={{ 
        paddingTop: { 
          // Less padding when on scoring page (just for navbar)
          xs: isOnScoringPage ? '64px' : '128px',  // 64px for navbar only on scoring page
          sm: isOnScoringPage ? '64px' : '128px'   // 128px for navbar + banner on other pages
        } 
      }}>
        <Routes>
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
      <AppContent />
    </AuthProvider>
  );
};

export default App;
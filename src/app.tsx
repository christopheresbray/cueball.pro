// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/public/Home';
import Standings from './pages/public/Standings';
import Fixtures from './pages/public/Fixtures'; 
import PlayerStats from './pages/public/PlayerStats';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import TeamDashboard from './pages/team/Dashboard';
import TeamRoster from './pages/team/TeamRoster';
import TeamMatches from './pages/team/TeamMatches';
import MatchScorecard from './pages/team/MatchScorecard';
import AdminDashboard from './pages/admin/Dashboard';
import ScheduleMatches from './pages/admin/ScheduleMatches';
import ManageVenues from './pages/admin/ManageVenues';
import ManageTeams from './pages/admin/ManageTeams';
import { Box } from '@mui/material';

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
  const { user, isAdmin, userRole, logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logout();
      // Force page refresh to ensure state is cleared
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <>
      {/* Direct navigation bar that doesn't rely on imported components */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        background: '#2196f3', 
        padding: '10px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <Box sx={{ display: 'flex', gap: '10px' }}>
          <Link to="/" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '5px 15px', 
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px'
          }}>
            Home
          </Link>
          
          {user && (
            <Link to="/team" style={{ 
              color: 'white', 
              textDecoration: 'none', 
              padding: '5px 15px', 
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px'
            }}>
              Team
            </Link>
          )}
          
          {isAdmin && (
            <Link to="/admin" style={{ 
              color: 'white', 
              textDecoration: 'none', 
              padding: '5px 15px', 
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px'
            }}>
              Admin
            </Link>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!user ? (
            <Link to="/login" style={{ 
              color: 'white', 
              textDecoration: 'none', 
              padding: '5px 15px', 
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>
              Login
            </Link>
          ) : (
            <>
              <span style={{ 
                color: 'white', 
                padding: '5px 15px', 
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                marginLeft: 'auto'
              }}>
                {isAdmin ? 'Admin' : userRole === 'captain' ? 'Captain' : user.displayName || user.email}
              </span>
              
              <button 
                onClick={handleLogout} 
                style={{ 
                  color: 'white',
                  backgroundColor: 'rgba(255,0,0,0.2)',
                  border: 'none',
                  padding: '5px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Logout
              </button>
            </>
          )}
        </Box>
      </div>

      {/* Add spacing to prevent content from being hidden under the navigation */}
      <div style={{ paddingTop: '50px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/players" element={<PlayerStats />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Team Routes */}
          <Route 
            path="/team" 
            element={
              <ProtectedRoute>
                <TeamDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/team/roster" 
            element={
              <ProtectedRoute>
                <TeamRoster />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/team/matches" 
            element={
              <ProtectedRoute>
                <TeamMatches />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/team/match/:matchId" 
            element={
              <ProtectedRoute>
                <MatchScorecard />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/schedule-matches" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ScheduleMatches />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/venues" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManageVenues />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/teams" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManageTeams />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
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